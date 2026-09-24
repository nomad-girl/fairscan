import { useState, useEffect, useCallback } from 'react';
import { supabase, signIn, signUp, signOut, onAuthStateChange, getSession, signInAnonymously, convertirCuenta, resetPassword, updatePassword } from '../lib/supabase.js';

const CLAVE_CIERRE = 'fairscan_cerro_sesion';
const recordarCierreDeSesion = () => { try { localStorage.setItem(CLAVE_CIERRE, '1'); } catch { /* modo privado */ } };
const olvidarCierreDeSesion = () => { try { localStorage.removeItem(CLAVE_CIERRE); } catch { /* modo privado */ } };
export const cerroSesionAProposito = () => { try { return localStorage.getItem(CLAVE_CIERRE) === '1'; } catch { return false; } };
// Este dispositivo ya tuvo una cuenta real (24/09, caso Lucas): si la sesión se pierde (el token vence o iOS
// limpia el almacenamiento), corresponde el login, no una sesión nueva sin cuenta que muestra el catálogo vacío
// y hace creer que los datos desaparecieron.
const CLAVE_TUVO_CUENTA = 'fairscan_tuvo_cuenta';
export const tuvoCuenta = () => { try { return localStorage.getItem(CLAVE_TUVO_CUENTA) === '1'; } catch { return false; } };
const recordarCuenta = (u) => { if (u && !u.is_anonymous) { try { localStorage.setItem(CLAVE_TUVO_CUENTA, '1'); } catch { /* modo privado */ } } };

export default function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check existing session
    getSession().then(async ({ data }) => {
      let u = data.session?.user ?? null;
      // Sin sesión: se entra con una sesión anónima (4.2). Si el panel no lo
      // permite o no hay señal, queda null y aparece el login.
      // Pero NO después de que una cuenta real cerró sesión a propósito: en ese
      // caso corresponde el login, no una sesión nueva sin cuenta (hallazgo 3:
      // esa sesión anónima contaba como "otra usuaria" y vaciaba el teléfono).
      recordarCuenta(u);
      if (!u && !cerroSesionAProposito() && !tuvoCuenta()) {
        try { u = (await signInAnonymously()).user ?? null; } catch { u = null; }
      }
      setUser(u);
      setLoading(false);
    }).catch(() => {
      // Network error (e.g. AuthRetryableFetchError) — keep user null, let retry on reconnect
      setLoading(false);
    });

    // Listen for auth changes (login, logout, token refresh)
    const { data: { subscription } } = onAuthStateChange((_event, session) => {
      recordarCuenta(session?.user ?? null);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignIn = useCallback(async (email, password) => {
    const r = await signIn(email, password);
    olvidarCierreDeSesion();
    return r;
  }, []);

  const handleSignUp = useCallback(async (email, password, displayName, teamName, marketingOptIn = false, rubro = null) => {
    const r = await signUp(email, password, displayName, teamName, marketingOptIn, rubro);
    olvidarCierreDeSesion();
    return r;
  }, []);

  const handleConvertir = useCallback(async (email, password, displayName, teamName, marketingOptIn = false, rubro = null) => {
    return convertirCuenta(email, password, displayName, teamName, marketingOptIn, rubro);
  }, []);

  const handleSignOut = useCallback(async () => {
    recordarCierreDeSesion();
    await signOut();
    setUser(null);
  }, []);

  // Recuperación de contraseña (21/09): el link del mail trae type=recovery; la app pide la nueva.
  const [recuperando, setRecuperando] = useState(() => typeof window !== 'undefined' && /type=recovery/.test(window.location.hash || ''));
  useEffect(() => {
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((event) => { if (event === 'PASSWORD_RECOVERY') setRecuperando(true); });
    return () => data?.subscription?.unsubscribe?.();
  }, []);
  const recuperar = async (email) => resetPassword(email);
  const cambiarContrasena = async (password) => { await updatePassword(password); setRecuperando(false); if (typeof window !== 'undefined') window.history.replaceState(null, '', window.location.pathname); };
  return { user, loading, esAnonima: !!user?.is_anonymous, signIn: handleSignIn, signUp: handleSignUp, convertir: handleConvertir, signOut: handleSignOut, recuperar, cambiarContrasena, recuperando };
}
