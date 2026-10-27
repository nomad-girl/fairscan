import { describe, it, expect } from 'vitest';
import { normalizarNegocio, comprasActivasEn, paraEstaCuenta, NEGOCIO_POR_DEFECTO } from '../negocio.js';

describe('normalizarNegocio', () => {
  it('con nada del servidor usa los valores por defecto', () => {
    const n = normalizarNegocio(null);
    expect(n.trial).toBe(NEGOCIO_POR_DEFECTO.trial);
    expect(n.packs).toHaveLength(3);
  });
  it('descarta packs mal formados y se queda con los válidos', () => {
    const n = normalizarNegocio({ packs: [{ id: 'pack_500', escaneos: 500, usd: 19.99 }, { id: 'roto' }] });
    expect(n.packs.map(p => p.id)).toEqual(['pack_500']);
  });
});

describe('compras apagadas por defecto (Plan B, 14/10)', () => {
  it('sin valor en el servidor, la compra está apagada y la lista de prueba vacía', () => {
    const n = normalizarNegocio({ trial: 15 });
    expect(n.compras_activas).toBe(false);
    expect(n.compras_pruebas).toEqual([]);
  });
  it('acepta solo true explícito y solo textos en la lista de prueba', () => {
    expect(normalizarNegocio({ compras_activas: 'si' }).compras_activas).toBe(false);
    expect(normalizarNegocio({ compras_activas: true }).compras_activas).toBe(true);
    expect(normalizarNegocio({ compras_pruebas: ['abc', 3, null] }).compras_pruebas).toEqual(['abc']);
  });
});

describe('compras por plataforma (22/10)', () => {
  it('true prende todas; un objeto prende solo las plataformas marcadas', () => {
    expect(comprasActivasEn(normalizarNegocio({ compras_activas: true }), 'ios')).toBe(true);
    const n = normalizarNegocio({ compras_activas: { android: true } });
    expect(comprasActivasEn(n, 'android')).toBe(true);
    expect(comprasActivasEn(n, 'ios')).toBe(false);
    expect(comprasActivasEn(n, 'web')).toBe(false);
    expect(comprasActivasEn(normalizarNegocio({ compras_activas: 'android' }), 'android')).toBe(false);
  });
});


describe('chat y analítica solo para las cuentas de prueba (27/10)', () => {
  const chat = { url: 'https://app.chatwoot.com', token: 'Y8hPaZ1X451jab912CER3iMh' };
  it('sin la marca, para todo el mundo', () => {
    const n = normalizarNegocio({ soporte_chat: chat });
    expect(paraEstaCuenta(n, 'soporte_chat', 'cualquiera')).toMatchObject(chat);
  });
  it('con solo_pruebas, solo para las cuentas de la lista', () => {
    const n = normalizarNegocio({ soporte_chat: { ...chat, solo_pruebas: true }, compras_pruebas: ['nati'] });
    expect(paraEstaCuenta(n, 'soporte_chat', 'nati')).toMatchObject(chat);
    expect(paraEstaCuenta(n, 'soporte_chat', 'otra')).toBe(null);
    expect(paraEstaCuenta(n, 'soporte_chat', undefined)).toBe(null);
  });
  it('sin config, null; la analítica igual que el chat', () => {
    expect(paraEstaCuenta(normalizarNegocio({}), 'soporte_chat', 'nati')).toBe(null);
    const n = normalizarNegocio({ analitica: { host: 'https://us.i.posthog.com', key: 'phc_v9eEUm2Had3QGCytBr3mKa6fwcw2a7nvo22VKrwZrYYr', solo_pruebas: true }, compras_pruebas: ['nati'] });
    expect(paraEstaCuenta(n, 'analitica', 'nati')?.key).toMatch(/^phc_/);
    expect(paraEstaCuenta(n, 'analitica', 'otra')).toBe(null);
  });
});
