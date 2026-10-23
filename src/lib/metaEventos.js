/**
 * Eventos para la publicidad de Meta (23/10/2026, F4a/E16): instalación (la mide el SDK solo), primer escaneo,
 * escaneos agotados y compra de pack. Van por un plugin nativo chico (`MetaEventos`, en android/) que carga el
 * SDK de Meta recién 2,5 s después de arrancar y manda todo en segundo plano: en China los dominios de Meta están
 * bloqueados y la app se usa adentro de la feria, así que nada de esto puede frenar la cámara ni mostrar un error.
 * Acá todo falla en silencio y devuelve false. Solo Android por ahora; iOS entra con la 1.0.2 (con el permiso ATT).
 */
import { Capacitor, registerPlugin } from '@capacitor/core';

const nativo = (() => { try { return registerPlugin('MetaEventos'); } catch { return null; } })();
const CLAVE_PRIMER_ESCANEO = 'fs_meta_primer_escaneo';

export function metaActivo() {
  try { return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'; } catch { return false; }
}

/** Un evento con nombre propio (`fs_…`). Nunca lanza. */
export async function metaEvento(nombre, params = {}) {
  if (!metaActivo() || !nombre) return false;
  try { await nativo?.evento({ nombre, params }); return !!nativo; } catch { return false; }
}

/** La compra de un pack: valor y moneda como los da la tienda (`fb_mobile_purchase` en Meta). Nunca lanza. */
export async function metaCompra(valor, moneda = 'USD', params = {}) {
  const n = Number(valor);
  if (!metaActivo() || !Number.isFinite(n) || n <= 0) return false;
  try { await nativo?.compra({ valor: n, moneda: String(moneda || 'USD'), params }); return !!nativo; } catch { return false; }
}

/** `fs_primer_escaneo`: una sola vez por instalación (se anota en localStorage). */
export async function primerEscaneo(store = globalThis.localStorage) {
  try { if (store?.getItem(CLAVE_PRIMER_ESCANEO)) return false; store?.setItem(CLAVE_PRIMER_ESCANEO, '1'); } catch { /* modo privado: se manda igual */ }
  return metaEvento('fs_primer_escaneo');
}
