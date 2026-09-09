import { describe, it, expect, beforeEach, vi } from 'vitest';

// Pieza 1.15: el consentimiento de novedades viaja como metadato del alta y SOLO
// cuando la casilla está marcada. El trigger de Supabase lo convierte en
// `profiles.marketing_opt_in_at`, así que si mandáramos 'false' o la clave vacía
// podríamos terminar registrando un consentimiento que nunca se dio.
const authSignUp = vi.fn(async () => ({ data: { user: { id: 'u1' }, session: null }, error: null }));
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ auth: { signUp: authSignUp } }),
}));

vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon');

const { signUp } = await import('../supabase.js');

beforeEach(() => authSignUp.mockClear());

describe('signUp · casilla de novedades', () => {
  it('con la casilla marcada manda marketing_opt_in = "true" (texto, como espera el trigger)', async () => {
    await signUp('a@b.com', 'secreto1', 'Ana', 'Mi equipo', true);
    expect(authSignUp).toHaveBeenCalledTimes(1);
    const arg = authSignUp.mock.calls[0][0];
    expect(arg.email).toBe('a@b.com');
    expect(arg.options.data.marketing_opt_in).toBe('true');
    expect(arg.options.data.display_name).toBe('Ana');
    expect(arg.options.data.team_name).toBe('Mi equipo');
  });

  it('sin marcar, la clave NO viaja (ni como false ni vacía)', async () => {
    await signUp('a@b.com', 'secreto1', 'Ana', 'Mi equipo', false);
    const arg = authSignUp.mock.calls[0][0];
    expect('marketing_opt_in' in arg.options.data).toBe(false);
  });

  it('si no se pasa el parámetro (llamadas viejas), tampoco viaja', async () => {
    await signUp('a@b.com', 'secreto1', 'Ana', 'Mi equipo');
    const arg = authSignUp.mock.calls[0][0];
    expect('marketing_opt_in' in arg.options.data).toBe(false);
  });
});
