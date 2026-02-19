/**
 * Middleware utilities para APIs de FairScan
 */

/**
 * Valida que el API key esté presente
 */
export function requireApiKey(req) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }
  return apiKey;
}

/**
 * Response handler estándar
 */
export function success(data, statusCode = 200) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    }),
  };
}

/**
 * Error handler estándar
 */
export function error(message, statusCode = 500) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      success: false,
      error: message,
      timestamp: new Date().toISOString(),
    }),
  };
}

/**
 * Valida que el body contenga los campos requeridos
 */
export function validateBody(body, requiredFields) {
  if (!body) {
    return 'Request body is required';
  }

  let data;
  try {
    data = typeof body === 'string' ? JSON.parse(body) : body;
  } catch (e) {
    return 'Invalid JSON in request body';
  }

  for (const field of requiredFields) {
    if (!(field in data)) {
      return `Missing required field: ${field}`;
    }
  }

  return null; // No error
}

/**
 * Wrapper para handlers que necesitan API key
 */
export function withApiKey(handler) {
  return async (req, res) => {
    try {
      requireApiKey(req);
      return await handler(req, res);
    } catch (err) {
      console.error('API Error:', err);
      return error(err.message);
    }
  };
}
