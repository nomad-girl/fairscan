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
    const { audio, format } = req.body;

    if (!audio) {
      return res.status(400).json({ error: 'Audio is required' });
    }

    // Determine media type
    const mediaType = format === 'wav' ? 'audio/wav' : 
                     format === 'm4a' ? 'audio/mp4' :
                     format === 'mp3' ? 'audio/mpeg' :
                     'audio/webm';

    // Call Claude API with audio
    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'audio',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: audio,
              },
            },
            {
              type: 'text',
              text: `Transcribe este audio y extrae información en formato JSON:
{
  "transcript": "transcripción completa del audio",
  "extracted_data": {
    "price": "precio si se menciona o null",
    "moq": "cantidad mínima si se menciona o null",
    "contact": "información de contacto si se menciona o null",
    "notes": "notas adicionales o null"
  }
}

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
    console.error('Error processing audio:', error);
    return res.status(500).json({
      error: 'Error processing audio',
      details: error.message,
    });
  }
}
