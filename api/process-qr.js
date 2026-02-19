/**
 * Process QR code text and extract supplier information
 * Supports: WeChat, phone numbers, URLs
 *
 * POST /api/process-qr
 * Body: {
 *   qr_text: string (raw text from QR code)
 * }
 */

import Anthropic from '@anthropic-ai/sdk';
import { requireApiKey, success, error, validateBody } from './middleware.js';

// WeChat ID regex patterns
const WECHAT_PATTERNS = [
  /(?:weixin|wechat)[:/\s=]+([a-zA-Z0-9_-]+)/i,
  /微信[:/\s=]+([a-zA-Z0-9_-]+)/,
  /^[a-zA-Z0-9_-]{6,20}$/, // Direct WeChat ID
];

// Phone number regex (flexible, supports multiple formats)
const PHONE_PATTERNS = [
  /(?:\+?86[-.\s]?)1[3-9]\d{9}/, // China mainland
  /\+?86\d{10,11}/, // China alt
  /\+[\d\s-()]+/, // International format
  /(?:Tel|Phone)[:/\s=]+([+\d\s-()]+)/i,
];

// Email pattern
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

// URL pattern
const URL_PATTERN = /https?:\/\/[^\s]+|www\.[^\s]+/;

/**
 * Extract WeChat ID from QR text
 */
function extractWeChat(text) {
  for (const pattern of WECHAT_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      return match[1] || match[0];
    }
  }
  return null;
}

/**
 * Extract phone number from QR text
 */
function extractPhone(text) {
  for (const pattern of PHONE_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      return match[0];
    }
  }
  return null;
}

/**
 * Extract email from QR text
 */
function extractEmail(text) {
  const match = text.match(EMAIL_PATTERN);
  return match ? match[0] : null;
}

/**
 * Extract URL from QR text
 */
function extractUrl(text) {
  const match = text.match(URL_PATTERN);
  return match ? match[0] : null;
}

/**
 * Parse QR text and extract structured data
 */
function parseQRText(qrText) {
  return {
    wechat_id: extractWeChat(qrText),
    phone: extractPhone(qrText),
    email: extractEmail(qrText),
    website: extractUrl(qrText),
    raw_text: qrText,
  };
}

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
    const bodyError = validateBody(req.body, ['qr_text']);
    if (bodyError) {
      return error(bodyError, 400);
    }

    const { qr_text } = req.body;

    // Validate QR text
    if (!qr_text || typeof qr_text !== 'string' || qr_text.trim().length === 0) {
      return error('qr_text must be a non-empty string', 400);
    }

    // Parse QR text with regex patterns
    const parsed = parseQRText(qr_text);

    // Initialize Anthropic client for enrichment
    const client = new Anthropic({ apiKey });

    // Use Claude to enrich the data and extract company name
    const enrichmentPrompt = `Analyze this supplier contact information and extract/infer the company name if possible.
Return a JSON object with:
{
  "company_name": "string - inferred or extracted company name, or null",
  "supplier_type": "string - type of business (e.g., manufacturer, trader, etc.), or null",
  "location": "string - inferred location if possible (e.g., Guangzhou, Beijing), or null",
  "confidence": 0.95
}

Contact information provided:
- WeChat ID: ${parsed.wechat_id || 'N/A'}
- Phone: ${parsed.phone || 'N/A'}
- Email: ${parsed.email || 'N/A'}
- Website: ${parsed.website || 'N/A'}
- Raw text: ${qrText}

If you cannot infer information reliably, return null for that field.`;

    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: enrichmentPrompt,
        },
      ],
    });

    // Extract enrichment data
    const content = response.content[0];
    if (content.type !== 'text') {
      return error('Unexpected response type from Claude', 500);
    }

    let enrichmentData = {};
    try {
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        enrichmentData = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('Failed to parse enrichment response:', content.text);
    }

    // Combine parsed and enriched data
    const result = {
      ...parsed,
      company_name: enrichmentData.company_name,
      supplier_type: enrichmentData.supplier_type,
      location: enrichmentData.location,
      confidence: enrichmentData.confidence || 0.85,
    };

    // Return success
    return success({
      extracted: result,
      parsed_from: 'qr_code',
      processed_at: new Date().toISOString(),
      qr_processed: true,
    });
  } catch (err) {
    console.error('Error in process-qr:', err);
    return error(err.message, 500);
  }
}
