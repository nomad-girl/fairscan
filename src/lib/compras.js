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
 * tabla config): pack_500 · pack_1000 (destacado) · pack_2000 (decisión 29/09; se fue el de 3.000).
 */
import { Capacitor } from '@capacitor/core';
import i18next from 'i18next';
import { metaCompra } from './metaEventos.js';

const EN_WEB = () => i18next.t('compras.enWeb');
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

/** ¿La compra dentro de la app está lista en este teléfono? (RevenueCat configurado con clave) */
export function estaConfigurado() { return configurado; }

/**
 * Los precios tal como los cobra la tienda, en la moneda de cada persona (25/10). Apple rechaza que la app muestre un
 * precio distinto del que después cobra, y el de la config es solo de referencia (USD 19,99 en Latinoamérica,
 * 24,99 en Estados Unidos). Devuelve { pack_500: { texto: "US$ 24,99", valor: 24.99, moneda: "USD" }, … }; si la tienda no responde, {} y se usa el de la config.
 */
export async function preciosDeTienda(ids = []) {
  if (!Capacitor.isNativePlatform() || !configurado || !ids.length) return {};
  try {
    const { Purchases } = await sdk();
    const { products } = await Purchases.getProducts({ productIdentifiers: ids, type: 'NON_SUBSCRIPTION' });
    const r = {};
    for (const p of products || []) if (p?.identifier && p?.priceString) r[p.identifier] = { texto: p.priceString, valor: Number(p.price), moneda: p.currencyCode || null };
    return r;
  } catch (err) { console.warn('[compras] sin precios de la tienda:', err?.message || err); return {}; }
}

/** @returns {Promise<{ ok: boolean, mensaje?: string, cancelada?: boolean }>} */
export async function comprar(packId) {
  if (!Capacitor.isNativePlatform()) return { ok: false, mensaje: EN_WEB() };
  if (!configurado) return { ok: false, mensaje: i18next.t('compras.soloTienda') };
  try {
    const { Purchases } = await sdk();
    // 22/10: en Android RevenueCat busca SUSCRIPCIONES si no se le dice el tipo, y los packs son compras únicas:
    // la primera compra en Android respondía "pack no disponible". En iOS el tipo se ignora.
    const { products } = await Purchases.getProducts({ productIdentifiers: [packId], type: 'NON_SUBSCRIPTION' });
    const product = products?.[0];
    if (!product) return { ok: false, mensaje: i18next.t('compras.packNoDisponible') };
    await Purchases.purchaseStoreProduct({ product });
    metaCompra(product.price, product.currencyCode || 'USD', { pack: packId }); // Meta: compra con valor y moneda de la tienda
    // El saldo lo acredita el servidor cuando la tienda confirma (webhook); la app
    // vuelve a leer el saldo enseguida y unas veces más por si tarda.
    return { ok: true };
  } catch (err) {
    if (err?.userCancelled || /cancel/i.test(err?.message || '')) return { ok: false, cancelada: true, mensaje: i18next.t('compras.cancelada') };
    return { ok: false, mensaje: err?.message || i18next.t('compras.noCompleto') };
  }
}

export async function restaurar() {
  if (!Capacitor.isNativePlatform()) return { ok: false, mensaje: i18next.t('compras.restaurarEnWeb') };
  if (!configurado) return { ok: false, mensaje: 'Las compras se habilitan con la versión de la tienda.' };
  try {
    const { Purchases } = await sdk();
    await Purchases.restorePurchases();
    return { ok: true, mensaje: 'Compras restauradas. El saldo se actualiza en unos segundos.' };
  } catch (err) {
    return { ok: false, mensaje: err?.message || 'No se pudo restaurar' };
  }
}
