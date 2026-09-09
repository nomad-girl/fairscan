import { describe, it, expect, vi, afterEach } from 'vitest';
import { esBinaria, dataUrlABinario, binarioADataUrl, aDataUrl, paraUI, paraGuardar, productoParaUI, productoParaGuardar, proveedorParaGuardar, tieneFotosEnTexto, sinDerivados, binarioAObjectUrl } from '../fotosBinario.js';

const DATA = 'data:image/jpeg;base64,' + btoa('hola foto');
afterEach(() => vi.unstubAllGlobals());

describe('ida y vuelta', () => {
  it('data URL → bytes → data URL sin perder nada', () => {
    const bin = dataUrlABinario(DATA);
    expect(esBinaria(bin)).toBe(true);
    expect(bin.type).toBe('image/jpeg');
    expect(new TextDecoder().decode(bin.data)).toBe('hola foto');
    expect(binarioADataUrl(bin)).toBe(DATA);
  });
  it('un data URL que no es base64 no se convierte', () => {
    expect(dataUrlABinario('data:text/plain,hola')).toBeNull();
    expect(paraGuardar('data:text/plain,hola')).toBe('data:text/plain,hola');
  });
  it('acepta bytes como Uint8Array además de ArrayBuffer', () => {
    const bin = { data: new TextEncoder().encode('xy'), type: 'image/png' };
    expect(binarioADataUrl(bin)).toBe('data:image/png;base64,' + btoa('xy'));
  });
});

describe('formas', () => {
  it('paraGuardar convierte solo data:; http y blob quedan igual', () => {
    expect(esBinaria(paraGuardar(DATA))).toBe(true);
    expect(paraGuardar('https://x/y.jpg')).toBe('https://x/y.jpg');
    expect(paraGuardar('blob:x')).toBe('blob:x');
  });
  it('paraUI convierte bytes en blob: y deja el resto', () => {
    vi.stubGlobal('URL', { createObjectURL: () => 'blob:fake', revokeObjectURL: () => {} });
    expect(paraUI(dataUrlABinario(DATA))).toBe('blob:fake');
    expect(paraUI('https://x/y.jpg')).toBe('https://x/y.jpg');
    const p = productoParaUI({ id: 1, photos: [dataUrlABinario(DATA), 'https://x/y.jpg'] });
    expect(p.photos).toEqual(['blob:fake', 'https://x/y.jpg']);
  });
  it('la dirección es estable entre lecturas del mismo registro y se recrea si cambia la foto', () => {
    let n = 0;
    vi.stubGlobal('URL', { createObjectURL: () => `blob:${++n}`, revokeObjectURL: () => {} });
    const bin = dataUrlABinario(DATA);
    expect(binarioAObjectUrl(bin, 'p:9:0')).toBe('blob:1');
    expect(binarioAObjectUrl(dataUrlABinario(DATA), 'p:9:0')).toBe('blob:1');
    const otra = dataUrlABinario('data:image/jpeg;base64,' + btoa('otra foto distinta'));
    expect(binarioAObjectUrl(otra, 'p:9:0')).toBe('blob:2');
  });
  it('productoParaGuardar / proveedorParaGuardar no tocan lo que ya está bien', () => {
    const p = { id: 1, photos: ['https://x/y.jpg'] };
    expect(productoParaGuardar(p)).toBe(p);
    const s = { id: 2, cardPhoto: 'https://x/c.jpg' };
    expect(proveedorParaGuardar(s)).toBe(s);
    expect(esBinaria(proveedorParaGuardar({ cardPhoto: DATA }).cardPhoto)).toBe(true);
    expect(tieneFotosEnTexto({ photos: [DATA] })).toBe(true);
    expect(tieneFotosEnTexto({ photos: ['https://x'] })).toBe(false);
  });
});

describe('aDataUrl', () => {
  it('devuelve base64 desde bytes o data:, y null para http', async () => {
    expect(await aDataUrl(dataUrlABinario(DATA))).toBe(DATA);
    expect(await aDataUrl(DATA)).toBe(DATA);
    expect(await aDataUrl('https://x/y.jpg')).toBeNull();
    expect(await aDataUrl(null)).toBeNull();
  });
});

describe('sinDerivados', () => {
  it('saca audio y miniatura, deja el resto', () => {
    expect(sinDerivados({ id: 1, thumb: 't', audio: {}, name: 'x' })).toEqual({ id: 1, name: 'x' });
  });
});
