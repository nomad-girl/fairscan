const Anthropic = require("@anthropic-ai/sdk");

exports.handler = async (event) => {
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
    const { audio, format } = JSON.parse(event.body);

    if (!audio) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Audio is required" }) };
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // Map format to supported media type
    const formatMap = {
      "webm": "audio/webm",
      "mp4": "audio/mp4",
      "ogg": "audio/ogg",
      "wav": "audio/wav",
      "mpeg": "audio/mpeg",
      "mp3": "audio/mpeg",
    };
    const mediaType = formatMap[format] || "audio/webm";

    const response = await client.messages.create({
      model: process.env.CLAUDE_MODEL || "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "audio",
              source: {
                type: "base64",
                media_type: mediaType,
                data: audio,
              },
            },
            {
              type: "text",
              text: `Transcribe este audio de una feria comercial. Es una nota de voz del usuario sobre un producto o proveedor.

Responde en formato JSON:
{
  "transcript": "transcripción completa del audio en el idioma original",
  "extracted_data": {
    "price": null o número (precio mencionado en USD),
    "moq": null o string (cantidad mínima mencionada),
    "contact": null o string (datos de contacto mencionados),
    "notes": "resumen breve de lo más importante"
  }
}

Responde SOLO con el JSON.`,
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
        // If we can't parse JSON, use the raw text as transcript
        result = { transcript: content.text, extracted_data: { price: null, moq: null, contact: null, notes: null } };
      }
    }

    return { statusCode: 200, headers, body: JSON.stringify(result) };
  } catch (error) {
    console.error("Error processing audio:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Error processing audio", details: error.message }),
    };
  }
};
