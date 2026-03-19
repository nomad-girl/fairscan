import { useState, useEffect, useCallback } from 'react';
import syncEngine from '../lib/syncEngine.js';
import { isSupabaseConfigured } from '../lib/supabase.js';

/**
 * React hook for sync state management.
 * Provides team state, sync status, and actions.
 */
export default function useSync(reloadAll) {
  const [syncState, setSyncState] = useState(syncEngine.getState());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Wire up the reload callback so syncEngine can trigger React re-renders
  useEffect(() => {
    syncEngine.setReloadCallback(reloadAll);
    return () => syncEngine.setReloadCallback(null);
  }, [reloadAll]);

  // Subscribe to sync state changes
  useEffect(() => {
    const unsub = syncEngine.addListener(setSyncState);
    return unsub;
  }, []);

  const connectTeam = useCallback(async (teamId) => {
    setIsLoading(true);
    setError(null);
    try {
      await syncEngine.connectTeam(teamId);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const disconnectTeam = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await syncEngine.disconnectTeam();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const forceSync = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await syncEngine.pullAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    // State
    teamId: syncState.teamId,
    roomId: syncState.roomId, // backward compat
    isOnline: syncState.isOnline,
    isSyncing: syncState.isSyncing,
    lastSyncAt: syncState.lastSyncAt,
    lastError: syncState.lastError,
    lastPullCounts: syncState.lastPullCounts,
    isConfigured: isSupabaseConfigured(),
    isLoading,
    error,
    // Actions
    connectTeam,
    disconnectTeam,
    forceSync,
    clearError: () => setError(null),
  };
}
