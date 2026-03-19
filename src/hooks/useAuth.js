import { useState, useEffect, useCallback } from 'react';
import { signIn, signUp, signOut, onAuthStateChange, getSession } from '../lib/supabase.js';

export default function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check existing session
    getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
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

  const handleSignUp = useCallback(async (email, password, displayName) => {
    return signUp(email, password, displayName);
  }, []);

  const handleSignOut = useCallback(async () => {
    await signOut();
    setUser(null);
  }, []);

  return { user, loading, signIn: handleSignIn, signUp: handleSignUp, signOut: handleSignOut };
}
