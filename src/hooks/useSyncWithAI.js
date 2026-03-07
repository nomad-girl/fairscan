/**
 * Hook for syncing pending AI processing items with backend
 * Processes items individually using existing API functions (processImage, processCard)
 * Automatically triggers when internet connection is restored
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '../db.js';
import * as api from '../api/client.js';

/**
 * useSyncWithAI - Sync pending items with AI backend
 *
 * Usage:
 * const { isOnline, isSyncing, error, syncNow, pendingCount, processedCount, totalCount } = useSyncWithAI(settings);
 */
export function useSyncWithAI(settings) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState({ processed: 0, total: 0 });
  const syncingRef = useRef(false);

  // Query products with pending processing
  const pendingProducts = useLiveQuery(
    () =>
      db.products.filter(p => !p.ai_processed).limit(50).toArray(),
    []
  ) || [];

  // Query suppliers with pending processing
  const pendingSuppliers = useLiveQuery(
    () =>
      db.suppliers.filter(s => !s.ai_processed).limit(50).toArray(),
    []
  ) || [];

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
   * Process a single product with AI (using its first photo)
   */
  const processProduct = async (product) => {
    if (!product.photos || product.photos.length === 0) {
      // No photo to process — mark as processed with what we have
      await db.products.update(product.id, {
        ai_processed: true,
        ai_last_synced: new Date(),
      });
      return { success: true, id: product.id, skipped: true };
    }

    try {
      const photo = product.photos[0];
      const result = await api.processImage(photo, {
        categories: settings?.categories,
        materials: settings?.materials,
      });

      const updates = {};
      if (result.name) updates.name = result.name;
      if (result.description) updates.description = result.description;
      if (result.category) updates.category = result.category;
      if (result.materials?.length) updates.material = result.materials;
      updates.ai_processed = true;
      updates.ai_last_synced = new Date();

      await db.products.update(product.id, updates);

      // Also upload photo to R2 if not yet uploaded
      if (!product.photoUrls && navigator.onLine) {
        const slugify = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        for (let i = 0; i < product.photos.length; i++) {
          const key = `products/${slugify(product.supplierCompany || 'unknown')}/${product.uuid || product.id}_${i}.jpg`;
          api.uploadPhoto(product.photos[i], key).then(res => {
            if (res?.url) {
              db.products.get(product.id).then(p => {
                if (p) {
                  const urls = p.photoUrls || [];
                  urls[i] = res.url;
                  db.products.update(product.id, { photoUrls: urls });
                }
              });
            }
          }).catch(() => {});
        }
      }

      return { success: true, id: product.id, updates };
    } catch (err) {
      console.warn(`AI process failed for product ${product.id}:`, err);
      return { success: false, id: product.id, error: err.message };
    }
  };

  /**
   * Process a single supplier card with AI
   */
  const processSupplier = async (supplier) => {
    if (!supplier.cardPhoto) {
      // No card to process — mark as processed
      await db.suppliers.update(supplier.id, {
        ai_processed: true,
        ai_last_synced: new Date(),
      });
      return { success: true, id: supplier.id, skipped: true };
    }

    try {
      const result = await api.processCard(supplier.cardPhoto);

      const updates = {};
      if (result.company && !supplier.company) updates.company = result.company;
      if (result.contactName && !supplier.contact) updates.contact = result.contactName;
      if (result.phone && !supplier.phone) updates.phone = result.phone;
      if (result.email && !supplier.email) updates.email = result.email;
      if (result.wechat && !supplier.wechat) updates.wechat = result.wechat;
      if (result.whatsapp && !supplier.whatsapp) updates.whatsapp = result.whatsapp;
      if (result.website && !supplier.website) updates.website = result.website;
      if (result.address && !supplier.address) updates.address = result.address;
      updates.cardData = result;
      updates.ai_processed = true;
      updates.ai_last_synced = new Date();

      await db.suppliers.update(supplier.id, updates);
      return { success: true, id: supplier.id, updates };
    } catch (err) {
      console.warn(`AI process failed for supplier ${supplier.id}:`, err);
      return { success: false, id: supplier.id, error: err.message };
    }
  };

  /**
   * Sync all pending items with backend
   */
  const syncNow = useCallback(async () => {
    if (syncingRef.current || !navigator.onLine) {
      return false;
    }

    const allProducts = [...pendingProducts];
    const allSuppliers = [...pendingSuppliers];
    const total = allProducts.length + allSuppliers.length;

    if (total === 0) return true;

    syncingRef.current = true;
    setIsSyncing(true);
    setError(null);
    setProgress({ processed: 0, total });

    let processed = 0;
    let failed = 0;

    try {
      // Process products one by one
      for (const product of allProducts) {
        if (!navigator.onLine) {
          setError('Conexión perdida durante sincronización');
          break;
        }
        const result = await processProduct(product);
        processed++;
        if (!result.success) failed++;
        setProgress({ processed, total });
      }

      // Process suppliers one by one
      for (const supplier of allSuppliers) {
        if (!navigator.onLine) {
          setError('Conexión perdida durante sincronización');
          break;
        }
        const result = await processSupplier(supplier);
        processed++;
        if (!result.success) failed++;
        setProgress({ processed, total });
      }

      if (failed > 0) {
        setError(`${processed - failed}/${total} procesados. ${failed} fallaron.`);
      } else {
        console.log(`AI sync completed: ${processed}/${total} items processed`);
      }

      setIsSyncing(false);
      syncingRef.current = false;
      return failed === 0;
    } catch (err) {
      console.error('Sync error:', err);
      setError(err.message);
      setIsSyncing(false);
      syncingRef.current = false;
      return false;
    }
  }, [pendingProducts, pendingSuppliers, settings]);

  // Auto-sync when online and there are pending items
  useEffect(() => {
    if (isOnline && !isSyncing && (pendingProducts.length > 0 || pendingSuppliers.length > 0)) {
      // Delay to let network stabilize after reconnect
      const timeoutId = setTimeout(() => {
        syncNow();
      }, 2000);

      return () => clearTimeout(timeoutId);
    }
  }, [isOnline, pendingProducts.length, pendingSuppliers.length]);

  return {
    isOnline,
    isSyncing,
    error,
    syncNow,
    pendingCount: pendingProducts.length + pendingSuppliers.length,
    processedCount: progress.processed,
    totalCount: progress.total,
  };
}

export default useSyncWithAI;
