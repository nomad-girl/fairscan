/**
 * API Client for FairScan IA endpoints
 * Handles calls to backend IA processing
 */

const API_BASE = '';

/**
 * Process product image with Claude Vision
 * Extracts: name, description, features, materials, colors, category
 */
export async function processImage(base64Image, { categories, materials } = {}) {
  try {
    const response = await fetch(`${API_BASE}/api/process-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64Image, categories, materials }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error processing image:', error);
    throw error;
  }
}

/**
 * Process audio recording with Claude
 * Transcribes and extracts: price, MOQ, notes, contact info
 */
export async function processAudio(audioBlob) {
  try {
    // Convert blob to base64
    const base64Audio = await blobToBase64(audioBlob);

    const response = await fetch(`${API_BASE}/api/process-audio`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audio: base64Audio,
        format: audioBlob.type.split('/')[1] || 'webm',
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error processing audio:', error);
    throw error;
  }
}

/**
 * Process business card with Claude Vision
 * Extracts: company, contact name, phone, email, WeChat, address, etc.
 */
export async function processCard(base64Image) {
  try {
    const response = await fetch(`${API_BASE}/api/process-card`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64Image }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error processing card:', error);
    throw error;
  }
}

/**
 * Upload a photo to Cloudflare R2
 * Returns { url, key } on success, null if R2 not configured
 */
export async function uploadPhoto(base64Image, key) {
  try {
    const response = await fetch(`${API_BASE}/api/upload-photo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64Image, key }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      if (err.error === 'R2 not configured') return null;
      throw new Error(`Upload error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.warn('Photo upload failed:', error);
    return null;
  }
}

/**
 * Helper: Convert Blob to Base64
 */
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Helper: Convert URL to Base64 (for photos)
 */
export function urlToBase64(url) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(xhr.response);
    };
    xhr.onerror = reject;
    xhr.open('GET', url);
    xhr.responseType = 'blob';
    xhr.send();
  });
}

/**
 * Download an R2 image via server proxy (bypasses CORS).
 * Returns base64 data URL or null on failure.
 */
export async function proxyImage(url) {
  try {
    const response = await fetch(`${API_BASE}/api/proxy-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    if (!response.ok) return null;
    const { base64 } = await response.json();
    return base64 || null;
  } catch {
    return null;
  }
}
