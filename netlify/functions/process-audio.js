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

    // For audio, we send it as text since Claude 3.5 Sonnet doesn't support audio input directly
    // We'll just process any text notes instead
    const response = await client.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `Se recibió una nota de audio en una feria comercial. El formato es ${format || "webm"}.
Como no puedo transcribir el audio directamente, responde con este JSON indicando que se necesita transcripción manual:
{
  "transcript": null,
  "extracted_data": {
    "price": null,
    "moq": null,
    "contact": null,
    "notes": "Audio pendiente de transcripción manual"
  }
}

Responde SOLO con el JSON.`,
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
        result = { transcript: null, extracted_data: { price: null, moq: null, contact: null, notes: "Audio pendiente de transcripción" } };
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
