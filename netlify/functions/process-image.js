const Anthropic = require("@anthropic-ai/sdk");

exports.handler = async (event) => {
  // Add CORS headers
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }) };
  }

  try {
    const { image, categories, materials } = JSON.parse(event.body);

    if (!image) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Image is required" }) };
    }

    // Remove data URL prefix if present
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const categoryList = categories && categories.length > 0
      ? `SOLO una de estas categorías: ${categories.join(", ")}`
      : "categoría estimada (ej: Vajilla, Electrónica, Textil, Decoración, etc.)";
    const materialList = materials && materials.length > 0
      ? `SOLO de esta lista: ${materials.join(", ")}. Si ninguna aplica, usa la más cercana.`
      : "materiales detectados";

    const response = await client.messages.create({
      model: process.env.CLAUDE_MODEL || "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/jpeg",
                data: base64Data,
              },
            },
            {
              type: "text",
              text: `Analiza esta imagen de un producto de feria comercial y extrae la siguiente información en formato JSON:
{
  "name": "nombre del producto en español",
  "description": "descripción breve del producto (1-2 oraciones)",
  "features": ["característica 1", "característica 2"],
  "materials": [${materialList}],
  "colors": ["color 1", "color 2"],
  "category": "${categoryList}",
  "confidence": 0.95
}

Responde SOLO con el JSON, sin explicaciones adicionales.`,
            },
          ],
        },
      ],
    });

    const content = response.content[0];
    let result;
    try {
      result = JSON.parse(content.text);
    } catch (e) {
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Could not parse AI response");
      }
    }

    return { statusCode: 200, headers, body: JSON.stringify(result) };
  } catch (error) {
    console.error("Error processing image:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Error processing image", details: error.message }),
    };
  }
};
