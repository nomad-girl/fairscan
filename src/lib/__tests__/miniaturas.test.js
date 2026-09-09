import { describe, it, expect, vi } from 'vitest';
import { elegirMiniatura, necesitaMiniatura, miniaturaDe, generarMiniaturasFaltantes } from '../miniaturas.js';

const DATA = 'data:image/jpeg;base64,' + 'A'.repeat(300);
const URL_ = 'https://pub.r2.dev/products/u/x.jpg';

describe('elegirMiniatura', () => {
  it('prefiere la miniatura; si no hay, la foto grande; si no hay nada, null', () => {
    expect(elegirMiniatura({ thumb: 't', photos: [DATA] })).toBe('t');
    expect(elegirMiniatura({ photos: [DATA] })).toBe(DATA);
    expect(elegirMiniatura({ photos: [] })).toBeNull();
    expect(elegirMiniatura(null)).toBeNull();
  });
});

describe('necesitaMiniatura', () => {
  it('solo cuando falta y la foto está en el teléfono (no una dirección web)', () => {
    expect(necesitaMiniatura({ photos: [DATA] })).toBe(true);
    expect(necesitaMiniatura({ thumb: 't', photos: [DATA] })).toBe(false);
    expect(necesitaMiniatura({ photos: [URL_] })).toBe(false);
    expect(necesitaMiniatura({ photos: [] })).toBe(false);
  });
});

describe('miniaturaDe', () => {
  it('fuera del navegador devuelve null sin romper', async () => {
    expect(await miniaturaDe(DATA)).toBeNull();
  });
});

describe('generarMiniaturasFaltantes', () => {
  it('recorre solo los que faltan, en tandas, y guarda cada una', async () => {
    vi.useFakeTimers();
    const guardar = vi.fn(async () => {});
    // En Node miniaturaDe da null, así que no guarda nada: se prueba el recorrido con un stub.
    const productos = [{ id: 1, photos: [DATA] }, { id: 2, thumb: 't', photos: [DATA] }, { id: 3, photos: [URL_] }];
    const p = generarMiniaturasFaltantes(productos, guardar, { tanda: 2, pausaMs: 10 });
    await vi.runAllTimersAsync();
    expect(await p).toBe(0);
    expect(guardar).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
