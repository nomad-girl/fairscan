/**
 * De dónde vino la instalación (28/10/2026, buzón 27/10 (6) punto b).
 *
 * La landing (`/landing/origen.js`) lee los utm_* o el fbclid del anuncio y los pega al link de Google Play como
 * `referrer`; Play se lo entrega a la app en la primera apertura (Install Referrer). También los deja en
 * localStorage (`fs_origen`) por si la persona abre la app web en el mismo navegador. Esto junta las dos fuentes
 * y devuelve un objeto chico para anotar en `primera_apertura` → `datos.origen` (eventos_uso), sin datos personales.
 *
 *  - Android: el plugin nativo `InstallReferrer` (android/app/.../InstallReferrer.java) devuelve el referrer crudo.
 *    30/10 (buzón (33)): acá se lo buscaba como `OrigenInstalacion`, el nombre de la propuesta; el plugin real se
 *    llama `InstallReferrer`, así que nunca respondía y ninguna apertura de Android guardó origen (0 de 252).
 *  - Web: localStorage `fs_origen` o los utm_* de la URL actual.
 *  - iPhone: nada; Apple no le pasa la campaña a la app (se mira en App Store Connect → Analíticas → Campañas).
 * Nunca lanza: si no hay nada, devuelve null y `primera_apertura` sale como hoy.
 */
import { Capacitor, registerPlugin } from '@capacitor/core';

const CLAVE = 'fs_origen';
const CAMPOS = { utm_source: 'fuente', utm_medium: 'medio', utm_campaign: 'campania', utm_content: 'contenido', utm_term: 'termino', fbclid: 'fbclid', gclid: 'gclid' };
/** Tiene que ser igual al `@CapacitorPlugin(name = …)` de InstallReferrer.java (lo verifica un test). */
export const NOMBRE_PLUGIN = 'InstallReferrer';
const nativo = (() => { try { return registerPlugin(NOMBRE_PLUGIN); } catch { return null; } })();

/** `utm_source=meta&utm_campaign=x` → `{ fuente: 'meta', campania: 'x' }`. Ignora lo que no conoce; recorta a 80 caracteres. Null si no hay nada útil. */
export function parsearOrigen(texto) {
  if (!texto || typeof texto !== 'string') return null;
  let params;
  try { params = new URLSearchParams(texto.replace(/^\?/, '')); } catch { return null; }
  const out = {};
  for (const [k, v] of params) { const campo = CAMPOS[k]; if (campo && v && !out[campo]) out[campo] = String(v).slice(0, 80); }
  // Un referrer de Play sin utm (instalación orgánica: "utm_source=google-play&utm_medium=organic") se anota igual: dice "orgánico"
  if (Object.keys(out).length) return out;
  // Algo vino pero sin claves conocidas: se guarda recortado, para poder leerlo después en vez de perderlo (30/10)
  const crudo = texto.trim().slice(0, 120);
  return crudo ? { crudo } : null;
}

/** Lee el origen una sola vez por instalación (queda en `fs_origen`); las veces siguientes devuelve lo guardado. */
export async function leerOrigen({ store = globalThis.localStorage, plugin = nativo, url = globalThis.location?.search } = {}) {
  let guardado = null;
  try { guardado = store?.getItem(CLAVE) || null; } catch { /* sin almacenamiento */ }
  if (guardado) return parsearOrigen(guardado);
  let crudo = null;
  try {
    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android' && plugin) {
      const r = await plugin.leer();
      crudo = r?.referrer || null;
    } else if (!Capacitor.isNativePlatform()) {
      crudo = url && /utm_|fbclid|gclid/.test(url) ? url : null;
    }
  } catch { crudo = null; }
  const origen = parsearOrigen(crudo);
  if (origen) { try { store?.setItem(CLAVE, crudo); } catch { /* se pierde, no importa */ } }
  return origen;
}
