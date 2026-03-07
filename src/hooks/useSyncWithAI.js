/**
 * Hook for syncing pending AI processing items with backend
 * Processes items individually using existing API functions (processImage, processCard)
 * Automatically triggers when internet connection is restored
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '../db.js';
import * as api from '../api/client.js';

// Check if a string is base64 image data (not a URL)
const isBase64Photo = (photo) => {
  if (!photo || typeof photo !== 'string') return false;
  if (photo.startsWith('http://') || photo.startsWith('https://')) return false;
  // data:image/... or raw base64
  return photo.startsWith('data:') || photo.length > 200;
};

/**
 * useSyncWithAI - Sync pending items with AI backend
 */
export function useSyncWithAI(settings) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState({ processed: 0, total: 0 });
  const syncingRef = useRef(false);

  // Query products with pending processing (ai_processed is false, 0, null, or undefined)
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
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  /**
   * Process a single product with AI
   */
  const processProduct = async (product) => {
    // Already has AI data (came from cloud sync, processed on source device) → mark done
    if (product.category || (product.material && product.material.length > 0)) {
      await db.products.update(product.id, { ai_processed: true, ai_last_synced: new Date() });
      return { success: true, skipped: true };
    }

    // No photos at all → mark done
    if (!product.photos || product.photos.length === 0) {
      await db.products.update(product.id, { ai_processed: true, ai_last_synced: new Date() });
      return { success: true, skipped: true };
    }

    const photo = product.photos[0];

    // Photo is a URL (from cloud sync), not base64 → already processed on source device
    if (!isBase64Photo(photo)) {
      await db.products.update(product.id, { ai_processed: true, ai_last_synced: new Date() });
      return { success: true, skipped: true };
    }

    try {
      console.log(`[AI Sync] Processing product ${product.id}, photo type: ${photo.substring(0, 30)}...`);
      const result = await api.processImage(photo, {
        categories: settings?.categories,
        materials: settings?.materials,
      });
      console.log(`[AI Sync] Product ${product.id} processed:`, result.name);

      const updates = {};
      if (result.name) updates.name = result.name;
      if (result.description) updates.description = result.description;
      if (result.category) updates.category = result.category;
      if (result.materials?.length) updates.material = result.materials;
      updates.ai_processed = true;
      updates.ai_last_synced = new Date();

      await db.products.update(product.id, updates);

      // Background: upload photos to R2 if missing
      if (!product.photoUrls && navigator.onLine) {
        const slugify = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        for (let i = 0; i < product.photos.length; i++) {
          if (!isBase64Photo(product.photos[i])) continue;
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

      return { success: true, updates };
    } catch (err) {
      console.warn(`AI process failed for product ${product.id}:`, err);
      return { success: false, error: err.message };
    }
  };

  /**
   * Process a single supplier card with AI
   */
  const processSupplier = async (supplier) => {
    // Already has data (company, contact, etc. from cloud sync) → mark done
    if (supplier.company && (supplier.phone || supplier.email || supplier.wechat || supplier.contact)) {
      await db.suppliers.update(supplier.id, { ai_processed: true, ai_last_synced: new Date() });
      return { success: true, skipped: true };
    }

    // No card photo → mark done
    if (!supplier.cardPhoto) {
      await db.suppliers.update(supplier.id, { ai_processed: true, ai_last_synced: new Date() });
      return { success: true, skipped: true };
    }

    // Card is a URL (from cloud sync) → already processed on source device
    if (!isBase64Photo(supplier.cardPhoto)) {
      await db.suppliers.update(supplier.id, { ai_processed: true, ai_last_synced: new Date() });
      return { success: true, skipped: true };
    }

    // Already has cardData (was processed during capture) → mark done
    if (supplier.cardData && Object.keys(supplier.cardData).length > 0) {
      await db.suppliers.update(supplier.id, { ai_processed: true, ai_last_synced: new Date() });
      return { success: true, skipped: true };
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
      return { success: true, updates };
    } catch (err) {
      console.warn(`AI process failed for supplier ${supplier.id}:`, err);
      return { success: false, error: err.message };
    }
  };

  /**
   * Sync all pending items
   */
  const syncNow = useCallback(async () => {
    if (syncingRef.current || !navigator.onLine) return false;

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
      for (const product of allProducts) {
        if (!navigator.onLine) break;
        const result = await processProduct(product);
        processed++;
        if (!result.success) failed++;
        setProgress({ processed, total });
      }

      for (const supplier of allSuppliers) {
        if (!navigator.onLine) break;
        const result = await processSupplier(supplier);
        processed++;
        if (!result.success) failed++;
        setProgress({ processed, total });
      }

      if (failed > 0) {
        setError(`${failed} fallaron`);
      }

      // Fix orphaned products: link by supplierCompany name when supplierId is missing
      try {
        const allSuppliersList = await db.suppliers.toArray();
        const orphaned = await db.products.filter(p => !p.supplierId && p.supplierCompany).toArray();
        for (const p of orphaned) {
          const match = allSuppliersList.find(s =>
            s.company && p.supplierCompany &&
            s.company.toLowerCase().trim() === p.supplierCompany.toLowerCase().trim()
          );
          if (match) {
            await db.products.update(p.id, { supplierId: match.id });
          }
        }
      } catch (e) {
        console.warn('[AI Sync] Supplier linking failed:', e);
      }

      // Notify App to refresh React state from Dexie
      if (processed > 0) {
        window.dispatchEvent(new CustomEvent('ai-sync-done'));
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
