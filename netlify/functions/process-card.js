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
    const { image } = JSON.parse(event.body);

    if (!image) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Image is required" }) };
    }

    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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
              text: `Analiza esta imagen de un proveedor o contacto en una feria comercial (como Canton Fair).
Puede ser una tarjeta de visita, un código QR de WeChat/WhatsApp, un catálogo, un banner, un sticker, una pantalla con datos de contacto, o CUALQUIER imagen que contenga información de contacto o empresa.

Extrae TODA la información visible en formato JSON:
{
  "company": "nombre de la empresa",
  "contactName": "nombre de la persona de contacto",
  "contactTitle": "cargo/título del contacto",
  "phone": "número de teléfono (incluir código de país si visible)",
  "mobile": "número de celular si es diferente al teléfono",
  "email": "dirección de email",
  "website": "sitio web",
  "wechat": "ID de WeChat si está visible en texto, labels cerca del QR, en la tarjeta, etc.",
  "whatsapp": "número de WhatsApp si está visible",
  "address": "dirección completa",
  "city": "ciudad",
  "country": "país",
  "products": "productos o servicios que ofrece si se mencionan",
  "boothNumber": "número de stand/booth si está visible",
  "qrDetected": true o false (si ves un código QR en la imagen),
  "qrType": "wechat, whatsapp, website, vcard, o unknown - identificar el tipo de QR por contexto visual: logo verde de WeChat = wechat, logo de WhatsApp = whatsapp, etc. MUY IMPORTANTE: buscar el icono/logo de WeChat (verde con burbujas de chat) cerca del QR",
  "qrUrl": "si podés leer alguna URL escrita debajo/arriba del QR o en texto cercano, incluirla acá",
  "otherInfo": "cualquier otra información relevante visible"
}

IMPORTANTE sobre QR codes:
- Si ves un QR code con el logo verde de WeChat (微信) en el centro o cerca, qrType DEBE ser "wechat"
- Si ves texto como "Scan to add WeChat" / "扫一扫" / "微信" cerca del QR, qrType DEBE ser "wechat"
- Si ves un QR con el logo de WhatsApp (teléfono verde), qrType DEBE ser "whatsapp"
- Buscar WeChat IDs escritos cerca del QR (ej: "WeChat: abc123" o "微信号: abc123")

Responde SOLO con el JSON, sin explicaciones adicionales. Si un campo no está visible, usa null.`,
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
    console.error("Error processing card:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Error processing card", details: error.message }),
    };
  }
};
