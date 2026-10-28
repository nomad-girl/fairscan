import { describe, it, expect, vi } from 'vitest';

let plataforma = 'android';
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => plataforma !== 'web', getPlatform: () => plataforma },
  registerPlugin: () => ({ leer: async () => ({ referrer: 'utm_source=meta&utm_medium=anuncio&utm_campaign=canton_f3&fbclid=ABC' }) }),
}));

const { parsearOrigen, leerOrigen } = await import('../origenInstalacion.js');

function memoria() { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; }

describe('origen de la instalación', () => {
  it('traduce los utm a campos cortos y deja afuera lo que no conoce', () => {
    expect(parsearOrigen('utm_source=meta&utm_campaign=canton_f3&utm_content=reel_lucas&fbclid=X&otra=cosa'))
      .toEqual({ fuente: 'meta', campania: 'canton_f3', contenido: 'reel_lucas', fbclid: 'X' });
    expect(parsearOrigen('utm_source=google-play&utm_medium=organic')).toEqual({ fuente: 'google-play', medio: 'organic' });
    expect(parsearOrigen('')).toBeNull(); expect(parsearOrigen(null)).toBeNull(); expect(parsearOrigen('nada=aca')).toBeNull();
  });
  it('recorta cada valor a 80 caracteres', () => {
    expect(parsearOrigen('utm_source=' + 'a'.repeat(200)).fuente).toHaveLength(80);
  });
  it('en Android lee el Install Referrer por el plugin y lo guarda para la próxima vez', async () => {
    plataforma = 'android'; const s = memoria();
    expect(await leerOrigen({ store: s })).toEqual({ fuente: 'meta', medio: 'anuncio', campania: 'canton_f3', fbclid: 'ABC' });
    expect(s.getItem('fs_origen')).toContain('utm_campaign=canton_f3');
    const roto = { leer: async () => { throw new Error('sin Play'); } };
    expect(await leerOrigen({ store: s, plugin: roto })).toEqual({ fuente: 'meta', medio: 'anuncio', campania: 'canton_f3', fbclid: 'ABC' }); // ya guardado: no vuelve a preguntar
  });
  it('en Android sin referrer no anota nada y no lanza', async () => {
    plataforma = 'android'; const s = memoria();
    expect(await leerOrigen({ store: s, plugin: { leer: async () => ({ referrer: '' }) } })).toBeNull();
    expect(await leerOrigen({ store: s, plugin: { leer: async () => { throw new Error('x'); } } })).toBeNull();
    expect(s.getItem('fs_origen')).toBeNull();
  });
  it('en la web usa lo que dejó la landing en localStorage, o los utm de la URL', async () => {
    plataforma = 'web';
    const s = memoria(); s.setItem('fs_origen', 'utm_source=meta&utm_content=carrusel');
    expect(await leerOrigen({ store: s, url: '' })).toEqual({ fuente: 'meta', contenido: 'carrusel' });
    expect(await leerOrigen({ store: memoria(), url: '?utm_source=ig&fbclid=Z' })).toEqual({ fuente: 'ig', fbclid: 'Z' });
    expect(await leerOrigen({ store: memoria(), url: '?x=1' })).toBeNull();
  });
  it('en iPhone no hay origen (se mira en App Store Connect)', async () => {
    plataforma = 'ios';
    expect(await leerOrigen({ store: memoria() })).toBeNull();
  });
});
