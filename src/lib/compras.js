/**
 * Compras dentro de la app (pieza 5.4): los packs de escaneos como compra
 * consumible en App Store y Google Play, a través de RevenueCat.
 *
 * Por qué RevenueCat: valida los recibos con Apple y Google del lado de su
 * servidor (la app nunca se cree sola un recibo), unifica las dos tiendas en un
 * solo SDK y avisa por webhook cuando una compra es válida. Con eso, acreditar
 * el saldo es un solo paso del lado nuestro (netlify/functions/compras-webhook.js).
 *
 * La compra la hace la tienda: necesita señal y una versión instalada desde la
 * tienda o TestFlight. En el navegador solo se explica dónde se compra.
 *
 * Ids de producto (iguales en App Store Connect, Play Console, RevenueCat y la
 * tabla config): pack_500 · pack_1000 · pack_3000.
 */
import { Capacitor } from '@capacitor/core';

const EN_WEB = 'Los escaneos se compran desde la app de App Store o Google Play.';
let configurado = false;

function claveApi() {
  const p = Capacitor.getPlatform();
  if (p === 'ios') return import.meta.env.VITE_REVENUECAT_IOS_KEY || '';
  if (p === 'android') return import.meta.env.VITE_REVENUECAT_ANDROID_KEY || '';
  return '';
}

async function sdk() {
  const { Purchases, LOG_LEVEL } = await import('@revenuecat/purchases-capacitor');
  return { Purchases, LOG_LEVEL };
}

/** Se llama al arrancar con sesión: el id de la usuaria es el mismo en la tienda, en RevenueCat y en la base. */
export async function configurar(userId) {
  if (!Capacitor.isNativePlatform() || !userId) return false;
  const apiKey = claveApi();
  if (!apiKey) { console.warn('[compras] falta la clave pública de RevenueCat para esta plataforma'); return false; }
  try {
    const { Purchases } = await sdk();
    if (!configurado) { await Purchases.configure({ apiKey, appUserID: userId }); configurado = true; }
    else await Purchases.logIn({ appUserID: userId });
    return true;
  } catch (err) {
    console.warn('[compras] no se pudo configurar:', err?.message || err);
    return false;
  }
}

/** @returns {Promise<{ ok: boolean, mensaje?: string, cancelada?: boolean }>} */
export async function comprar(packId) {
  if (!Capacitor.isNativePlatform()) return { ok: false, mensaje: EN_WEB };
  if (!configurado) return { ok: false, mensaje: 'Las compras se habilitan con la versión de la tienda.' };
  try {
    const { Purchases } = await sdk();
    const { products } = await Purchases.getProducts({ productIdentifiers: [packId] });
    const product = products?.[0];
    if (!product) return { ok: false, mensaje: 'Ese pack todavía no está disponible en la tienda.' };
    await Purchases.purchaseStoreProduct({ product });
    // El saldo lo acredita el servidor cuando la tienda confirma (webhook); la app
    // vuelve a leer el saldo enseguida y unas veces más por si tarda.
    return { ok: true };
  } catch (err) {
    if (err?.userCancelled || /cancel/i.test(err?.message || '')) return { ok: false, cancelada: true, mensaje: 'Compra cancelada' };
    return { ok: false, mensaje: err?.message || 'La compra no se completó' };
  }
}

export async function restaurar() {
  if (!Capacitor.isNativePlatform()) return { ok: false, mensaje: 'Restaurar compras funciona desde la app de App Store o Google Play.' };
  if (!configurado) return { ok: false, mensaje: 'Las compras se habilitan con la versión de la tienda.' };
  try {
    const { Purchases } = await sdk();
    await Purchases.restorePurchases();
    return { ok: true, mensaje: 'Compras restauradas. El saldo se actualiza en unos segundos.' };
  } catch (err) {
    return { ok: false, mensaje: err?.message || 'No se pudo restaurar' };
  }
}
