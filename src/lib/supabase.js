import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        lock: async (_name, _timeout, fn) => await fn(),
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export function isSupabaseConfigured() {
  return !!supabase;
}

// ─── Auth helpers ───

export async function signIn(email, password) {
  if (!supabase) throw new Error('Supabase no configurado');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

// marketingOptIn: la casilla de novedades del registro (desmarcada por defecto).
// Solo si la usuaria la marcó viaja el metadato `marketing_opt_in: 'true'`; el
// trigger de alta en Supabase lo convierte en `profiles.marketing_opt_in_at` con la
// hora actual, que es la prueba de CUÁNDO se dio el consentimiento (Ley 25.326).
export async function signUp(email, password, displayName, teamName, marketingOptIn = false, rubro = null) {
  if (!supabase) throw new Error('Supabase no configurado');
  const meta = { display_name: displayName, team_name: teamName };
  if (marketingOptIn) meta.marketing_opt_in = 'true';
  if (rubro) meta.rubro = rubro; // 4.7: el rubro viaja con la cuenta y la app aplica sus etiquetas
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: meta },
  });
  if (error) throw error;
  return data;
}

/**
 * Capturar sin cuenta (4.2): la identidad es una sesión anónima de Supabase, que
 * después se convierte en cuenta real conservando el mismo usuario y sus datos.
 * Si el panel de Supabase no tiene habilitados los ingresos anónimos, falla y la
 * app muestra el login de siempre.
 */
export async function signInAnonymously() {
  if (!supabase) throw new Error('Supabase no configurado');
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  return data;
}

/** Convierte la sesión anónima en cuenta real: mismo usuario, ahora con mail y contraseña. */
export async function convertirCuenta(email, password, displayName, teamName, marketingOptIn = false, rubro = null) {
  if (!supabase) throw new Error('Supabase no configurado');
  const data = { display_name: displayName, team_name: teamName };
  if (marketingOptIn) data.marketing_opt_in = 'true';
  if (rubro) data.rubro = rubro;
  const { data: res, error } = await supabase.auth.updateUser({ email, password, data });
  if (error) throw error;
  return res;
}

export async function signOut() {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export function onAuthStateChange(callback) {
  if (!supabase) return { data: { subscription: { unsubscribe: () => {} } } };
  return supabase.auth.onAuthStateChange(callback);
}

export async function getSession() {
  if (!supabase) return { data: { session: null } };
  return supabase.auth.getSession();
}
