/**
 * Borrador de la captura rápida (N2 / pieza 2.6).
 *
 * La captura rápida acumula fotos en la memoria de la pantalla hasta el botón
 * "Guardar". Si el sistema mata la app (cámara abierta + 12 fotos en memoria es
 * justo el peor momento), se pierde el stand entero. La captura clásica ya
 * guardaba un borrador; la rápida, que es la que se usa en la feria, no.
 *
 * Desde 4.3 cada foto crea su producto en la base al instante, así que lo que
 * se guarda acá es liviano: los ids de los productos del stand abierto y los
 * datos del proveedor que todavía no se cerró. Al volver a entrar se ofrece
 * retomar el stand. Se borra cuando el stand se cierra.
 *
 * Vive en la tabla `settings` (clave propia) para no cambiar el esquema de la base.
 */

import db from '../db.js';

export const CLAVE_BORRADOR = 'borrador-captura-rapida';
export const ESPERA_BORRADOR_MS = 800;

/** ¿Hay algo que valga la pena conservar? */
export function tieneContenido(b) {
  if (!b) return false;
  return (b.items?.length || 0) > 0 || (b.itemIds?.length || 0) > 0 || !!b.cardPhoto || !!(b.supplierName && b.supplierName.trim());
}

/** Texto corto para ofrecer retomar: qué hay y desde cuándo. */
export function describirBorrador(b, ahora = Date.now()) {
  const n = b?.items?.length || b?.itemIds?.length || 0;
  const partes = [];
  if (n) partes.push(`${n} producto${n === 1 ? '' : 's'}`);
  if (b?.cardPhoto || b?.supplierName) partes.push(b?.supplierName ? `la tarjeta de ${b.supplierName}` : 'la tarjeta del proveedor');
  const min = Math.max(0, Math.round((ahora - (b?.savedAt ?? ahora)) / 60000));
  const hace = min < 1 ? 'recién' : min < 60 ? `hace ${min} min` : `hace ${Math.round(min / 60)} h`;
  return { que: partes.join(' y ') || 'nada', hace };
}

export async function leerBorrador(store = db) {
  try {
    const b = await store.settings.get(CLAVE_BORRADOR);
    return tieneContenido(b) ? b : null;
  } catch { return null; }
}

export async function guardarBorrador(datos, store = db) {
  try {
    if (!tieneContenido(datos)) { await store.settings.delete(CLAVE_BORRADOR); return false; }
    await store.settings.put({ key: CLAVE_BORRADOR, ...datos, savedAt: Date.now() });
    return true;
  } catch (err) {
    console.warn('[borrador] no se pudo guardar:', err?.message || err);
    return false;
  }
}

export async function borrarBorrador(store = db) {
  try { await store.settings.delete(CLAVE_BORRADOR); } catch { /* da igual */ }
}
