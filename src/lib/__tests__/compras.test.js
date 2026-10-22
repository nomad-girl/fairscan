import { describe, it, expect, vi, beforeEach } from 'vitest';
import { iniciarIdiomas } from '../../idiomas/index.js';
iniciarIdiomas();

// 22/10: la primera compra en Android falló porque (1) RevenueCat busca suscripciones si no se le pasa el tipo
// y (2) el módulo usaba i18next sin importarlo. Estos tests fijan las dos cosas.
const getProducts = vi.fn();
const purchaseStoreProduct = vi.fn();
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true, getPlatform: () => 'android' } }));
vi.mock('@revenuecat/purchases-capacitor', () => ({ Purchases: { configure: vi.fn(), logIn: vi.fn(), getProducts, purchaseStoreProduct }, LOG_LEVEL: {} }));

describe('comprar (Android)', () => {
  beforeEach(() => { vi.resetModules(); getProducts.mockReset(); purchaseStoreProduct.mockReset(); import.meta.env.VITE_REVENUECAT_ANDROID_KEY = 'goog_prueba'; });

  it('pide los packs como compra única, no como suscripción', async () => {
    const m = await import('../compras.js');
    await m.configurar('d52c2925-f2cb-4a4a-8330-3f65bdeb8d7f');
    getProducts.mockResolvedValue({ products: [{ identifier: 'pack_500' }] });
    purchaseStoreProduct.mockResolvedValue({});
    const r = await m.comprar('pack_500');
    expect(getProducts).toHaveBeenCalledWith({ productIdentifiers: ['pack_500'], type: 'NON_SUBSCRIPTION' });
    expect(r.ok).toBe(true);
  });

  it('si la tienda no devuelve el pack, avisa con un texto (sin romperse)', async () => {
    const m = await import('../compras.js');
    await m.configurar('d52c2925-f2cb-4a4a-8330-3f65bdeb8d7f');
    getProducts.mockResolvedValue({ products: [] });
    const r = await m.comprar('pack_500');
    expect(r.ok).toBe(false);
    expect(typeof r.mensaje).toBe('string');
    expect(r.mensaje).not.toMatch(/is not defined/);
  });
});
