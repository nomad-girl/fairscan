const Anthropic = require("@anthropic-ai/sdk");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }) };
  }

  try {
    const { image } = JSON.parse(event.body);

    if (!image) {
      return { statusCode: 400, body: JSON.stringify({ error: "Image is required" }) };
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
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
                data: image.replace(/^data:image\/\w+;base64,/, ""),
              },
            },
            {
              type: "text",
              text: `Analiza esta imagen de un producto de feria comercial y extrae la siguiente información en formato JSON:
{
  "name": "nombre del producto en español",
  "description": "descripción breve del producto (1-2 oraciones)",
  "features": ["característica 1", "característica 2"],
  "materials": ["material 1", "material 2"],
  "colors": ["color 1", "color 2"],
  "category": "categoría estimada (ej: Vajilla, Electrónica, Textil, Decoración, etc.)",
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

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error("Error processing image:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Error processing image", details: error.message }),
    };
  }
};
