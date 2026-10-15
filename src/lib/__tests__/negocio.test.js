import { describe, it, expect } from 'vitest';
import { normalizarNegocio, NEGOCIO_POR_DEFECTO } from '../negocio.js';

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
