/**
 * Un solo esquema de nombres para las fotos en la nube. Antes había dos que no
 * coincidían; estos tests fijan el que quedó, para que nadie lo vuelva a
 * escribir a mano.
 */
import { describe, it, expect } from 'vitest';
import { productPhotoKey, cardPhotoKey } from '../photoKeys.js';
import { slugify } from '../slugify.js';

describe('slugify', () => {
  it('saca acentos, baja a minúsculas y deja solo letras, números y guiones', () => {
    expect(slugify('Shenzhen Glass Co.')).toBe('shenzhen-glass-co');
    expect(slugify('Café & Té')).toBe('cafe-te');
  });
  it('nunca devuelve vacío', () => {
    expect(slugify('')).toBe('sin-nombre');
    expect(slugify(null)).toBe('sin-nombre');
    expect(slugify('!!!')).toBe('sin-nombre');
  });
  it('corta a 50 caracteres', () => {
    expect(slugify('a'.repeat(80)).length).toBe(50);
  });
});

describe('productPhotoKey', () => {
  it('numera desde 1 aunque el índice empiece en 0 (como las fotos ya subidas)', () => {
    expect(productPhotoKey('Shenzhen Glass', 42, 0)).toBe('photos/shenzhen-glass/42_1.jpg');
    expect(productPhotoKey('Shenzhen Glass', 42, 1)).toBe('photos/shenzhen-glass/42_2.jpg');
  });
  it('sin proveedor cae en "product"', () => {
    expect(productPhotoKey(null, 'uuid-x', 0)).toBe('photos/product/uuid-x_1.jpg');
  });
  it('pasa la validación del servidor (upload-photo)', () => {
    const SAFE = /^[A-Za-z0-9][A-Za-z0-9._\-\/]{0,255}$/;
    for (const k of [productPhotoKey('Café & Té', 7, 3), cardPhotoKey('Ünïcode Ltd.', 'abc')]) {
      expect(k).toMatch(SAFE);
      expect(k.includes('..')).toBe(false);
    }
  });
});

describe('cardPhotoKey', () => {
  it('una tarjeta por proveedor, en su carpeta', () => {
    expect(cardPhotoKey('Shenzhen Glass', 9)).toBe('cards/shenzhen-glass_9.jpg');
  });
  it('sin nombre cae en "card"', () => {
    expect(cardPhotoKey('', 9)).toBe('cards/card_9.jpg');
  });
});
