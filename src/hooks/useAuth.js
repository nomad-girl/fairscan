import { useState, useEffect, useCallback } from 'react';
import { signIn, signUp, signOut, onAuthStateChange, getSession, signInAnonymously, convertirCuenta } from '../lib/supabase.js';

export default function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check existing session
    getSession().then(async ({ data }) => {
      let u = data.session?.user ?? null;
      // Sin sesión: se entra con una sesión anónima (4.2). Si el panel no lo
      // permite o no hay señal, queda null y aparece el login.
      if (!u) {
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
    return signIn(email, password);
  }, []);

  const handleSignUp = useCallback(async (email, password, displayName, teamName, marketingOptIn = false) => {
    return signUp(email, password, displayName, teamName, marketingOptIn);
  }, []);

  const handleConvertir = useCallback(async (email, password, displayName, teamName, marketingOptIn = false) => {
    return convertirCuenta(email, password, displayName, teamName, marketingOptIn);
  }, []);

  const handleSignOut = useCallback(async () => {
    await signOut();
    setUser(null);
  }, []);

  return { user, loading, esAnonima: !!user?.is_anonymous, signIn: handleSignIn, signUp: handleSignUp, convertir: handleConvertir, signOut: handleSignOut };
}
