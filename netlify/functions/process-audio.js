const Anthropic = require("@anthropic-ai/sdk");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }) };
  }

  try {
    const { audio, format } = JSON.parse(event.body);

    if (!audio) {
      return { statusCode: 400, body: JSON.stringify({ error: "Audio is required" }) };
    }

    const mediaType = format === "wav" ? "audio/wav" :
                     format === "m4a" ? "audio/mp4" :
                     format === "mp3" ? "audio/mpeg" :
                     "audio/webm";

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `El siguiente audio es una nota de voz grabada en una feria comercial. Transcribe el audio y extrae información relevante en formato JSON:
{
  "transcript": "transcripción completa del audio",
  "extracted_data": {
    "price": "precio si se menciona o null",
    "moq": "cantidad mínima si se menciona o null",
    "contact": "información de contacto si se menciona o null",
    "notes": "notas adicionales relevantes o null"
  }
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
    console.error("Error processing audio:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Error processing audio", details: error.message }),
    };
  }
};
