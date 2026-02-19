/**
 * Process product images using Claude Vision API
 * Extracts: name, description, features, materials, colors, category
 *
 * POST /api/process-image
 * Body: {
 *   base64_image: string (base64 encoded image),
 *   context?: string (optional context about the product/supplier)
 * }
 */

import Anthropic from '@anthropic-ai/sdk';
import { requireApiKey, success, error, validateBody } from './middleware.js';

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Validate API key
    const apiKey = requireApiKey(req);

    // Validate body
    const bodyError = validateBody(req.body, ['base64_image']);
    if (bodyError) {
      return error(bodyError, 400);
    }

    const { base64_image, context } = req.body;

    // Validate base64 image
    if (!base64_image || typeof base64_image !== 'string') {
      return error('base64_image must be a non-empty string', 400);
    }

    // Initialize Anthropic client
    const client = new Anthropic({ apiKey });

    // Build the prompt
    const systemPrompt = `You are an expert product analyzer. Analyze the provided product image and extract detailed information.
Return ONLY a JSON object with this exact structure:
{
  "name": "string - product name/title",
  "description": "string - brief product description",
  "features": ["string - feature 1", "string - feature 2", ...],
  "materials": ["string - material 1", "string - material 2", ...],
  "colors": ["string - color 1", "string - color 2", ...],
  "estimated_category": "string - product category",
  "estimated_price_range": "string - estimated price range if visible",
  "confidence": 0.95,
  "warnings": ["string - if any"]
}
If information is not visible in the image, omit that field.`;

    const userMessage = context
      ? `Analyze this product image. Additional context: ${context}`
      : 'Analyze this product image and extract all relevant information.';

    // Call Claude Vision API
    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: base64_image.replace(/^data:image\/[^;]+;base64,/, ''),
              },
            },
            {
              type: 'text',
              text: userMessage,
            },
          ],
        },
      ],
    });

    // Extract the response content
    const content = response.content[0];
    if (content.type !== 'text') {
      return error('Unexpected response type from Claude', 500);
    }

    // Parse the JSON response
    let extractedData;
    try {
      // Extract JSON from the response (it might have markdown code blocks)
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return error('Could not parse Claude response', 500);
      }
      extractedData = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('Failed to parse Claude response:', content.text);
      return error('Failed to parse Claude response', 500);
    }

    // Return success
    return success({
      extracted: extractedData,
      processed_at: new Date().toISOString(),
      image_processed: true,
    });
  } catch (err) {
    console.error('Error in process-image:', err);
    return error(err.message, 500);
  }
}
