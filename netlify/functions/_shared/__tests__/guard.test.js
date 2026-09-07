import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { guard } from '../guard.js';

// Cada test usa un token distinto: el guard cachea por token y cuenta pedidos por
// usuario en memoria de módulo, así que compartirlos los haría interferir entre sí.
let n = 0;
const freshToken = () => `token-${Date.now()}-${n++}`;

function makeEvent({ method = 'POST', origin, token, body = '{}' } = {}) {
  const headers = {};
  if (origin) headers.origin = origin;
  if (token) headers.authorization = `Bearer ${token}`;
  return { httpMethod: method, headers, body };
}

/** Supabase contesta que el token es válido y devuelve un usuario. */
function supabaseSaysOk(userId = 'user-1', extra = {}) {
  return vi.fn(async () => ({
    ok: true,
    json: async () => ({ id: userId, email: 'nati@example.com', ...extra }),
  }));
}

/** Supabase rechaza el token. */
function supabaseSaysNo() {
  return vi.fn(async () => ({ ok: false, json: async () => ({}) }));
}

describe('guard', () => {
  beforeEach(() => {
    process.env.VITE_SUPABASE_URL = 'https://proyecto.supabase.co';
    process.env.VITE_SUPABASE_ANON_KEY = 'anon-key';
    process.env.AUTH_MODE = 'enforce';
    delete process.env.ALLOWED_ORIGINS;
    delete process.env.URL;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('CORS', () => {
    it('contesta el preflight sin pedir sesión', async () => {
      const { response } = await guard(makeEvent({ method: 'OPTIONS' }));
      expect(response.statusCode).toBe(204);
    });

    it('devuelve el origen cuando está permitido (iOS con Capacitor)', async () => {
      const { response } = await guard(makeEvent({ method: 'OPTIONS', origin: 'capacitor://localhost' }));
      expect(response.headers['Access-Control-Allow-Origin']).toBe('capacitor://localhost');
    });

    it('devuelve el origen del propio sitio de Netlify sin configurar nada', async () => {
      process.env.URL = 'https://fairscan.netlify.app';
      const { response } = await guard(makeEvent({ method: 'OPTIONS', origin: 'https://fairscan.netlify.app' }));
      expect(response.headers['Access-Control-Allow-Origin']).toBe('https://fairscan.netlify.app');
    });

    it('no autoriza un origen desconocido', async () => {
      const { response } = await guard(makeEvent({ method: 'OPTIONS', origin: 'https://sitio-ajeno.com' }));
      expect(response.headers['Access-Control-Allow-Origin']).toBeUndefined();
    });

    it('ya no usa el comodín "*"', async () => {
      const { response } = await guard(makeEvent({ method: 'OPTIONS', origin: 'https://sitio-ajeno.com' }));
      expect(response.headers['Access-Control-Allow-Origin']).not.toBe('*');
    });
  });

  describe('método y tamaño', () => {
    it('rechaza GET', async () => {
      const { response } = await guard(makeEvent({ method: 'GET' }));
      expect(response.statusCode).toBe(405);
    });

    it('rechaza un cuerpo más grande que el máximo, antes de verificar la sesión', async () => {
      const fetchMock = supabaseSaysOk();
      vi.stubGlobal('fetch', fetchMock);
      const { response } = await guard(
        makeEvent({ token: freshToken(), body: 'x'.repeat(3000) }),
        { maxBodyKB: 1 },
      );
      expect(response.statusCode).toBe(413);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('sesión', () => {
    it('rechaza un pedido sin token', async () => {
      const { response } = await guard(makeEvent({}));
      expect(response.statusCode).toBe(401);
    });

    it('rechaza un token que Supabase no reconoce', async () => {
      vi.stubGlobal('fetch', supabaseSaysNo());
      const { response } = await guard(makeEvent({ token: freshToken() }));
      expect(response.statusCode).toBe(401);
    });

    it('deja pasar un token válido y devuelve el usuario', async () => {
      vi.stubGlobal('fetch', supabaseSaysOk('user-abc'));
      const result = await guard(makeEvent({ token: freshToken() }));
      expect(result.response).toBeUndefined();
      expect(result.user.id).toBe('user-abc');
      expect(result.user.isAnonymous).toBe(false);
    });

    it('acepta sesiones anónimas — lo que va a necesitar "capturar sin cuenta" (4.2)', async () => {
      vi.stubGlobal('fetch', supabaseSaysOk('user-anon', { is_anonymous: true }));
      const result = await guard(makeEvent({ token: freshToken() }));
      expect(result.response).toBeUndefined();
      expect(result.user.isAnonymous).toBe(true);
    });

    it('cachea el token: no le vuelve a preguntar a Supabase', async () => {
      const fetchMock = supabaseSaysOk();
      vi.stubGlobal('fetch', fetchMock);
      const token = freshToken();
      await guard(makeEvent({ token }));
      await guard(makeEvent({ token }));
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('no deja pasar si Supabase no está configurado (falla cerrado)', async () => {
      delete process.env.VITE_SUPABASE_URL;
      delete process.env.SUPABASE_URL;
      const { response } = await guard(makeEvent({ token: freshToken() }));
      expect(response.statusCode).toBe(503);
    });

    it('con AUTH_MODE=warn deja pasar sin sesión (interruptor de emergencia)', async () => {
      process.env.AUTH_MODE = 'warn';
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const result = await guard(makeEvent({}));
      expect(result.response).toBeUndefined();
      expect(warn).toHaveBeenCalled();
      warn.mockRestore();
    });
  });

  describe('tope de pedidos', () => {
    it('corta con 429 al pasarse del límite', async () => {
      vi.stubGlobal('fetch', supabaseSaysOk('user-topeado'));
      const token = freshToken();
      const opts = { bucket: `t${n}`, limit: 2, windowMs: 60_000 };

      expect((await guard(makeEvent({ token }), opts)).response).toBeUndefined();
      expect((await guard(makeEvent({ token }), opts)).response).toBeUndefined();

      const { response } = await guard(makeEvent({ token }), opts);
      expect(response.statusCode).toBe(429);
      expect(response.headers['Retry-After']).toBeDefined();
    });

    it('cuenta por usuario: uno topeado no afecta al otro', async () => {
      const token1 = freshToken();
      const token2 = freshToken();
      const bucket = `sep${n}`;
      const opts = { bucket, limit: 1, windowMs: 60_000 };

      vi.stubGlobal('fetch', supabaseSaysOk('usuario-1'));
      await guard(makeEvent({ token: token1 }), opts);
      expect((await guard(makeEvent({ token: token1 }), opts)).response.statusCode).toBe(429);

      vi.stubGlobal('fetch', supabaseSaysOk('usuario-2'));
      expect((await guard(makeEvent({ token: token2 }), opts)).response).toBeUndefined();
    });
  });
});
