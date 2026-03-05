/**
 * Proxy function to download images from R2 and return as base64.
 * Bypasses CORS restrictions when the browser can't fetch R2 directly.
 */
exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

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
