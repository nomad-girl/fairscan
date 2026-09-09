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
import { fotosSinSubir, esperaReintento } from '../lib/fotosPendientes.js';

// Check if a string is base64 image data (not a URL)
const isBase64Photo = (photo) => {
  if (!photo || typeof photo !== 'string') return false;
  if (photo.startsWith('http://') || photo.startsWith('https://')) return false;
  return photo.startsWith('data:') || photo.length > 200;
};

// Max retries before giving up on an item (marks as processed to stop retrying)
const MAX_RETRIES = 3;

export function useSyncWithAI(settings) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState({ processed: 0, total: 0 });
  const syncingRef = useRef(false);
  const retryTimerRef = useRef(null);

  const pendingProducts = useLiveQuery(
    () => db.products.filter(p => !p.ai_processed).limit(50).toArray(),
    []
  ) || [];

  const pendingSuppliers = useLiveQuery(
    () => db.suppliers.filter(s => !s.ai_processed).limit(50).toArray(),
    []
  ) || [];

  // ─── Fotos pendientes de subir a la nube (2.7) ───
  // La copia local es la verdad y la nube el respaldo: lo que se capturó sin
  // señal sube solo cuando vuelve, con reintentos que se espacian y nunca se rinden.
  const pendingPhotoProducts = useLiveQuery(
    () => db.products.where('uploadPending').equals(1).limit(50).toArray(),
    []
  ) || [];
  const pendingCardSuppliers = useLiveQuery(
    () => db.suppliers.where('cardUploadPending').equals(1).limit(50).toArray(),
    []
  ) || [];
  const uploadingRef = useRef(false);
  const uploadFailsRef = useRef(0);
  const uploadTimerRef = useRef(null);

  const uploadPendingPhotos = useCallback(async () => {
    if (uploadingRef.current || !navigator.onLine) return;
    if (!pendingPhotoProducts.length && !pendingCardSuppliers.length) return;
    uploadingRef.current = true;
    let failed = 0;
    try {
      for (const s of pendingCardSuppliers) {
        if (!navigator.onLine) break;
        const res = await api.uploadPhoto(s.cardPhoto, 'cards');
        if (res?.url) await updateSupplier(s.id, { cardPhotoUrl: res.url });
        else failed++;
      }
      for (const p of pendingPhotoProducts) {
        if (!navigator.onLine) break;
        const urls = [...(p.photoUrls || [])];
        let completo = true;
        for (const i of fotosSinSubir(p)) {
          const res = await api.uploadPhoto(p.photos[i], 'products');
          if (res?.url) urls[i] = res.url; else completo = false;
        }
        if (urls.some(Boolean)) await updateProduct(p.id, { photoUrls: urls });
        if (!completo) failed++;
      }
    } catch (err) {
      console.warn('[Fotos] Subida pendiente falló:', err);
      failed++;
    } finally {
      uploadingRef.current = false;
    }
    if (failed > 0) {
      uploadFailsRef.current += 1;
      const espera = esperaReintento(uploadFailsRef.current);
      console.log(`[Fotos] ${failed} sin subir, reintento en ${Math.round(espera / 1000)}s`);
      if (uploadTimerRef.current) clearTimeout(uploadTimerRef.current);
      uploadTimerRef.current = setTimeout(() => { if (navigator.onLine) uploadPendingPhotos(); }, espera);
    } else {
      uploadFailsRef.current = 0;
    }
  }, [pendingPhotoProducts, pendingCardSuppliers]);

  useEffect(() => {
    if (isOnline && (pendingPhotoProducts.length || pendingCardSuppliers.length)) {
      const id = setTimeout(uploadPendingPhotos, 3000);
      return () => clearTimeout(id);
    }
  }, [isOnline, pendingPhotoProducts.length, pendingCardSuppliers.length, uploadPendingPhotos]);
  useEffect(() => () => { if (uploadTimerRef.current) clearTimeout(uploadTimerRef.current); }, []);

  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); setError(null); };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
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
      console.log(`[AI Sync] Processing product ${product.id} (attempt ${(product.ai_retry_count || 0) + 1})...`);
      const result = await api.processImage(photo, {
        categories: settings?.categories,
        materials: settings?.materials,
      });
      console.log(`[AI Sync] Producto ${product.id}: ok`);

      const updates = {};
      if (result.name) updates.name = result.name;
      if (result.description) updates.description = result.description;
      if (result.category) updates.category = result.category;
      if (result.materials?.length) updates.material = result.materials;
      // Auto-fill price if detected by AI and not set manually
      if (result.price && !product.price) {
        updates.price = String(result.price).replace(/[^0-9.]/g, '');
        if (result.priceUnit) {
          updates.notes = (product.notes ? product.notes + '. ' : '') + `Precio detectado: ${result.price} ${result.priceUnit}`;
        }
      }
      updates.ai_processed = true;
      updates.ai_last_synced = new Date();
      updates.ai_retry_count = 0;
      updates.ai_error = null;

      // Use updateProduct (triggers cloud sync push)
      await updateProduct(product.id, updates);
      // Las fotos las sube la cola de fotos pendientes (más abajo), con reintentos.

      return { success: true, updates };
    } catch (err) {
      console.warn(`[AI Sync] Product ${product.id} failed:`, err.message);
      const retries = (product.ai_retry_count || 0) + 1;
      if (retries >= MAX_RETRIES) {
        // Give up after MAX_RETRIES — mark as processed so it doesn't block the queue
        console.warn(`[AI Sync] Product ${product.id} failed ${MAX_RETRIES} times, giving up`);
        await updateProduct(product.id, {
          ai_processed: true,
          ai_last_synced: new Date(),
          ai_error: err.message,
          ai_retry_count: retries,
        });
        return { success: true, skipped: true, gaveUp: true };
      }
      // Increment retry count so we can track attempts
      await db.products.update(product.id, { ai_retry_count: retries });
      return { success: false, error: err.message, retries };
    }
  };

  /**
   * Process a single supplier card with AI
   */
  const processSupplier = async (supplier) => {
    // Already has full data (cloud sync) → mark done
    // Must have a real company name AND contact info
    if (supplier.company && supplier.company.trim() !== '' &&
        (supplier.phone || supplier.email || supplier.wechat || supplier.contact)) {
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
      await updateSupplier(supplier.id, { ai_processed: true, ai_last_synced: new Date() });
      return { success: true, skipped: true };
    }

    try {
      console.log(`[AI Sync] Processing supplier ${supplier.id} card (attempt ${(supplier.ai_retry_count || 0) + 1})...`);
      const result = await api.processCard(supplier.cardPhoto);
      console.log(`[AI Sync] Proveedor ${supplier.id}: ok`);

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
      updates.ai_retry_count = 0;
      updates.ai_error = null;

      // Use updateSupplier (triggers cloud sync push)
      await updateSupplier(supplier.id, updates);


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
      const retries = (supplier.ai_retry_count || 0) + 1;
      if (retries >= MAX_RETRIES) {
        console.warn(`[AI Sync] Supplier ${supplier.id} failed ${MAX_RETRIES} times, giving up`);
        await updateSupplier(supplier.id, {
          ai_processed: true,
          ai_last_synced: new Date(),
          ai_error: err.message,
          ai_retry_count: retries,
        });
        return { success: true, skipped: true, gaveUp: true };
      }
      await db.suppliers.update(supplier.id, { ai_retry_count: retries });
      return { success: false, error: err.message, retries };
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
        setError(`${failed} fallaron, reintentando...`);
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

      // Schedule retry for failed items with exponential backoff
      if (failed > 0) {
        const delay = Math.min(10000, 3000 * failed); // 3s per failure, max 10s
        console.log(`[AI Sync] ${failed} items failed, retrying in ${delay / 1000}s...`);
        if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
        retryTimerRef.current = setTimeout(() => {
          if (navigator.onLine) syncNow();
        }, delay);
      }

      return failed === 0;
    } catch (err) {
      console.error('Sync error:', err);
      setError(err.message);
      setIsSyncing(false);
      syncingRef.current = false;

      // Retry on unexpected errors too
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      retryTimerRef.current = setTimeout(() => {
        if (navigator.onLine) syncNow();
      }, 5000);

      return false;
    }
  }, [pendingProducts, pendingSuppliers, settings]);

  // Auto-sync when online and there are pending items
  // FIXED: include isSyncing and syncNow in deps so retry works correctly
  useEffect(() => {
    if (isOnline && !isSyncing && (pendingProducts.length > 0 || pendingSuppliers.length > 0)) {
      const timeoutId = setTimeout(() => syncNow(), 2000);
      return () => clearTimeout(timeoutId);
    }
  }, [isOnline, isSyncing, pendingProducts.length, pendingSuppliers.length, syncNow]);

  return {
    isOnline,
    isSyncing,
    error,
    syncNow,
    pendingCount: pendingProducts.length + pendingSuppliers.length,
    photosPending: pendingPhotoProducts.length + pendingCardSuppliers.length,
    uploadPhotosNow: uploadPendingPhotos,
    processedCount: progress.processed,
    totalCount: progress.total,
  };
}

export default useSyncWithAI;
