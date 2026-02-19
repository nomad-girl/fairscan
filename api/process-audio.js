/**
 * Process audio using Claude API
 * Transcribes audio and extracts: price, MOQ, notes, contact info
 *
 * POST /api/process-audio
 * Body: {
 *   audio_base64: string (base64 encoded audio),
 *   format: "wav" | "m4a" | "mp3" (optional, defaults to "wav"),
 *   context?: string (optional context about the supplier/product)
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
    const bodyError = validateBody(req.body, ['audio_base64']);
    if (bodyError) {
      return error(bodyError, 400);
    }

    const { audio_base64, format = 'wav', context } = req.body;

    // Validate audio
    if (!audio_base64 || typeof audio_base64 !== 'string') {
      return error('audio_base64 must be a non-empty string', 400);
    }

    // Initialize Anthropic client
    const client = new Anthropic({ apiKey });

    // Build the prompt for extraction
    const systemPrompt = `You are an expert at transcribing and analyzing sales conversations.
Transcribe the audio and extract key information.
Return a JSON object with this structure:
{
  "transcript": "string - full transcription of the audio",
  "extracted_data": {
    "price": "string or number - if mentioned",
    "currency": "string - if mentioned",
    "moq": "string or number - minimum order quantity if mentioned",
    "notes": "string - any additional notes or details",
    "contact": "string - if any contact info is mentioned",
    "company_name": "string - if supplier name mentioned"
  },
  "language": "string - detected language",
  "confidence": 0.95
}
Extract only information that is clearly stated in the audio.`;

    const userMessage = context
      ? `Transcribe and analyze this audio. Additional context: ${context}`
      : 'Transcribe and analyze this audio, extracting key information.';

    // Convert base64 to binary for audio processing
    const audioBuffer = Buffer.from(
      audio_base64.replace(/^data:audio\/[^;]+;base64,/, ''),
      'base64'
    );

    // Map format to MIME type
    const mimeType = {
      wav: 'audio/wav',
      m4a: 'audio/mp4',
      mp3: 'audio/mpeg',
    }[format] || 'audio/wav';

    // Call Claude API with audio
    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      system: systemPrompt,
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
      audio_processed: true,
      format: format,
    });
  } catch (err) {
    console.error('Error in process-audio:', err);
    return error(err.message, 500);
  }
}
