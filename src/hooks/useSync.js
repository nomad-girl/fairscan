import { useState, useEffect, useCallback } from 'react';
import syncEngine from '../lib/syncEngine.js';
import { isSupabaseConfigured } from '../lib/supabase.js';

/**
 * React hook for sync state management.
 * Provides room state, sync status, and actions (create/join/leave room).
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

  const createRoom = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const code = await syncEngine.createRoom();
      return code;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const joinRoom = useCallback(async (code) => {
    setIsLoading(true);
    setError(null);
    try {
      await syncEngine.joinRoom(code);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const leaveRoom = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await syncEngine.leaveRoom();
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
    roomId: syncState.roomId,
    roomCode: syncState.roomCode,
    isOnline: syncState.isOnline,
    isSyncing: syncState.isSyncing,
    lastSyncAt: syncState.lastSyncAt,
    lastError: syncState.lastError,
    lastPullCounts: syncState.lastPullCounts,
    isConfigured: isSupabaseConfigured(),
    isLoading,
    error,
    // Actions
    createRoom,
    joinRoom,
    leaveRoom,
    forceSync,
    clearError: () => setError(null),
  };
}
