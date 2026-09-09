import { describe, it, expect, vi } from 'vitest';

vi.mock('../../db.js', () => ({ default: { settings: { get: async () => null, put: async () => {}, delete: async () => {} } } }));
const { tieneContenido, describirBorrador, leerBorrador, guardarBorrador, borrarBorrador, CLAVE_BORRADOR } = await import('../borradorCaptura.js');

const fakeStore = () => {
  const rows = new Map();
  return { rows, settings: { get: async (k) => rows.get(k) || undefined, put: async (r) => { rows.set(r.key, r); }, delete: async (k) => { rows.delete(k); } } };
};

describe('tieneContenido', () => {
  it('vale la pena conservar si hay productos, tarjeta o nombre de proveedor', () => {
    expect(tieneContenido({ items: [{}] })).toBe(true);
    expect(tieneContenido({ items: [], cardPhoto: 'data:...' })).toBe(true);
    expect(tieneContenido({ items: [], supplierName: 'Shenzhen' })).toBe(true);
    expect(tieneContenido({ items: [], supplierName: '  ' })).toBe(false);
    expect(tieneContenido(null)).toBe(false);
  });
});

describe('describirBorrador', () => {
  it('dice qué hay y desde cuándo', () => {
    const ahora = 10 * 60000;
    expect(describirBorrador({ items: [{}, {}, {}], supplierName: 'Shenzhen Glass', savedAt: 0 }, ahora)).toEqual({ que: '3 productos y la tarjeta de Shenzhen Glass', hace: 'hace 10 min' });
    expect(describirBorrador({ items: [{}], cardPhoto: 'x', savedAt: ahora }, ahora)).toEqual({ que: '1 producto y la tarjeta del proveedor', hace: 'recién' });
    expect(describirBorrador({ items: [{}], savedAt: ahora - 3 * 3600000 }, ahora).hace).toBe('hace 3 h');
  });
});

describe('guardar / leer / borrar', () => {
  it('guarda con fecha y se recupera; si queda vacío, se borra solo', async () => {
    const s = fakeStore();
    expect(await guardarBorrador({ items: [{ id: 'a', photos: ['p'] }], supplierName: 'X' }, s)).toBe(true);
    const b = await leerBorrador(s);
    expect(b.items).toHaveLength(1);
    expect(b.savedAt).toBeGreaterThan(0);
    expect(await guardarBorrador({ items: [], supplierName: '' }, s)).toBe(false);
    expect(await leerBorrador(s)).toBeNull();
  });
  it('borrar deja la clave vacía', async () => {
    const s = fakeStore();
    await guardarBorrador({ items: [{}] }, s);
    await borrarBorrador(s);
    expect(s.rows.has(CLAVE_BORRADOR)).toBe(false);
  });
});
