import { describe, it, expect } from 'vitest';
import { esUrlNueva, keyDeUrl, extDeKey, carpetaPorEquipo, fotosViejas, copySource } from '../migracionFotos.js';

const PUB = 'https://pub-abc.r2.dev';
const NUEVA = `${PUB}/products/7b5bdc7c-2a20-408b-98f9-dd890c6447ca/uCnS-DMbWb8LeKW3Vh_ZTg.jpg`;
const VIEJA = `${PUB}/photos/shenzhen-glass/42_1.jpg`;

describe('esUrlNueva', () => {
  it('reconoce el esquema nuevo y rechaza el viejo', () => {
    expect(esUrlNueva(NUEVA)).toBe(true);
    expect(esUrlNueva(VIEJA)).toBe(false);
    expect(esUrlNueva(`${PUB}/cards/shenzhen-glass_9.jpg`)).toBe(false);
    expect(esUrlNueva(`${PUB}/cards/ea7cb05d-d904-458f-bb49-63bd722c0bac/abcdefghijklmnopqrstuv.png`)).toBe(true);
    expect(esUrlNueva(null)).toBe(false);
  });
});

describe('keyDeUrl / extDeKey / copySource', () => {
  it('saca la clave del bucket y respeta acentos', () => {
    expect(keyDeUrl(VIEJA)).toBe('photos/shenzhen-glass/42_1.jpg');
    expect(keyDeUrl(`${PUB}/cards/caf%C3%A9_3.jpg`)).toBe('cards/café_3.jpg');
    expect(keyDeUrl('no es url')).toBeNull();
    expect(extDeKey('a/b.PNG')).toBe('png');
    expect(extDeKey('a/b.jpg')).toBe('jpg');
    expect(copySource('fairscan', 'cards/café 3.jpg')).toBe('/fairscan/cards/caf%C3%A9%203.jpg');
  });
});

describe('carpetaPorEquipo', () => {
  it('elige la administradora; si no hay miembros, el id del equipo', () => {
    const f = carpetaPorEquipo([
      { team_id: 't1', user_id: 'u-member', role: 'member' },
      { team_id: 't1', user_id: 'u-admin', role: 'admin' },
      { team_id: 't2', user_id: 'u-solo', role: 'member' },
    ]);
    expect(f('t1')).toBe('u-admin');
    expect(f('t2')).toBe('u-solo');
    expect(f('t-archivada')).toBe('t-archivada');
  });
});

describe('fotosViejas', () => {
  it('lista solo las fotos con esquema viejo, con su posición', () => {
    expect(fotosViejas({ photo_urls: [VIEJA, NUEVA, null, VIEJA] }, 'products')).toEqual([{ i: 0, url: VIEJA }, { i: 3, url: VIEJA }]);
    expect(fotosViejas({ card_photo_url: `${PUB}/cards/x_1.jpg` }, 'suppliers')).toEqual([{ i: 0, url: `${PUB}/cards/x_1.jpg` }]);
    expect(fotosViejas({ card_photo_url: NUEVA.replace('/products/', '/cards/') }, 'suppliers')).toEqual([]);
    expect(fotosViejas({}, 'products')).toEqual([]);
  });
});
