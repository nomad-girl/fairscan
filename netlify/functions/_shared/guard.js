/**
 * Guard compartido de las funciones serverless de FairScan.
 *
 * Antes: los cinco endpoints aceptaban cualquier pedido, de cualquier origen, sin
 * credencial. Cualquiera con la URL podía gastar el crédito de Anthropic o escribir
 * archivos en el bucket de fotos. Ver `auditoria-e2e.md` → F6.
 *
 * Qué hace ahora cada pedido, en orden:
 *   1. CORS con lista de origenes permitidos (antes era "*")
 *   2. Método correcto
 *   3. Tamaño de cuerpo acotado
 *   4. Sesión de Supabase válida  ← el control de verdad
 *   5. Tope de pedidos por usuario
 *
 * Sobre 1 vs 4: la lista de origenes solo limita a los navegadores; cualquiera puede
 * mandar el Origin que quiera desde un script. **El control real es la sesión.**
 *
 * Nota para cuando llegue 4.2 ("capturar sin cuenta"): esto ya acepta sesiones
 * anónimas de Supabase (`is_anonymous`), así que no hay que tocarlo. Lo único que va
 * a hacer falta es habilitar "Anonymous sign-ins" en el panel de Supabase.
 */

const crypto = require('crypto');

// ─── Origenes permitidos ───────────────────────────────────────────────

const NATIVE_ORIGINS = [
  'capacitor://localhost', // iOS empaquetado con Capacitor
  'ionic://localhost',
  'http://localhost',      // Android empaquetado con Capacitor
  'https://localhost',
];

const DEV_ORIGINS = [
  'http://localhost:5173', // vite dev
  'http://localhost:8888', // netlify dev
  'http://127.0.0.1:5173',
];

function allowedOrigins() {
  const fromEnv = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  // Netlify inyecta estas dos solo: la URL del sitio y la del deploy preview.
  const fromNetlify = [process.env.URL, process.env.DEPLOY_PRIME_URL].filter(Boolean);

  return [...NATIVE_ORIGINS, ...DEV_ORIGINS, ...fromNetlify, ...fromEnv];
}

function header(event, name) {
  const h = event.headers || {};
  return h[name] || h[name.toLowerCase()] || h[name.toUpperCase()] || '';
}

function corsHeaders(event) {
  const origin = header(event, 'origin');
  const base = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
  // Sin Origin = pedido nativo o server-to-server: no hace falta CORS.
  if (!origin) return base;
  if (allowedOrigins().includes(origin)) {
    return { ...base, 'Access-Control-Allow-Origin': origin };
  }
  return base; // origen desconocido: el navegador bloquea la respuesta
}

// ─── Verificación de la sesión ─────────────────────────────────────────

const TOKEN_CACHE = new Map(); // hash(token) → { user, expiresAt }
const TOKEN_TTL_MS = 5 * 60 * 1000;
const TOKEN_CACHE_MAX = 500;

function hash(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function cacheGet(key) {
  const hit = TOKEN_CACHE.get(key);
  if (!hit) return null;
  if (hit.expiresAt < Date.now()) {
    TOKEN_CACHE.delete(key);
    return null;
  }
  return hit.user;
}

function cacheSet(key, user) {
  if (TOKEN_CACHE.size >= TOKEN_CACHE_MAX) {
    // Barrido simple: sacamos lo más viejo insertado.
    const oldest = TOKEN_CACHE.keys().next().value;
    if (oldest) TOKEN_CACHE.delete(oldest);
  }
  TOKEN_CACHE.set(key, { user, expiresAt: Date.now() + TOKEN_TTL_MS });
}

function supabaseConfig() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  return { url, anonKey };
}

/**
 * Devuelve { ok: true, user } o { ok: false, status, error }.
 *
 * Se verifica preguntándole a Supabase por el token (`/auth/v1/user`) en vez de
 * validar la firma acá. Es una llamada de red más en el primer pedido, pero:
 *   - no hace falta configurar ningún secreto nuevo (usa las variables que ya están)
 *   - funciona igual con firma simétrica o asimétrica, así que no se rompe si
 *     Supabase rota el esquema de claves
 * El resultado se cachea 5 minutos por token, así que en la práctica es una sola vez.
 */
async function verifyUser(event) {
  const authHeader = header(event, 'authorization');
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) return { ok: false, status: 401, error: 'Falta la sesión' };

  const key = hash(token);
  const cached = cacheGet(key);
  if (cached) return { ok: true, user: cached };

  const { url, anonKey } = supabaseConfig();
  if (!url || !anonKey) {
    // Mal configurado el servidor: no es culpa de quien llama, pero no se puede
    // verificar nada, así que no se deja pasar.
    console.error('[guard] Faltan las variables de Supabase; no se puede verificar la sesión');
    return { ok: false, status: 503, error: 'Verificación no disponible' };
  }

  let res;
  try {
    res = await fetch(`${url.replace(/\/$/, '')}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
    });
  } catch (err) {
    console.error('[guard] Error consultando Supabase:', err.message);
    return { ok: false, status: 503, error: 'Verificación no disponible' };
  }

  if (!res.ok) return { ok: false, status: 401, error: 'Sesión inválida o vencida' };

  const body = await res.json().catch(() => null);
  if (!body || !body.id) return { ok: false, status: 401, error: 'Sesión inválida' };

  const user = { id: body.id, email: body.email || null, isAnonymous: !!body.is_anonymous };
  cacheSet(key, user);
  return { ok: true, user };
}

// ─── Tope de pedidos ───────────────────────────────────────────────────

/**
 * Ventana deslizante en memoria. Ojo: cada instancia de la función tiene su propia
 * memoria, así que el tope real es más flojo que el configurado. Alcanza para frenar
 * un abuso (miles de pedidos por minuto); **no** es el contador de créditos.
 *
 * El contador de verdad, por usuario y persistente, llega con la pieza 5.2, que
 * necesita una tabla en Supabase de todos modos. No lo construimos dos veces.
 */
const RATE = new Map(); // `${userId}:${bucket}` → number[] (timestamps)

function checkRate(userId, bucket, limit, windowMs) {
  const key = `${userId}:${bucket}`;
  const now = Date.now();
  const hits = (RATE.get(key) || []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    const retryAfter = Math.ceil((windowMs - (now - hits[0])) / 1000);
    return { ok: false, retryAfter };
  }
  hits.push(now);
  RATE.set(key, hits);
  if (RATE.size > 5000) RATE.clear(); // válvula de escape
  return { ok: true };
}

// ─── Entrada única ─────────────────────────────────────────────────────

/**
 * @param {object} event  El evento de Netlify
 * @param {object} opts
 * @param {string} opts.bucket      Nombre del tope (ej. "ai", "upload")
 * @param {number} opts.limit       Pedidos permitidos por ventana
 * @param {number} opts.windowMs    Tamaño de la ventana
 * @param {number} opts.maxBodyKB   Cuerpo máximo aceptado
 *
 * @returns {{ response }} para cortar y devolver, o { headers, user } para seguir.
 */
async function guard(event, opts = {}) {
  const {
    bucket = 'default',
    limit = 120,
    windowMs = 60 * 1000,
    maxBodyKB = 6 * 1024,
  } = opts;

  const headers = corsHeaders(event);
  const fail = (status, error, extra = {}) => ({
    response: { statusCode: status, headers: { ...headers, ...extra }, body: JSON.stringify({ error }) },
  });

  if (event.httpMethod === 'OPTIONS') {
    return { response: { statusCode: 204, headers, body: '' } };
  }
  if (event.httpMethod !== 'POST') {
    return fail(405, 'Método no permitido');
  }

  const bodyBytes = event.body ? Buffer.byteLength(event.body, 'utf8') : 0;
  if (bodyBytes > maxBodyKB * 1024) {
    return fail(413, `El contenido supera el máximo de ${Math.round(maxBodyKB / 1024)} MB`);
  }

  const mode = (process.env.AUTH_MODE || 'enforce').toLowerCase();
  const auth = await verifyUser(event);

  let userId;
  if (auth.ok) {
    userId = auth.user.id;
  } else if (mode === 'warn') {
    // Interruptor de emergencia: deja pasar y avisa. Sirve para desplegar sin cortarle
    // el servicio a una app vieja que todavía no manda la sesión. Volver a "enforce".
    console.warn(`[guard] AUTH_MODE=warn — pedido sin sesión válida: ${auth.error}`);
    userId = `sinsesion:${header(event, 'x-nf-client-connection-ip') || 'desconocido'}`;
  } else {
    return fail(auth.status, auth.error);
  }

  const rate = checkRate(userId, bucket, limit, windowMs);
  if (!rate.ok) {
    return fail(429, 'Demasiados pedidos seguidos. Probá en un momento.', {
      'Retry-After': String(rate.retryAfter),
    });
  }

  return { headers, user: auth.ok ? auth.user : null };
}

module.exports = { guard, corsHeaders };
