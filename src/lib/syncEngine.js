import { supabase, isSupabaseConfigured } from './supabase.js';
import idMapper from './idMapper.js';
import db, { addToSyncQueue, getSyncQueue, deleteSyncQueueItem, saveSettings as dbSaveSettings } from '../db.js';

/**
 * SyncEngine: Handles push/pull/realtime sync between local Dexie and Supabase.
 *
 * - Push: local changes → Supabase (on every CRUD operation)
 * - Pull: Supabase → local Dexie (on room join + realtime subscription)
 * - Queue: offline changes queued in _syncQueue, flushed when online
 * - Conflict resolution: last-write-wins via updatedAt/updated_at
 */
class SyncEngine {
  constructor() {
    this.roomId = null;      // Supabase team UUID (historically called roomId)
    this.deviceId = this._getOrCreateDeviceId();
    this.channel = null;     // Supabase Realtime channel
    this.listeners = new Set();
    this.isSyncing = false;
    this.lastSyncAt = null;
    this.isOnline = navigator.onLine;
    this._reloadCallback = null; // Set by App to trigger reloadAll()

    // Listen for online/offline
    window.addEventListener('online', () => {
      this.isOnline = true;
      this._notify();
      if (this.roomId) {
        this.flushQueue().catch(console.warn);
        // Re-subscribe realtime channel (may have disconnected while offline)
        this._subscribeRealtime();
        // Pull any changes we missed while offline
        this.pullAll().catch(console.warn);
      }
    });
    window.addEventListener('offline', () => {
      this.isOnline = false;
      this._notify();
    });
  }

  /** Set callback to reload all data (triggers React re-render) */
  setReloadCallback(cb) {
    this._reloadCallback = cb;
  }

  /** Subscribe to sync state changes */
  addListener(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  _notify() { this.listeners.forEach(fn => fn(this.getState())); }

  getState() {
    return {
      roomId: this.roomId,
      teamId: this.roomId, // alias
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      lastSyncAt: this.lastSyncAt,
      lastError: this.lastError || null,
      lastPullCounts: this.lastPullCounts || null,
    };
  }

  // ─── Team Management ───

  /** Connect to a team and sync data */
  async connectTeam(teamId) {
    if (!isSupabaseConfigured()) throw new Error('Supabase no está configurado');
    if (!teamId) throw new Error('Team ID requerido');

    this.roomId = teamId;

    // Save to local settings (reuses roomId field)
    await dbSaveSettings({ roomId: this.roomId, roomCode: null });

    // Build ID mapper from local data
    await idMapper.buildFromLocal();

    // Pull all data from cloud
    await this.pullAll();

    // Push any local-only data
    await this._pushAllLocal();

    // Subscribe to realtime
    this._subscribeRealtime();
    this.startAutoBackup();

    this._notify();
  }

  /** Disconnect from current team */
  async disconnectTeam() {
    if (this.channel) {
      supabase?.removeChannel(this.channel);
      this.channel = null;
    }
    this.roomId = null;

    await dbSaveSettings({ roomId: null, roomCode: null });
    this.stopAutoBackup();

    this._notify();
  }

  /** Resume team connection (called on app startup if previously connected) */
  async resumeTeam(teamId) {
    if (!isSupabaseConfigured() || !teamId) return;

    this.roomId = teamId;

    await idMapper.buildFromLocal();

    // Delta sync — only pull changes since last sync, not everything
    if (this.isOnline) {
      try {
        if (this.lastSyncAt) {
          await this.pullDelta(this.lastSyncAt);
        } else {
          await this.pullAll();
        }
        await this.flushQueue();
      } catch (err) {
        console.warn('⚠️ Error resuming sync:', err);
      }
    }

    this._subscribeRealtime();
    this.startAutoBackup();
    this._notify();
  }

  // ─── Push (Local → Cloud) ───

  /** Push a single record to Supabase */
  async pushRecord(table, localRecord) {
    if (!this.roomId) return;

    const cloudRecord = idMapper.toCloud(table, localRecord, this.roomId);

    if (!this.isOnline) {
      await addToSyncQueue({
        table,
        uuid: localRecord.uuid,
        action: 'upsert',
        timestamp: Date.now(),
        payload: cloudRecord,
      });
      return;
    }

    try {
      const { error } = await supabase
        .from(table)
        .upsert(cloudRecord, { onConflict: 'id' });

      if (error) throw error;
      this.lastSyncAt = Date.now();
      // #9: Don't notify on every single push — reduces unnecessary React re-renders
    } catch (err) {
      console.warn(`⚠️ Sync push failed for ${table}, queuing:`, err);
      await addToSyncQueue({
        table,
        uuid: localRecord.uuid,
        action: 'upsert',
        timestamp: Date.now(),
        payload: cloudRecord,
      });
    }
  }

  /** Push a soft delete to Supabase */
  async pushDelete(table, uuid) {
    if (!this.roomId) return;

    if (!this.isOnline) {
      await addToSyncQueue({
        table,
        uuid,
        action: 'delete',
        timestamp: Date.now(),
      });
      return;
    }

    try {
      const { error } = await supabase
        .from(table)
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', uuid);

      if (error) throw error;
      this.lastSyncAt = Date.now();
      // #9: Don't notify per-delete — batch via pullAll/flushQueue
    } catch (err) {
      console.warn(`⚠️ Sync delete failed for ${table}/${uuid}, queuing:`, err);
      await addToSyncQueue({
        table,
        uuid,
        action: 'delete',
        timestamp: Date.now(),
      });
    }
  }

  /** Push all local data to cloud (used on room creation / join) */
  async _pushAllLocal() {
    this.isSyncing = true;
    this._notify();

    try {
      // Push in order: districts → suppliers → products (FK dependencies)
      for (const table of ['districts', 'suppliers', 'products']) {
        // First, get existing cloud UUIDs for this room to avoid re-pushing
        // records we just pulled (which would overwrite their device_id)
        let cloudIds = new Set();
        try {
          const { data: existing } = await supabase
            .from(table)
            .select('id')
            .eq('room_id', this.roomId);
          cloudIds = new Set((existing || []).map(r => r.id));
        } catch (err) {
          console.warn(`⚠️ Could not fetch existing ${table} IDs:`, err);
        }

        const records = await db.table(table).toArray();
        let pushed = 0;
        for (const record of records) {
          if (!record.uuid) continue;
          // Skip records already in the cloud (pulled from other devices)
          if (cloudIds.has(record.uuid)) continue;
          const cloudRecord = idMapper.toCloud(table, record, this.roomId);
          try {
            await supabase.from(table).upsert(cloudRecord, { onConflict: 'id' });
            pushed++;
          } catch (err) {
            console.warn(`⚠️ Push failed for ${table}/${record.uuid}:`, err);
          }
        }
        if (pushed > 0) console.log(`☁️ Pushed ${pushed} ${table} to cloud`);
      }
      this.lastSyncAt = Date.now();
    } finally {
      this.isSyncing = false;
      this._notify();
    }
  }

  // ─── Pull (Cloud → Local) ───

  /** Pull all data from cloud (initial sync on room join) */
  async pullAll() {
    if (!this.roomId || !isSupabaseConfigured()) return;

    this.isSyncing = true;
    this.lastError = null;
    this._notify();

    const counts = { districts: 0, suppliers: 0, products: 0 };
    const errors = [];

    try {
      for (const table of ['districts', 'suppliers', 'products']) {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .eq('room_id', this.roomId)
          .is('deleted_at', null);

        if (error) {
          console.warn(`⚠️ Pull failed for ${table}:`, error);
          errors.push(`${table}: ${error.message}`);
          continue;
        }

        for (const cloudRecord of (data || [])) {
          await this._applyCloudRecord(table, cloudRecord);
          counts[table]++;
        }
      }

      console.log(`☁️ Pulled: ${counts.districts}D, ${counts.suppliers}S, ${counts.products}P`);

      if (errors.length > 0) {
        this.lastError = `Sync parcial: ${errors.join(', ')}`;
      }

      this.lastSyncAt = Date.now();
      this.lastPullCounts = counts;
      if (this._reloadCallback) await this._reloadCallback();
    } catch (err) {
      this.lastError = `Error de sync: ${err.message}`;
      console.warn('⚠️ pullAll error:', err);
    } finally {
      this.isSyncing = false;
      this._notify();
    }
  }

  /** #8: Delta sync — only pull records changed since a given timestamp */
  async pullDelta(since) {
    if (!this.roomId || !isSupabaseConfigured()) return;

    this.isSyncing = true;
    this._notify();

    const sinceISO = new Date(since - 5000).toISOString(); // 5s buffer for clock skew
    let anyChanges = false;

    try {
      for (const table of ['districts', 'suppliers', 'products']) {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .eq('room_id', this.roomId)
          .is('deleted_at', null)
          .gt('updated_at', sinceISO);

        if (error) {
          console.warn(`⚠️ Delta pull failed for ${table}:`, error);
          continue;
        }

        if (data?.length > 0) {
          anyChanges = true;
          for (const cloudRecord of data) {
            await this._applyCloudRecord(table, cloudRecord);
          }
        }
      }

      this.lastSyncAt = Date.now();
      if (anyChanges && this._reloadCallback) await this._reloadCallback();
    } finally {
      this.isSyncing = false;
      this._notify();
    }
  }

  /** Apply a single cloud record to local Dexie */
  async _applyCloudRecord(table, cloudRecord) {
    // Check if we already have this record locally
    const existingLocal = await db.table(table).where('uuid').equals(cloudRecord.id).first();

    // For own-device records that still exist locally, just register mapping and skip
    if (cloudRecord.device_id === this.deviceId && existingLocal) {
      idMapper.register(table, existingLocal.id, cloudRecord.id);
      return;
    }
    // If own-device record is MISSING locally (data loss), fall through to recreate it

    if (existingLocal) {
      // Compare timestamps - cloud wins if newer
      const localTime = existingLocal.updatedAt || existingLocal.createdAt || 0;
      const cloudTime = new Date(cloudRecord.updated_at || cloudRecord.created_at).getTime();

      if (cloudTime > localTime) {
        const localData = idMapper.toLocal(table, cloudRecord);

        // CRITICAL: Never overwrite local base64 photos with empty cloud data.
        // Cloud records don't carry base64 — only URLs. If the cloud has no URLs
        // but local has base64 photos, preserve the local photos.
        if (table === 'products') {
          const localHasPhotos = existingLocal.photos?.length > 0 &&
            existingLocal.photos.some(p => typeof p === 'string' && p.startsWith('data:'));
          const cloudHasUrls = (cloudRecord.photo_urls || []).length > 0;
          if (localHasPhotos && !cloudHasUrls) {
            delete localData.photos; // Keep existing local base64 photos
          }
          // Never null out photoUrls if local already has them
          if (existingLocal.photoUrls?.length > 0 && !localData.photoUrls?.length) {
            delete localData.photoUrls;
          }
        }
        if (table === 'suppliers') {
          // Preserve local base64 card photo
          if (existingLocal.cardPhoto && !localData.cardPhoto) {
            delete localData.cardPhoto;
          }
          if (existingLocal.cardPhotoUrl && !localData.cardPhotoUrl) {
            delete localData.cardPhotoUrl;
          }
        }

        await db.table(table).update(existingLocal.id, localData);
      }
      idMapper.register(table, existingLocal.id, cloudRecord.id);
    } else {
      // New record from another device - insert locally
      const localData = idMapper.toLocal(table, cloudRecord);
      const localId = await db.table(table).add(localData);
      idMapper.register(table, localId, cloudRecord.id);
    }
  }

  // ─── Offline Queue ───

  /** Flush all queued operations */
  async flushQueue() {
    if (!this.roomId || !this.isOnline) return;

    const queue = await getSyncQueue();
    if (queue.length === 0) return;

    this.isSyncing = true;
    this._notify();

    try {
      for (const entry of queue) {
        try {
          if (entry.action === 'upsert' && entry.payload) {
            await supabase.from(entry.table).upsert(entry.payload, { onConflict: 'id' });
          } else if (entry.action === 'delete') {
            await supabase
              .from(entry.table)
              .update({ deleted_at: new Date().toISOString() })
              .eq('id', entry.uuid);
          }
          await deleteSyncQueueItem(entry.id);
        } catch (err) {
          console.warn(`⚠️ Queue flush failed for ${entry.table}/${entry.uuid}:`, err);
          // Leave in queue for next retry
        }
      }
      this.lastSyncAt = Date.now();
    } finally {
      this.isSyncing = false;
      this._notify();
    }
  }

  // ─── Realtime ───

  _subscribeRealtime() {
    if (!supabase || !this.roomId) return;

    // Clean up existing subscription
    if (this.channel) {
      supabase.removeChannel(this.channel);
    }

    this.channel = supabase
      .channel(`room:${this.roomId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'districts', filter: `room_id=eq.${this.roomId}` },
        (payload) => this._handleRealtime('districts', payload)
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'suppliers', filter: `room_id=eq.${this.roomId}` },
        (payload) => this._handleRealtime('suppliers', payload)
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'products', filter: `room_id=eq.${this.roomId}` },
        (payload) => this._handleRealtime('products', payload)
      )
      .subscribe((status) => {
        console.log(`📡 Realtime ${status}`);
      });
  }

  async _handleRealtime(table, payload) {
    const record = payload.new || payload.old;
    if (!record) return;

    // Ignore our own changes
    if (record.device_id === this.deviceId) return;

    console.log(`📡 Realtime ${payload.eventType} on ${table}:`, record.id?.slice(0, 8));

    if (payload.eventType === 'DELETE' || record.deleted_at) {
      // Soft delete: remove locally
      const local = await db.table(table).where('uuid').equals(record.id).first();
      if (local) {
        await db.table(table).delete(local.id);
      }
    } else {
      // INSERT or UPDATE
      await this._applyCloudRecord(table, record);
    }

    // Trigger React re-render
    this.lastSyncAt = Date.now();
    this._notify();
    if (this._reloadCallback) this._reloadCallback();
  }

  // ─── Cloud Backup ───

  /** Auto-backup: save full snapshot to Supabase every 1 hour */
  async startAutoBackup() {
    if (this._backupInterval) clearInterval(this._backupInterval);
    // Run first backup after 2 minutes, then every 1 hour
    setTimeout(() => this.createBackup().catch(console.warn), 2 * 60 * 1000);
    this._backupInterval = setInterval(() => {
      this.createBackup().catch(console.warn);
    }, 60 * 60 * 1000); // 1 hour
  }

  stopAutoBackup() {
    if (this._backupInterval) {
      clearInterval(this._backupInterval);
      this._backupInterval = null;
    }
  }

  /** Create a cloud backup snapshot */
  async createBackup() {
    if (!this.roomId || !this.isOnline || !isSupabaseConfigured()) return;

    try {
      const [districts, suppliers, products] = await Promise.all([
        db.table('districts').toArray(),
        db.table('suppliers').toArray(),
        db.table('products').toArray(),
      ]);

      const snapshot = {
        version: 1,
        deviceId: this.deviceId,
        timestamp: new Date().toISOString(),
        counts: { districts: districts.length, suppliers: suppliers.length, products: products.length },
        districts: districts.map(d => ({ ...d, photos: undefined })),
        suppliers: suppliers.map(s => ({ ...s, cardPhoto: undefined })),
        products: products.map(p => ({ ...p, photos: (p.photoUrls || p.photos || []).filter(u => typeof u === 'string' && u.startsWith('http')) })),
      };

      const { error } = await supabase
        .from('backups')
        .insert({
          room_id: this.roomId,
          device_id: this.deviceId,
          data: snapshot,
        });

      if (error) {
        // Table might not exist yet — that's ok, just log
        console.warn('💾 Backup failed (tabla no existe?):', error.message);
        return;
      }

      // Cleanup: keep only last 24 backups for this room (~24 hours of history)
      const { data: old } = await supabase
        .from('backups')
        .select('id, created_at')
        .eq('room_id', this.roomId)
        .order('created_at', { ascending: false });

      if (old && old.length > 24) {
        const toDelete = old.slice(24).map(b => b.id);
        await supabase.from('backups').delete().in('id', toDelete);
      }

      this._lastBackupAt = Date.now();
      console.log(`💾 Backup cloud guardado (${districts.length}D, ${suppliers.length}S, ${products.length}P)`);
    } catch (err) {
      console.warn('💾 Backup error:', err);
    }
  }

  /** Get list of available cloud backups */
  async getBackups() {
    if (!this.roomId || !isSupabaseConfigured()) return [];

    const { data, error } = await supabase
      .from('backups')
      .select('id, device_id, created_at, data->counts, data->timestamp')
      .eq('room_id', this.roomId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) return [];
    return data || [];
  }

  /** Restore from a cloud backup */
  async restoreBackup(backupId) {
    if (!this.roomId || !isSupabaseConfigured()) throw new Error('No hay equipo activo');

    const { data, error } = await supabase
      .from('backups')
      .select('data')
      .eq('id', backupId)
      .single();

    if (error || !data?.data) throw new Error('Backup no encontrado');

    const snapshot = data.data;

    // Restore districts
    for (const d of (snapshot.districts || [])) {
      if (!d.uuid) continue;
      const existing = await db.table('districts').where('uuid').equals(d.uuid).first();
      if (!existing) {
        await db.table('districts').add({ ...d, id: undefined });
      }
    }

    // Restore suppliers
    for (const s of (snapshot.suppliers || [])) {
      if (!s.uuid) continue;
      const existing = await db.table('suppliers').where('uuid').equals(s.uuid).first();
      if (!existing) {
        await db.table('suppliers').add({ ...s, id: undefined });
      }
    }

    // Restore products
    for (const p of (snapshot.products || [])) {
      if (!p.uuid) continue;
      const existing = await db.table('products').where('uuid').equals(p.uuid).first();
      if (!existing) {
        await db.table('products').add({ ...p, id: undefined });
      }
    }

    if (this._reloadCallback) await this._reloadCallback();

    return {
      districts: snapshot.districts?.length || 0,
      suppliers: snapshot.suppliers?.length || 0,
      products: snapshot.products?.length || 0,
    };
  }

  // ─── Helpers ───

  _getOrCreateDeviceId() {
    let id = localStorage.getItem('fairscan_device_id');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('fairscan_device_id', id);
    }
    return id;
  }

  // Legacy aliases for backward compatibility
  async createRoom() { throw new Error('Use connectTeam() instead'); }
  async joinRoom() { throw new Error('Use connectTeam() instead'); }
  async leaveRoom() { return this.disconnectTeam(); }
  async resumeRoom(roomId) { return this.resumeTeam(roomId); }
}

// Singleton
const syncEngine = new SyncEngine();
export default syncEngine;
