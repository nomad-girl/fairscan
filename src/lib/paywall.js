/**
 * Paywall (pieza 5.3), como quedó decidido el 09/09 (noche):
 *
 * · Aparece AL CERRAR EL STAND, no al disparar: la usuaria captura todo el stand
 *   sin interrupciones. Si el saldo no alcanza, los productos que exceden quedan
 *   guardados y bloqueados (nada se pierde) y sube la hoja con los tres packs.
 * · "Después" cierra el stand igual.
 * · Sin señal no hay paywall: se usan los escaneos de emergencia (20, regalo) y el
 *   paywall aparece en la próxima apertura con señal.
 * · Aviso previo, sin bloquear, cuando quedan 5.
 *
 * Esto es la regla pura; la pantalla vive en App.jsx.
 */

export const AVISO_QUEDAN = 5;

/**
 * @param {object} a
 * @param {number} a.saldo            saldo ANTES de descontar este stand
 * @param {number} a.nuevos           productos del stand que descuentan
 * @param {boolean} a.online
 * @param {number} a.emergencia       cuántos de emergencia da la config (20)
 * @param {number} a.emergenciaUsada  cuántos ya se usaron sin señal
 * @returns {{ bloquear: number, usarEmergencia: number, mostrarPaywall: boolean, paywallPendiente: boolean, avisoQuedan: number|null }}
 */
export function evaluarCierreDeStand({ saldo, nuevos, online, emergencia = 20, emergenciaUsada = 0 }) {
  const cubiertos = Math.max(0, Math.min(nuevos, saldo));
  const faltan = nuevos - cubiertos;
  if (faltan === 0) {
    const quedan = saldo - nuevos;
    return { bloquear: 0, usarEmergencia: 0, mostrarPaywall: false, paywallPendiente: false, avisoQuedan: quedan <= AVISO_QUEDAN ? quedan : null };
  }
  if (online) {
    return { bloquear: faltan, usarEmergencia: 0, mostrarPaywall: true, paywallPendiente: false, avisoQuedan: null };
  }
  const emergenciaDisponible = Math.max(0, emergencia - emergenciaUsada);
  const conEmergencia = Math.min(faltan, emergenciaDisponible);
  return { bloquear: faltan - conEmergencia, usarEmergencia: conEmergencia, mostrarPaywall: false, paywallPendiente: true, avisoQuedan: null };
}

/** El pack destacado ("el más elegido") es el marcado como ancla, o el del medio. */
export function packDestacado(packs) {
  if (!packs?.length) return null;
  return packs.find(p => p.ancla) || packs[Math.floor(packs.length / 2)];
}

export const FRASE_PAYWALL = "Se te acabaron los escaneos de prueba. Los proveedores siguen siendo gratis; pagás solo por producto.";
