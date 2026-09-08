import { describe, it, expect } from 'vitest';
import { esFotoLocal, fotosSinSubir, tarjetaSinSubir, esperaReintento } from '../fotosPendientes.js';

const DATA = 'data:image/jpeg;base64,/9j/4AAQ';
const URL_ = 'https://pub.r2.dev/products/u/x.jpg';

describe('esFotoLocal', () => {
  it('distingue una foto en el teléfono de una dirección web', () => {
    expect(esFotoLocal(DATA)).toBe(true);
    expect(esFotoLocal('A'.repeat(300))).toBe(true);
    expect(esFotoLocal(URL_)).toBe(false);
    expect(esFotoLocal(null)).toBe(false);
    expect(esFotoLocal('')).toBe(false);
  });
});

describe('fotosSinSubir', () => {
  it('devuelve los índices que faltan, respetando los que ya subieron', () => {
    const p = { photos: [DATA, DATA, DATA], photoUrls: [URL_, null, undefined] };
    expect(fotosSinSubir(p)).toEqual([1, 2]);
  });
  it('un producto sin fotos locales no tiene nada pendiente', () => {
    expect(fotosSinSubir({ photos: [URL_, URL_] })).toEqual([]);
    expect(fotosSinSubir({})).toEqual([]);
    expect(fotosSinSubir(null)).toEqual([]);
  });
  it('todo subido → vacío', () => {
    expect(fotosSinSubir({ photos: [DATA], photoUrls: [URL_] })).toEqual([]);
  });
});

describe('tarjetaSinSubir', () => {
  it('solo cuando hay tarjeta local y ninguna dirección en la nube', () => {
    expect(tarjetaSinSubir({ cardPhoto: DATA })).toBe(true);
    expect(tarjetaSinSubir({ cardPhoto: DATA, cardPhotoUrl: URL_ })).toBe(false);
    expect(tarjetaSinSubir({ cardPhoto: URL_ })).toBe(false);
    expect(tarjetaSinSubir({})).toBe(false);
  });
});

describe('esperaReintento', () => {
  it('crece con los fallos y tiene techo de 5 minutos', () => {
    expect(esperaReintento(0)).toBe(5000);
    expect(esperaReintento(1)).toBe(10000);
    expect(esperaReintento(3)).toBe(40000);
    expect(esperaReintento(20)).toBe(300000);
  });
});
