/**
 * Cuando la llave maestra del servidor está mal (pegada con error, o de otro
 * proyecto), Supabase contesta "Invalid API key". Eso le llegó tal cual a Nati el
 * 08/09. Este test fija que el endpoint lo traduzca a un mensaje que diga qué pasa
 * y dónde se arregla, con un 503 (problema del servidor), no un 500 genérico.
 *
 * No se simula el cliente de Supabase (la función lo carga con `require`, fuera
 * del alcance de vi.mock): se simula lo que el servidor contesta, por URL, con
 * objetos Response reales. Así el cliente de verdad recorre su camino de error.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { handler } from '../delete-account.js';

const json = (body, status) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('delete-account con la llave del servidor mal configurada', () => {
  beforeEach(() => {
    process.env.AUTH_MODE = 'enforce';
    process.env.VITE_SUPABASE_URL = 'https://retpaxynglfwruwagccw.supabase.co';
    process.env.VITE_SUPABASE_ANON_KEY = 'anon';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_de_otro_proyecto';
    vi.stubGlobal('fetch', async (url) => {
      const u = String(url);
      // La sesión de la usuaria es válida: el guard pasa.
      if (u.includes('/auth/v1/user')) return json({ id: 'u1', email: 'nati@example.com' }, 200);
      // La base rechaza la llave maestra, tal cual lo hace el gateway real.
      return json({ message: 'Invalid API key', hint: 'Double check your API key.' }, 401);
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('traduce "Invalid API key" a un 503 que dice qué revisar', async () => {
    const res = await handler({
      httpMethod: 'POST',
      headers: { authorization: 'Bearer sesion-valida-config' },
      body: '{"preview":true}',
    });
    expect(res.statusCode).toBe(503);
    const { error } = JSON.parse(res.body);
    expect(error).toMatch(/llave del servidor/i);
    expect(error).toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
    expect(error).not.toMatch(/Invalid API key/);
  });
});
