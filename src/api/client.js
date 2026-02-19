/**
 * HTTP Client for FairScan API
 * Handles all communication with backend endpoints
 */

const API_BASE =
  import.meta.env.VITE_API_URL || window.location.origin + '/api';

/**
 * Generic API request wrapper
 */
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE}/${endpoint}`;

  try {
    const response = await fetch(url, {
      method: options.method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    return data.data;
  } catch (err) {
    console.error(`API Error (${endpoint}):`, err);
    throw err;
  }
}

/**
 * Process product image with Claude Vision
 * @param {string} base64Image - Base64 encoded image
 * @param {string} context - Optional context about the product
 * @returns {Object} Extracted image data
 */
export async function processImage(base64Image, context = null) {
  return apiRequest('process-image', {
    body: {
      base64_image: base64Image,
      context,
    },
  });
}

/**
 * Process audio recording
 * @param {string} audio_base64 - Base64 encoded audio
 * @param {string} format - Audio format (wav, m4a, mp3)
 * @param {string} context - Optional context
 * @returns {Object} Transcription and extracted data
 */
export async function processAudio(audio_base64, format = 'wav', context = null) {
  return apiRequest('process-audio', {
    body: {
      audio_base64,
      format,
      context,
    },
  });
}

/**
 * Process QR code text
 * @param {string} qr_text - Raw QR code text
 * @returns {Object} Parsed supplier information
 */
export async function processQR(qr_text) {
  return apiRequest('process-qr', {
    body: {
      qr_text,
    },
  });
}

/**
 * Batch sync pending items
 * @param {Array} items - Array of items with pending_processing flags
 * @returns {Object} Synced items and errors
 */
export async function syncWithAI(items) {
  return apiRequest('sync', {
    body: {
      items,
    },
  });
}

export default {
  processImage,
  processAudio,
  processQR,
  syncWithAI,
};
