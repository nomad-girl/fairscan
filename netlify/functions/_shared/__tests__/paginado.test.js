import { describe, it, expect } from 'vitest';
import { traerTodo } from '../paginado.js';

const filas = (n) => Array.from({ length: n }, (_, i) => ({ id: i }));

describe('traerTodo (funciones): las fotos a partir de la 1.001 también se borran', () => {
  it('trae 2.345 filas en tres páginas', async () => {
    const pedidos = [];
    const r = await traerTodo(async (d, h) => { pedidos.push([d, h]); return { data: filas(2345).slice(d, h + 1), error: null }; });
    expect(r.data).toHaveLength(2345);
    expect(pedidos).toEqual([[0, 999], [1000, 1999], [2000, 2999]]);
  });
  it('si una página falla devuelve lo traído y el error', async () => {
    const r = await traerTodo(async (d) => d === 0 ? { data: filas(1000), error: null } : { data: null, error: { message: 'x' } });
    expect(r.data).toHaveLength(1000);
    expect(r.error).toEqual({ message: 'x' });
  });
});
