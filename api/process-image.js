import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify API key is configured
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
  }

  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'Image is required' });
    }

    // Call Claude Vision API
    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: image,
              },
            },
            {
              type: 'text',
              text: `Analiza esta imagen de un producto y extrae la siguiente información en formato JSON:
{
  "name": "nombre del producto",
  "description": "descripción detallada",
  "features": ["característica 1", "característica 2"],
  "materials": ["material 1", "material 2"],
  "colors": ["color 1", "color 2"],
  "category": "categoría estimada",
  "price": null,
  "priceUnit": null,
  "confidence": 0.95
}

Si hay un cartel, etiqueta, sticker o display con precio visible en la imagen, extrae el número en "price" (ej: "3.50") y la unidad en "priceUnit" (ej: "per piece", "per dozen", "per set"). Si no hay precio visible, deja ambos en null.

Responde SOLO con el JSON, sin explicaciones adicionales.`,
            },
          ],
        },
      ],
    });

    // Extract JSON from response
    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    // Parse the JSON response
    let result;
    try {
      result = JSON.parse(content.text);
    } catch (e) {
      // Try to extract JSON if there's extra text
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw e;
      }
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error processing image:', error);
    return res.status(500).json({
      error: 'Error processing image',
      details: error.message,
    });
  }
}
