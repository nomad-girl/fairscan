/**
 * Hook for syncing pending AI processing items with backend
 * Processes items individually using existing API functions (processImage, processCard)
 * Automatically triggers when internet connection is restored
 *
 * IMPORTANT: Uses updateProduct/updateSupplier from db.js (not db.products.update directly)
 * so changes propagate to cloud sync via the sync engine.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import db, { updateProduct, updateSupplier } from '../db.js';
import * as api from '../api/client.js';

// Check if a string is base64 image data (not a URL)
const isBase64Photo = (photo) => {
  if (!photo || typeof photo !== 'string') return false;
  if (photo.startsWith('http://') || photo.startsWith('https://')) return false;
  return photo.startsWith('data:') || photo.length > 200;
};

export function useSyncWithAI(settings) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState({ processed: 0, total: 0 });
  const syncingRef = useRef(false);

  const pendingProducts = useLiveQuery(
    () => db.products.filter(p => !p.ai_processed).limit(50).toArray(),
    []
  ) || [];

  const pendingSuppliers = useLiveQuery(
    () => db.suppliers.filter(s => !s.ai_processed).limit(50).toArray(),
    []
  ) || [];

  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); setError(null); };
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
    // Already has AI data (cloud sync, processed on source device) → mark done
    if (product.category || (product.material && product.material.length > 0)) {
      await updateProduct(product.id, { ai_processed: true, ai_last_synced: new Date() });
      return { success: true, skipped: true };
    }

    // No photos → mark done
    if (!product.photos || product.photos.length === 0) {
      await updateProduct(product.id, { ai_processed: true, ai_last_synced: new Date() });
      return { success: true, skipped: true };
    }

    const photo = product.photos[0];

    // Photo is a URL (cloud sync) → already processed on source device
    if (!isBase64Photo(photo)) {
      await updateProduct(product.id, { ai_processed: true, ai_last_synced: new Date() });
      return { success: true, skipped: true };
    }

    try {
      console.log(`[AI Sync] Processing product ${product.id}...`);
      const result = await api.processImage(photo, {
        categories: settings?.categories,
        materials: settings?.materials,
      });
      console.log(`[AI Sync] Product ${product.id} → "${result.name}"`);

      const updates = {};
      if (result.name) updates.name = result.name;
      if (result.description) updates.description = result.description;
      if (result.category) updates.category = result.category;
      if (result.materials?.length) updates.material = result.materials;
      updates.ai_processed = true;
      updates.ai_last_synced = new Date();

      // Use updateProduct (triggers cloud sync push)
      await updateProduct(product.id, updates);

      // Background: upload photos to R2
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
                  updateProduct(product.id, { photoUrls: urls });
                }
              });
            }
          }).catch(() => {});
        }
      }

      return { success: true, updates };
    } catch (err) {
      console.warn(`[AI Sync] Product ${product.id} failed:`, err.message);
      return { success: false, error: err.message };
    }
  };

  /**
   * Process a single supplier card with AI
   */
  const processSupplier = async (supplier) => {
    // Helper: upload card photo to R2 if not yet uploaded
    const ensureCardUploaded = (s) => {
      if (isBase64Photo(s.cardPhoto) && !s.cardPhotoUrl && navigator.onLine) {
        const slugify = (t) => (t || 'card').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const key = `cards/${slugify(s.company)}_${s.uuid || s.id}.jpg`;
        api.uploadPhoto(s.cardPhoto, key).then(res => {
          if (res?.url) updateSupplier(s.id, { cardPhotoUrl: res.url });
        }).catch(() => {});
      }
    };

    // Already has full data (cloud sync) → mark done
    // Must have a real company name AND contact info
    if (supplier.company && supplier.company.trim() !== '' &&
        (supplier.phone || supplier.email || supplier.wechat || supplier.contact)) {
      ensureCardUploaded(supplier);
      await updateSupplier(supplier.id, { ai_processed: true, ai_last_synced: new Date() });
      return { success: true, skipped: true };
    }

    // No card photo → mark done
    if (!supplier.cardPhoto) {
      await updateSupplier(supplier.id, { ai_processed: true, ai_last_synced: new Date() });
      return { success: true, skipped: true };
    }

    // Card is URL (cloud sync) → mark done
    if (!isBase64Photo(supplier.cardPhoto)) {
      await updateSupplier(supplier.id, { ai_processed: true, ai_last_synced: new Date() });
      return { success: true, skipped: true };
    }

    // Has cardData and a real company name already → just mark done
    if (supplier.cardData && Object.keys(supplier.cardData).length > 0 &&
        supplier.company && supplier.company.trim() !== '') {
      ensureCardUploaded(supplier);
      await updateSupplier(supplier.id, { ai_processed: true, ai_last_synced: new Date() });
      return { success: true, skipped: true };
    }

    try {
      console.log(`[AI Sync] Processing supplier ${supplier.id} card...`);
      const result = await api.processCard(supplier.cardPhoto);
      console.log(`[AI Sync] Supplier ${supplier.id} → "${result.company}"`);

      const updates = {};
      // Update company name (especially if it's a placeholder)
      if (result.company) updates.company = result.company;
      if (result.contactName && !supplier.contact) updates.contact = result.contactName + (result.contactTitle ? ` (${result.contactTitle})` : '');
      if (result.phone && !supplier.phone) updates.phone = result.phone;
      if (result.mobile && !supplier.phone) updates.phone = result.mobile;
      if (result.email && !supplier.email) updates.email = result.email;
      if (result.wechat && !supplier.wechat) updates.wechat = result.wechat;
      if (result.whatsapp && !supplier.whatsapp) updates.whatsapp = result.whatsapp;
      if (result.website && !supplier.website) updates.website = result.website;
      if (result.address && !supplier.address) updates.address = result.address;
      if (result.products) updates.products = result.products;
      updates.cardData = result;
      updates.ai_processed = true;
      updates.ai_last_synced = new Date();

      // Use updateSupplier (triggers cloud sync push)
      await updateSupplier(supplier.id, updates);

      // Upload card photo to R2 (uses company from AI result)
      ensureCardUploaded({ ...supplier, company: result.company || supplier.company });

      // Also update any linked products' supplierCompany name
      if (result.company) {
        const linked = await db.products.where('supplierId').equals(supplier.id).toArray();
        for (const p of linked) {
          if (!p.supplierCompany || p.supplierCompany.trim() === '') {
            await updateProduct(p.id, { supplierCompany: result.company });
          }
        }
      }

      return { success: true, updates };
    } catch (err) {
      console.warn(`[AI Sync] Supplier ${supplier.id} failed:`, err.message);
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
    let anyChanges = false;

    try {
      // Process suppliers FIRST so products can link to them
      for (const supplier of allSuppliers) {
        if (!navigator.onLine) break;
        const result = await processSupplier(supplier);
        processed++;
        if (!result.success) failed++;
        else anyChanges = true;
        setProgress({ processed, total });
      }

      // Then process products
      for (const product of allProducts) {
        if (!navigator.onLine) break;
        const result = await processProduct(product);
        processed++;
        if (!result.success) failed++;
        else anyChanges = true;
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
            await updateProduct(p.id, { supplierId: match.id });
            anyChanges = true;
          }
        }
      } catch (e) {
        console.warn('[AI Sync] Supplier linking failed:', e);
      }

      // Always notify App to refresh when anything changed
      if (anyChanges) {
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
      const timeoutId = setTimeout(() => syncNow(), 2000);
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
