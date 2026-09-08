/**
 * Cliente de las funciones de FairScan (IA, subida de fotos, proxy de imágenes).
 *
 * Dos cosas importantes acá:
 *
 * 1. **La dirección del servidor es configurable** (`VITE_API_BASE`). Antes estaba
 *    vacía, o sea que todas las llamadas eran relativas: "en el mismo lugar de donde
 *    vino esta página". En la web eso es el dominio de Netlify y funciona. Pero la app
 *    empaquetada con Capacitor se sirve desde el propio teléfono, así que `/api/...`
 *    apuntaba al teléfono, donde no hay nada, y toda la IA quedaba muda.
 *    En web se deja vacía (sigue siendo relativa); en los builds nativos se pone el
 *    dominio de producción. Ver `.env.example`.
 *
 * 2. **Cada llamada manda la sesión de Supabase.** El servidor ahora la exige: sin
 *    esto cualquiera con la URL podía gastar el crédito de IA o escribir en el bucket
 *    de fotos. Ver `netlify/functions/_shared/guard.js`.
 */

import { supabase } from '../lib/supabase.js';

const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '');

/** Arma la URL completa de un endpoint. Usarla siempre en vez de escribir "/api/..." suelto. */
export const apiUrl = (path) => `${API_BASE}${path}`;

/** Error con el código HTTP a la vista, para que quien llama pueda distinguir casos. */
export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** Token de la sesión actual, o null si todavía no hay sesión. */
async function authToken() {
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token || null;
  } catch {
    return null;
  }
}

/** Mensaje entendible para los casos que la usuaria puede llegar a ver. */
function messageFor(status) {
  if (status === 401) return 'Tu sesión venció. Volvé a entrar.';
  if (status === 429) return 'Demasiados pedidos seguidos. Probá en un momento.';
  if (status === 413) return 'El archivo es demasiado grande.';
  if (status === 503) return 'El servicio no está disponible en este momento.';
  return `Error del servidor (${status})`;
}

/**
 * POST a una función, con la sesión adjunta.
 * @param {string} path  ruta relativa, ej. "/api/process-image"
 * @param {object} payload
 */
async function post(path, payload) {
  const headers = { 'Content-Type': 'application/json' };
  const token = await authToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let detail = null;
    try {
      detail = (await response.json())?.error || null;
    } catch { /* respuesta sin JSON */ }
    throw new ApiError(detail || messageFor(response.status), response.status);
  }

  return response.json();
}

/**
 * Procesa la foto de un producto con Claude Vision.
 * Extrae nombre, descripción, características, materiales, colores y categoría.
 */
export async function processImage(base64Image, { categories, materials } = {}) {
  try {
    return await post('/api/process-image', { image: base64Image, categories, materials });
  } catch (error) {
    console.error('Error processing image:', error);
    throw error;
  }
}

/**
 * Procesa una grabación de audio con Claude.
 * Transcribe y extrae precio, MOQ, notas y datos de contacto.
 */
export async function processAudio(audioBlob) {
  try {
    const base64Audio = await blobToBase64(audioBlob);
    return await post('/api/process-audio', {
      audio: base64Audio,
      format: audioBlob.type.split('/')[1] || 'webm',
    });
  } catch (error) {
    console.error('Error processing audio:', error);
    throw error;
  }
}

/**
 * Procesa la tarjeta de un proveedor con Claude Vision.
 * Extrae empresa, contacto, teléfono, email, WeChat, dirección, etc.
 */
export async function processCard(base64Image) {
  try {
    return await post('/api/process-card', { image: base64Image });
  } catch (error) {
    console.error('Error processing card:', error);
    throw error;
  }
}

/**
 * Sube una foto a Cloudflare R2.
 * Devuelve { url, key } si salió bien, o null si R2 no está configurado.
 * Nunca tira: quien llama trata el null como "quedó solo local".
 */
export async function uploadPhoto(base64Image, kind = 'products') {
  try {
    // El nombre del archivo lo elige el servidor (inadivinable, por usuaria);
    // la app solo dice si es foto de producto o tarjeta de proveedor.
    return await post('/api/upload-photo', { image: base64Image, kind });
  } catch (error) {
    if (error instanceof ApiError && error.status === 500 && /R2 not configured/i.test(error.message)) {
      return null;
    }
    console.warn('Photo upload failed:', error);
    return null;
  }
}

/**
 * Qué pasaría si borrara mi cuenta. No toca nada: sirve para avisar antes.
 * Devuelve qué equipos se borran, cuáles quedan, y cuántas ferias, proveedores
 * y productos se perderían.
 */
export async function deleteAccountPreview() {
  return post('/api/delete-account', { preview: true });
}

/**
 * Borra la cuenta de verdad. Pide el mail escrito como confirmación final para
 * que sea imposible llegar acá por accidente.
 */
export async function deleteAccount(email) {
  return post('/api/delete-account', { confirm: true, email });
}

/** Helper: Blob a Base64 */
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** Helper: URL a Base64 (para fotos) */
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
 * Descarga una imagen de R2 a través del servidor (esquiva el CORS).
 * Devuelve un data URL en base64, o null si falla.
 */
export async function proxyImage(url) {
  try {
    const { base64 } = await post('/api/proxy-image', { url });
    return base64 || null;
  } catch {
    return null;
  }
}
