/**
 * Proxy function to download images from R2 and return as base64.
 * Bypasses CORS restrictions when the browser can't fetch R2 directly.
 */
const { guard } = require('./_shared/guard');

exports.handler = async (event) => {
  // CORS + sesión válida + tope de uso. Ver _shared/guard.js
  // El tope acompaña al de subida: el export descarga muchas fotos seguidas.
  const gate = await guard(event, { bucket: 'proxy', limit: 900, windowMs: 60_000, maxBodyKB: 16 });
  if (gate.response) return gate.response;
  const { headers } = gate;

  try {
    const { url } = JSON.parse(event.body || '{}');
    if (!url || !url.startsWith('http')) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid URL' }) };
    }

    // Only allow R2 URLs for security
    if (!url.includes('.r2.dev/') && !url.includes('r2.cloudflarestorage.com')) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Only R2 URLs allowed' }) };
    }

    const response = await fetch(url);
    if (!response.ok) {
      return { statusCode: response.status, headers, body: JSON.stringify({ error: `Fetch failed: ${response.status}` }) };
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const base64 = `data:${contentType};base64,${buffer.toString('base64')}`;

    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64 }),
    };
  } catch (error) {
    console.error('Proxy error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};
