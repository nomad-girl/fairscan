/**
 * Hook for syncing pending AI processing items with backend
 * Automatically triggers when internet connection is available
 */

import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db.js';
import * as api from '../api/client.js';

/**
 * useSyncWithAI - Sync pending items with AI backend
 *
 * Usage:
 * const { isOnline, isSyncing, error, syncNow } = useSyncWithAI();
 */
export function useSyncWithAI() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState(null);
  const syncingRef = useRef(false);

  // Query products with pending processing
  const pendingProducts = useLiveQuery(
    () =>
      db.products.where('ai_processed').equals(false).limit(100).toArray(),
    []
  );

  // Query suppliers with pending processing
  const pendingSuppliers = useLiveQuery(
    () =>
      db.suppliers.where('ai_processed').equals(false).limit(100).toArray(),
    []
  );

  // Listen to online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setError(null);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  /**
   * Sync pending items with backend
   */
  const syncNow = async () => {
    if (syncingRef.current || !isOnline) {
      return false;
    }

    syncingRef.current = true;
    setIsSyncing(true);
    setError(null);

    try {
      const allPending = [
        ...pendingProducts.map((p) => ({
          ...p,
          type: 'product',
        })),
        ...pendingSuppliers.map((s) => ({
          ...s,
          type: 'supplier',
        })),
      ];

      if (allPending.length === 0) {
        setIsSyncing(false);
        syncingRef.current = false;
        return true;
      }

      // Call sync endpoint
      const result = await api.syncWithAI(allPending);

      // Update local database with processed items
      for (const processedItem of result.processed || []) {
        if (processedItem.type === 'product') {
          await db.products.update(processedItem.id, {
            ...processedItem,
            ai_processed: true,
            ai_last_synced: new Date(),
          });
        } else if (processedItem.type === 'supplier') {
          await db.suppliers.update(processedItem.id, {
            ...processedItem,
            ai_processed: true,
            ai_last_synced: new Date(),
          });
        }
      }

      // Log any errors
      if (result.errors && result.errors.length > 0) {
        console.warn('Sync errors:', result.errors);
        setError(
          `Synced ${result.summary.processed}/${result.summary.total_items} items. ${result.summary.failed} failed.`
        );
      } else {
        console.log('Sync completed successfully', result.summary);
      }

      setIsSyncing(false);
      syncingRef.current = false;
      return true;
    } catch (err) {
      console.error('Sync error:', err);
      setError(err.message);
      setIsSyncing(false);
      syncingRef.current = false;
      return false;
    }
  };

  // Auto-sync when online and there are pending items
  useEffect(() => {
    if (isOnline && !isSyncing && (pendingProducts.length > 0 || pendingSuppliers.length > 0)) {
      // Delay sync slightly to avoid rapid repeated syncs
      const timeoutId = setTimeout(() => {
        syncNow();
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [isOnline, isSyncing, pendingProducts.length, pendingSuppliers.length]);

  return {
    isOnline,
    isSyncing,
    error,
    syncNow,
    pendingCount: pendingProducts.length + pendingSuppliers.length,
  };
}

export default useSyncWithAI;
