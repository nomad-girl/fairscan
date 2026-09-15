import { useState, useEffect, useCallback } from 'react';
import { signIn, signUp, signOut, onAuthStateChange, getSession, signInAnonymously, convertirCuenta } from '../lib/supabase.js';

const CLAVE_CIERRE = 'fairscan_cerro_sesion';
const recordarCierreDeSesion = () => { try { localStorage.setItem(CLAVE_CIERRE, '1'); } catch { /* modo privado */ } };
const olvidarCierreDeSesion = () => { try { localStorage.removeItem(CLAVE_CIERRE); } catch { /* modo privado */ } };
export const cerroSesionAProposito = () => { try { return localStorage.getItem(CLAVE_CIERRE) === '1'; } catch { return false; } };

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
      if (!u && !cerroSesionAProposito()) {
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

  return { user, loading, esAnonima: !!user?.is_anonymous, signIn: handleSignIn, signUp: handleSignUp, convertir: handleConvertir, signOut: handleSignOut };
}
