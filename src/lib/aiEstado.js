import { i18next } from '../idiomas/index.js';
/**
 * En qué quedó la IA con un producto o proveedor.
 *
 * Cuando la IA falla (mala señal, servidor caído), la app reintenta tres veces y
 * después se rinde marcándolo como "procesado" para no trabar la cola. Decisión
 * correcta, pero dejaba el producto indistinguible de uno bien procesado y sin
 * forma de volver a intentar (N8). El error ya se guardaba en `ai_error`; esto
 * lo usa.
 */

/** @returns {'listo'|'pendiente'|'fallo'} */
export function estadoIA(item) {
  if (!item) return 'listo';
  if (!item.ai_processed) return 'pendiente';
  if (item.ai_error) return 'fallo';
  return 'listo';
}

/** Cambios que vuelven a poner el ítem en la cola de la IA, desde cero. */
export function patchReintentoIA() {
  return { ai_processed: false, ai_error: null, ai_retry_count: 0 };
}

/** Texto corto para la usuaria según el error técnico guardado. */
export function explicarFalloIA(error) {
  const e = String(error || '').toLowerCase();
  if (/401|403|sesi|auth/.test(e)) return i18next.t('ia.falloSesion');
  if (/429|rate|tope|límite|limit/.test(e)) return i18next.t('ia.falloTope');
  if (/network|fetch|failed|timeout|offline|conex/.test(e)) return i18next.t('ia.falloSenal');
  return i18next.t('ia.falloGenerico');
}
