/**
 * Batch sync endpoint for processing pending AI items
 * Processes images, audio, and QR codes in bulk
 *
 * POST /api/sync
 * Body: {
 *   items: [
 *     {
 *       id: string,
 *       type: "product" | "supplier",
 *       data: { ... },
 *       pending_processing: {
 *         image?: { base64_image, context? },
 *         audio?: { audio_base64, format? },
 *         qr?: { qr_text }
 *       }
 *     }
 *   ]
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
    const bodyError = validateBody(req.body, ['items']);
    if (bodyError) {
      return error(bodyError, 400);
    }

    const { items } = req.body;

    // Validate items
    if (!Array.isArray(items)) {
      return error('items must be an array', 400);
    }

    if (items.length === 0) {
      return success({
        processed: [],
        errors: [],
        summary: {
          total_items: 0,
          processed: 0,
          failed: 0,
        },
      });
    }

    // Initialize Anthropic client
    const client = new Anthropic({ apiKey });

    // Process each item
    const processed = [];
    const errors = [];

    for (const item of items) {
      try {
        if (!item.id || !item.type || !item.data) {
          errors.push({
            item_id: item.id || 'unknown',
            error: 'Item missing required fields: id, type, data',
          });
          continue;
        }

        const enrichedItem = JSON.parse(JSON.stringify(item)); // Deep copy
        let hasChanges = false;

        // Process image if pending
        if (item.pending_processing?.image) {
          try {
            const imageResult = await processImage(
              client,
              item.pending_processing.image
            );
            enrichedItem.ai_processed_image = imageResult;
            hasChanges = true;
          } catch (err) {
            errors.push({
              item_id: item.id,
              step: 'image_processing',
              error: err.message,
            });
          }
        }

        // Process audio if pending
        if (item.pending_processing?.audio) {
          try {
            const audioResult = await processAudio(
              client,
              item.pending_processing.audio
            );
            enrichedItem.ai_processed_audio = audioResult;
            hasChanges = true;
          } catch (err) {
            errors.push({
              item_id: item.id,
              step: 'audio_processing',
              error: err.message,
            });
          }
        }

        // Process QR if pending
        if (item.pending_processing?.qr) {
          try {
            const qrResult = await processQR(client, item.pending_processing.qr);
            enrichedItem.ai_processed_qr = qrResult;
            hasChanges = true;
          } catch (err) {
            errors.push({
              item_id: item.id,
              step: 'qr_processing',
              error: err.message,
            });
          }
        }

        // Mark as processed
        if (hasChanges) {
          enrichedItem.ai_last_synced = new Date().toISOString();
          enrichedItem.pending_processing = null; // Clear pending flags
          processed.push(enrichedItem);
        } else {
          processed.push(item); // No processing needed
        }
      } catch (err) {
        errors.push({
          item_id: item.id,
          error: err.message,
        });
      }
    }

    // Return success with results
    return success({
      processed,
      errors,
      summary: {
        total_items: items.length,
        processed: processed.length,
        failed: errors.length,
      },
      synced_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Error in sync:', err);
    return error(err.message, 500);
  }
}

/**
 * Process image using Claude Vision
 */
async function processImage(client, imageData) {
  const { base64_image, context } = imageData;

  const response = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    system: `You are a product analyzer. Extract: name, description, features, materials, colors, estimated_category.
Return valid JSON only.`,
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
            text: context || 'Analyze this product image',
          },
        ],
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  const jsonMatch = content.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Could not parse Claude response');
  }

  return JSON.parse(jsonMatch[0]);
}

/**
 * Process audio using Claude
 */
async function processAudio(client, audioData) {
  const { audio_base64, format = 'wav' } = audioData;

  const mimeType = {
    wav: 'audio/wav',
    m4a: 'audio/mp4',
    mp3: 'audio/mpeg',
  }[format] || 'audio/wav';

  const audioBuffer = Buffer.from(
    audio_base64.replace(/^data:audio\/[^;]+;base64,/, ''),
    'base64'
  );

  const response = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    system: `Transcribe the audio and extract: transcript, price, moq, notes, contact. Return valid JSON only.`,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: mimeType,
              data: audioBuffer.toString('base64'),
            },
          },
          {
            type: 'text',
            text: 'Transcribe and extract key information',
          },
        ],
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  const jsonMatch = content.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Could not parse Claude response');
  }

  return JSON.parse(jsonMatch[0]);
}

/**
 * Process QR using regex + Claude enrichment
 */
async function processQR(client, qrData) {
  const { qr_text } = qrData;

  // Parse with regex
  const parsed = {
    wechat_id: qr_text.match(/(?:weixin|wechat)[:/\s=]+([a-zA-Z0-9_-]+)/i)?.[1],
    phone: qr_text.match(/(?:\+?86[-.\s]?)1[3-9]\d{9}/)?.[0],
    email: qr_text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)?.[0],
    website: qr_text.match(/https?:\/\/[^\s]+|www\.[^\s]+/)?.[0],
  };

  // Enrich with Claude
  const response = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 512,
    messages: [
      {
        role: 'user',
        content: `Extract company_name, supplier_type, location from: ${qr_text}. Return valid JSON only.`,
      },
    ],
  });

  const content = response.content[0];
  const enrichment =
    content.type === 'text' ? parseJSON(content.text) : {};

  return { ...parsed, ...enrichment };
}

/**
 * Helper to parse JSON safely
 */
function parseJSON(text) {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : {};
  } catch (e) {
    return {};
  }
}
