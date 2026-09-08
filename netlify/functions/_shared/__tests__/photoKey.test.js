import { describe, it, expect } from 'vitest';
import { buildPhotoKey, isValidKind, randomToken } from '../photoKey.js';

const USER = '3f2a9c1e-1111-4222-8333-444455556666';

describe('buildPhotoKey', () => {
  it('arma tipo/usuario/token.ext', () => {
    expect(buildPhotoKey('products', USER, 'jpg', 'abcDEF123_-xyz')).toBe(`products/${USER}/abcDEF123_-xyz.jpg`);
    expect(buildPhotoKey('cards', USER, 'png', 't')).toBe(`cards/${USER}/t.png`);
  });

  it('el token es al azar y no se repite', () => {
    const a = randomToken(), b = randomToken();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9_-]{22}$/);
    const k1 = buildPhotoKey('products', USER), k2 = buildPhotoKey('products', USER);
    expect(k1).not.toBe(k2);
  });

  it('rechaza tipos, usuarios y extensiones que no son los esperados', () => {
    expect(() => buildPhotoKey('videos', USER)).toThrow(/inválido/);
    expect(() => buildPhotoKey('products', '../otra')).toThrow(/Usuario/);
    expect(() => buildPhotoKey('products', USER, 'exe')).toThrow(/Extensión/);
    expect(isValidKind('cards')).toBe(true);
    expect(isValidKind('photos')).toBe(false);
  });

  it('pasa la validación de nombres seguros del servidor', () => {
    const SAFE = /^[A-Za-z0-9][A-Za-z0-9._\-\/]{0,255}$/;
    const k = buildPhotoKey('cards', USER);
    expect(k).toMatch(SAFE);
    expect(k.includes('..')).toBe(false);
  });
});
