import { describe, it, expect, vi } from 'vitest';
import { normalizarNegocio, cargarNegocio, NEGOCIO_POR_DEFECTO } from '../negocio.js';
import { estadoInicial, descontarStand, devolverProducto, reconciliar, saldoVisible } from '../creditos.js';

describe('normalizarNegocio', () => {
  it('toma lo del servidor y rellena lo que falta con los valores por defecto', () => {
    const n = normalizarNegocio({ trial: 20, packs: [{ id: 'p', escaneos: 100, usd: 5 }] });
    expect(n.trial).toBe(20);
    expect(n.emergencia).toBe(20);
    expect(n.packs).toEqual([{ id: 'p', escaneos: 100, usd: 5 }]);
  });
  it('un valor roto no rompe la app', () => {
    const n = normalizarNegocio({ trial: -3, packs: 'nada', tarjetas_gratis: 'sí' });
    expect(n).toEqual({ ...NEGOCIO_POR_DEFECTO, packs: NEGOCIO_POR_DEFECTO.packs });
  });
});

describe('cargarNegocio', () => {
  const settingsFake = (inicial = {}) => { let st = inicial; return { get: async () => st, save: async (c) => { st = { ...st, ...c }; }, leer: () => st }; };
  it('lee del servidor y lo guarda para cuando no haya señal', async () => {
    const supabase = { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { value: { trial: 20 }, updated_at: 'x' } }) }) }) }) };
    const s = settingsFake();
    const n = await cargarNegocio(supabase, s);
    expect(n.trial).toBe(20);
    expect(s.leer().negocio.trial).toBe(20);
  });
  it('sin señal usa lo guardado; sin nada guardado, los valores por defecto', async () => {
    const supabase = { from: () => { throw new Error('offline'); } };
    expect((await cargarNegocio(supabase, settingsFake({ negocio: { trial: 30 } }))).trial).toBe(30);
    expect((await cargarNegocio(supabase, settingsFake())).trial).toBe(15);
    expect((await cargarNegocio(null, settingsFake())).trial).toBe(15);
  });
});

describe('créditos', () => {
  it('cerrar el stand descuenta 1 por producto, una sola vez', () => {
    let e = estadoInicial(15);
    e = descontarStand(e, ['a', 'b', 'c']);
    expect(e.saldo).toBe(12);
    e = descontarStand(e, ['b', 'd']); // b ya estaba
    expect(e.saldo).toBe(11);
    expect(e.pendientes).toEqual(['a', 'b', 'c', 'd']);
  });
  it('borrar un producto del stand devuelve el crédito: una foto de prueba nunca cuesta', () => {
    let e = descontarStand(estadoInicial(15), ['a', 'b']);
    e = devolverProducto(e, 'a', false);
    expect(e.saldo).toBe(14);
    expect(e.pendientes).toEqual(['b']);
    // si ya se había informado al servidor, se pide la devolución
    e = reconciliar(e, { informados: ['b'], saldoServidor: 14 });
    e = devolverProducto(e, 'b', true);
    expect(e.saldo).toBe(15);
    expect(e.devueltos).toEqual(['b']);
  });
  it('al reconciliar, gana el saldo del servidor y lo informado deja de estar pendiente', () => {
    let e = descontarStand(estadoInicial(15), ['a', 'b', 'c']);
    e = reconciliar(e, { informados: ['a', 'b', 'c'], saldoServidor: 5 });
    expect(e.saldo).toBe(5);
    expect(e.pendientes).toEqual([]);
    expect(saldoVisible(e)).toBe(5);
  });
  it('sin señal el saldo local sigue bajando y se conserva lo pendiente', () => {
    let e = descontarStand(estadoInicial(2), ['a', 'b', 'c']);
    expect(e.saldo).toBe(-1);
    e = reconciliar(e, { informados: [], saldoServidor: undefined });
    expect(e.saldo).toBe(-1);
    expect(e.pendientes).toHaveLength(3);
  });
});
