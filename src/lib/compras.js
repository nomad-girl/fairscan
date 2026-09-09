/**
 * Compras dentro de la app (pieza 5.4): los packs de escaneos como compra
 * consumible en App Store y Google Play.
 *
 * La compra la hace la tienda (necesita señal y un build instalado desde la
 * tienda o TestFlight). Acá va la plomería del lado de la app; la validación del
 * recibo y la acreditación del saldo pasan por el servidor, nunca por la app.
 *
 * Hasta que el plugin esté configurado con las cuentas de las tiendas, esto
 * explica dónde se compra y no simula nada.
 */
import { Capacitor } from '@capacitor/core';

/** @returns {Promise<{ ok: boolean, mensaje?: string }>} */
export async function comprar(packId) {
  if (!Capacitor.isNativePlatform()) {
    return { ok: false, mensaje: 'Los escaneos se compran desde la app de App Store o Google Play.' };
  }
  return { ok: false, mensaje: 'Las compras se habilitan con la versión de la tienda (pieza 5.4).' };
}

export async function restaurar() {
  if (!Capacitor.isNativePlatform()) return { ok: false, mensaje: 'Restaurar compras funciona desde la app de App Store o Google Play.' };
  return { ok: false, mensaje: 'No hay compras para restaurar todavía.' };
}
