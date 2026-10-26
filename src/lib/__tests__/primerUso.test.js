import { describe, it, expect, vi } from 'vitest';

vi.mock('../supabase.js', () => ({ supabase: null }));
vi.mock('@capacitor/core', () => ({ Capacitor: { getPlatform: () => 'android' } }));

const { anotar, vaciarCola, fila, pareceChina, instalacion } = await import('../primerUso.js');

function memoria() {
  const m = new Map();
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), _m: m };
}
function cliente({ error = null, sesion = true } = {}) {
  const insert = vi.fn(async () => ({ error }));
  return { insert, auth: { getSession: async () => ({ data: { session: sesion ? {} : null } }) }, from: () => ({ insert }) };
}
const cola = s => JSON.parse(s.getItem('fs_eventos_cola') || '[]');

describe('primer uso', () => {
  it('arma la fila sin datos personales, con plataforma e instalación', () => {
    const s = memoria();
    const f = fila('empezar', { conCuenta: false }, s);
    expect(f).toMatchObject({ nombre: 'empezar', datos: { conCuenta: false }, plataforma: 'android' });
    expect(f.instalacion).toBe(instalacion(s)); // la misma instalación de una vez para la otra
  });

  it('lo de "una vez" se anota una sola vez por instalación', () => {
    const s = memoria();
    expect(anotar('primera_foto', {}, { unaVez: true, store: s, cliente: null })).toBe(true);
    expect(anotar('primera_foto', {}, { unaVez: true, store: s, cliente: null })).toBe(false);
    expect(cola(s)).toHaveLength(1);
  });

  it('manda la cola y la vacía', async () => {
    const s = memoria(); const c = cliente();
    anotar('empezar', {}, { store: s, cliente: null });
    anotar('camara_ok', {}, { store: s, cliente: null });
    expect(await vaciarCola({ store: s, cliente: c })).toBe(2);
    expect(c.insert).toHaveBeenCalledTimes(1);
    expect(cola(s)).toHaveLength(0);
  });

  it('sin sesión no manda y guarda', async () => {
    const s = memoria(); const c = cliente({ sesion: false });
    anotar('empezar', {}, { store: s, cliente: null });
    expect(await vaciarCola({ store: s, cliente: c })).toBe(0);
    expect(cola(s)).toHaveLength(1);
  });

  it('si la tabla todavía no existe, guarda la cola para después', async () => {
    const s = memoria(); const c = cliente({ error: { code: 'PGRST205', message: 'Could not find the table' } });
    anotar('empezar', {}, { store: s, cliente: null });
    await vaciarCola({ store: s, cliente: c });
    expect(cola(s)).toHaveLength(1);
  });

  it('si la base lo rechaza por otra cosa, descarta (no reintenta para siempre)', async () => {
    const s = memoria(); const c = cliente({ error: { code: '42501', message: 'new row violates row-level security' } });
    anotar('empezar', {}, { store: s, cliente: null });
    await vaciarCola({ store: s, cliente: c });
    expect(cola(s)).toHaveLength(0);
  });

  it('la cola tiene tope', () => {
    const s = memoria();
    for (let i = 0; i < 50; i++) anotar('x' + i, {}, { store: s, cliente: null });
    expect(cola(s).length).toBeLessThanOrEqual(30);
  });

  it('reconoce China por la zona horaria (Hong Kong no: ahí Google anda)', () => {
    expect(pareceChina('Asia/Shanghai')).toBe(true);
    expect(pareceChina('Asia/Urumqi')).toBe(true);
    expect(pareceChina('Asia/Hong_Kong')).toBe(false);
    expect(pareceChina('America/Argentina/Buenos_Aires')).toBe(false);
  });
});
