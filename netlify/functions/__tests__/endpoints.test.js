/**
 * Que los cinco endpoints estén efectivamente cerrados.
 *
 * El test del guard prueba la lógica; éste prueba que **cada función la use**. Es la
 * regresión que importa: agregar un endpoint nuevo y olvidarse del guard reabre
 * exactamente el agujero de la auditoría (F6).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { handler as processImage } from '../process-image.js';
import { handler as processCard } from '../process-card.js';
import { handler as processAudio } from '../process-audio.js';
import { handler as uploadPhoto, isSafeKey } from '../upload-photo.js';
import { handler as proxyImage } from '../proxy-image.js';

const ENDPOINTS = [
  ['process-image', processImage],
  ['process-card', processCard],
  ['process-audio', processAudio],
  ['upload-photo', uploadPhoto],
  ['proxy-image', proxyImage],
];

const post = (body = '{}', headers = {}) => ({ httpMethod: 'POST', headers, body });

describe('endpoints', () => {
  beforeEach(() => {
    process.env.VITE_SUPABASE_URL = 'https://proyecto.supabase.co';
    process.env.VITE_SUPABASE_ANON_KEY = 'anon-key';
    process.env.AUTH_MODE = 'enforce';
    // Presentes para que, si algo pasara el guard, no falle por otra razón y el test
    // dé un falso positivo.
    process.env.ANTHROPIC_API_KEY = 'sk-de-mentira';
    process.env.R2_ACCOUNT_ID = 'x';
    process.env.R2_ACCESS_KEY_ID = 'x';
    process.env.R2_SECRET_ACCESS_KEY = 'x';
    process.env.R2_BUCKET_NAME = 'x';
  });

  afterEach(() => vi.unstubAllGlobals());

  it.each(ENDPOINTS)('%s rechaza un pedido sin sesión', async (_name, handler) => {
    const res = await handler(post());
    expect(res.statusCode).toBe(401);
  });

  it.each(ENDPOINTS)('%s rechaza GET', async (_name, handler) => {
    const res = await handler({ httpMethod: 'GET', headers: {}, body: null });
    expect(res.statusCode).toBe(405);
  });

  it.each(ENDPOINTS)('%s no responde con el comodín "*" en CORS', async (_name, handler) => {
    const res = await handler({ httpMethod: 'OPTIONS', headers: { origin: 'https://sitio-ajeno.com' } });
    expect(res.headers['Access-Control-Allow-Origin']).not.toBe('*');
  });

  it('upload-photo rechaza un nombre de archivo con ruta hacia arriba', async () => {
    vi.stubGlobal('fetch', async () => ({ ok: true, json: async () => ({ id: 'u1' }) }));
    const res = await uploadPhoto(post(
      JSON.stringify({ image: 'data:image/jpeg;base64,AAAA', key: '../../otro/lado.jpg' }),
      { authorization: 'Bearer valido-1' },
    ));
    expect(res.statusCode).toBe(400);
  });

  describe('nombres de archivo aceptados', () => {
    it.each([
      'photos/mi-proveedor/12_1.jpg',
      'cards/shenzhen-glass-co_34.jpg',
      'a.jpg',
    ])('acepta %s', (key) => expect(isSafeKey(key)).toBe(true));

    it.each([
      ['sube un nivel', '../../otro/lado.jpg'],
      ['ruta absoluta', '/etc/passwd'],
      ['barra doble', 'photos//x.jpg'],
      ['punto punto adentro', 'photos/../../x.jpg'],
      ['vacío', ''],
      ['no es texto', 42],
    ])('rechaza %s', (_caso, key) => expect(isSafeKey(key)).toBe(false));
  });
});
