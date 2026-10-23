import { describe, it, expect, vi, beforeEach } from 'vitest';

const nativo = { evento: vi.fn(), compra: vi.fn() };
const cap = { nativa: true, plataforma: 'android' };
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => cap.nativa, getPlatform: () => cap.plataforma },
  registerPlugin: () => nativo,
}));
const { metaEvento, metaCompra, primerEscaneo } = await import('../metaEventos.js');

const memoria = () => { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };

describe('metaEventos', () => {
  beforeEach(() => { nativo.evento.mockReset().mockResolvedValue(undefined); nativo.compra.mockReset().mockResolvedValue(undefined); cap.nativa = true; cap.plataforma = 'android'; });

  it('manda el evento al plugin en Android', async () => {
    expect(await metaEvento('fs_escaneos_agotados', { bloqueados: 2 })).toBe(true);
    expect(nativo.evento).toHaveBeenCalledWith({ nombre: 'fs_escaneos_agotados', params: { bloqueados: 2 } });
  });
  it('en la web y en iOS (por ahora) no hace nada', async () => {
    cap.nativa = false; expect(await metaEvento('x')).toBe(false);
    cap.nativa = true; cap.plataforma = 'ios'; expect(await metaEvento('x')).toBe(false);
    expect(nativo.evento).not.toHaveBeenCalled();
  });
  it('si el plugin falla, falla en silencio', async () => {
    nativo.evento.mockRejectedValue(new Error('sin red'));
    await expect(metaEvento('x')).resolves.toBe(false);
  });
  it('la compra lleva valor numérico y moneda; sin valor válido no manda', async () => {
    expect(await metaCompra('19.99', 'USD', { pack: 'pack_500' })).toBe(true);
    expect(nativo.compra).toHaveBeenCalledWith({ valor: 19.99, moneda: 'USD', params: { pack: 'pack_500' } });
    expect(await metaCompra(null)).toBe(false); expect(await metaCompra(0)).toBe(false);
  });
  it('el primer escaneo se manda una sola vez por instalación', async () => {
    const store = memoria();
    expect(await primerEscaneo(store)).toBe(true);
    expect(await primerEscaneo(store)).toBe(false);
    expect(nativo.evento).toHaveBeenCalledTimes(1);
    expect(nativo.evento).toHaveBeenCalledWith({ nombre: 'fs_primer_escaneo', params: {} });
  });
});
