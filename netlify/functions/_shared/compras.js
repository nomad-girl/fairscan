/**
 * Pieza 5.4 · reglas puras del webhook de compras (RevenueCat).
 * Sin red: se testean solas.
 */

// Eventos que representan una compra consumible válida. Las renovaciones no
// aplican (no hay suscripciones); los reembolsos no se descuentan (política: se
// rigen por la tienda; queda anotado para revisarlo a mano).
const TIPOS_QUE_ACREDITAN = new Set(["NON_RENEWING_PURCHASE", "INITIAL_PURCHASE"]);

/** @returns {{ userId: string, transaccionId: string, productoId: string, tienda: string|null, entorno: string|null } | null} */
function interpretarEvento(body) {
  const e = body?.event;
  if (!e || !TIPOS_QUE_ACREDITAN.has(e.type)) return null;
  const userId = e.app_user_id || e.original_app_user_id;
  const productoId = e.product_id;
  const transaccionId = e.transaction_id || e.id;
  if (!userId || !productoId || !transaccionId) return null;
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return null; // solo ids de Supabase; los anónimos de RevenueCat no son cuentas nuestras
  return { userId, transaccionId: String(transaccionId), productoId, tienda: e.store || null, entorno: e.environment || null };
}

/** Cuántos escaneos da un producto, según la config (fila negocio → packs). */
function escaneosDePack(packs, productoId) {
  const p = (packs || []).find(x => x && x.id === productoId);
  return p && Number.isInteger(p.escaneos) && p.escaneos > 0 ? p.escaneos : null;
}

function autorizado(headers, secreto) {
  if (!secreto) return false;
  const h = headers?.authorization || headers?.Authorization || "";
  return h === `Bearer ${secreto}` || h === secreto;
}

module.exports = { interpretarEvento, escaneosDePack, autorizado, TIPOS_QUE_ACREDITAN };
