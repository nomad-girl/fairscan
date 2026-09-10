import { describe, it, expect } from 'vitest';
import { traerTodo } from '../paginado.js';

const filas = (n) => Array.from({ length: n }, (_, i) => ({ id: i }));

describe('traerTodo: bajar de a páginas (PostgREST corta en 1.000)', () => {
  it('trae todo cuando hay más de una página', async () => {
    const total = 2345;
    const pedidos = [];
    const r = await traerTodo(async (desde, hasta) => {
      pedidos.push([desde, hasta]);
      return { data: filas(total).slice(desde, hasta + 1), error: null };
    });
    expect(r.error).toBeNull();
    expect(r.data).toHaveLength(total);
    expect(pedidos).toEqual([[0, 999], [1000, 1999], [2000, 2999]]);
  });

  it('con menos de una página hace un solo pedido', async () => {
    let n = 0;
    const r = await traerTodo(async (d, h) => { n++; return { data: filas(12).slice(d, h + 1), error: null }; });
    expect(r.data).toHaveLength(12);
    expect(n).toBe(1);
  });

  it('exactamente 1.000 filas: pide una segunda página vacía y termina', async () => {
    let n = 0;
    const r = await traerTodo(async (d, h) => { n++; return { data: filas(1000).slice(d, h + 1), error: null }; });
    expect(r.data).toHaveLength(1000);
    expect(n).toBe(2);
  });

  it('si una página falla, devuelve lo que trajo y el error', async () => {
    const r = await traerTodo(async (d) => d === 0 ? { data: filas(1000), error: null } : { data: null, error: { message: 'x' } });
    expect(r.data).toHaveLength(1000);
    expect(r.error).toEqual({ message: 'x' });
  });

  it('data null se trata como página vacía', async () => {
    const r = await traerTodo(async () => ({ data: null, error: null }));
    expect(r.data).toEqual([]);
  });
});
