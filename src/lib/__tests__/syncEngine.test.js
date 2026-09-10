import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import Dexie from 'dexie';

// Stub browser globals needed by SyncEngine constructor
if (typeof globalThis.window === 'undefined') {
  globalThis.window = { addEventListener: () => {}, removeEventListener: () => {} };
}
if (!globalThis.window.addEventListener) globalThis.window.addEventListener = () => {};
try { globalThis.navigator = globalThis.navigator || {}; } catch {}
try { Object.defineProperty(globalThis.navigator, 'onLine', { value: true, writable: true, configurable: true }); } catch {}
if (typeof globalThis.navigator === 'undefined') {
  Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, writable: true, configurable: true });
}

// Create a fresh test database matching the app schema
let testDb;

function createTestDb() {
  const db = new Dexie('TestSyncDB');
  db.version(1).stores({
    districts: '++id, name, uuid',
    suppliers: '++id, districtId, company, uuid',
    products: '++id, supplierId, districtId, name, uuid',
    _syncQueue: '++id, table, uuid, action, timestamp',
  });
  return db;
}

// Mock modules
vi.mock('../supabase.js', () => ({
  supabase: {
    from: () => ({ select: () => ({ eq: () => ({ gt: () => ({ data: [], error: null }) }) }) }),
    channel: () => ({ on: function() { return this; }, subscribe: () => {} }),
    removeChannel: () => {},
  },
  isSupabaseConfigured: () => true,
}));

vi.mock('../../db.js', async () => {
  // This will be replaced per-test via the setup
  return {
    default: null, // Set in beforeEach
    addToSyncQueue: vi.fn(),
    getSyncQueue: vi.fn(() => []),
    deleteSyncQueueItem: vi.fn(),
    saveSettings: vi.fn(),
    recomputeUploadFlags: vi.fn(async () => {}),
  };
});

vi.stubGlobal('localStorage', {
  store: {},
  getItem(key) { return this.store[key] || null; },
  setItem(key, val) { this.store[key] = val; },
});

// Set a known device ID
localStorage.setItem('fairscan_device_id', 'device-A');

const { default: SyncEngineModule } = await import('../syncEngine.js');
const { default: idMapper } = await import('../idMapper.js');
const dbModule = await import('../../db.js');

describe('SyncEngine: _applyCloudRecord conflict resolution', () => {
  let engine;

  beforeEach(async () => {
    // Fresh database for each test
    if (testDb) {
      testDb.close();
      await Dexie.delete('TestSyncDB');
    }
    testDb = createTestDb();
    await testDb.open();

    // Patch the db module to use our test database
    dbModule.default = testDb;

    // Create a new engine instance
    engine = new SyncEngineModule.constructor();
    engine.deviceId = 'device-A';
    engine.roomId = 'room-123';

    // Reset idMapper cache
    idMapper.cache = { districts: {}, suppliers: {}, products: {} };
  });

  it('inserts new record from another device', async () => {
    const cloudRecord = {
      id: 'uuid-dist-new',
      device_id: 'device-B', // Different device
      name: 'Shanghai Fair',
      location: 'Shanghai',
      created_at: '2024-06-01T00:00:00Z',
      updated_at: '2024-06-01T00:00:00Z',
    };

    await engine._applyCloudRecord('districts', cloudRecord);

    const records = await testDb.districts.toArray();
    expect(records).toHaveLength(1);
    expect(records[0].name).toBe('Shanghai Fair');
    expect(records[0].uuid).toBe('uuid-dist-new');
    // Mapping should be registered
    expect(idMapper.getLocalId('districts', 'uuid-dist-new')).toBe(records[0].id);
  });

  it('updates local record when cloud is newer', async () => {
    // Insert a local record first
    const localId = await testDb.districts.add({
      uuid: 'uuid-dist-1', name: 'Old Name', location: 'Old',
      updatedAt: new Date('2024-01-01').getTime(),
    });
    idMapper.register('districts', localId, 'uuid-dist-1');

    const cloudRecord = {
      id: 'uuid-dist-1',
      device_id: 'device-B',
      name: 'New Name',
      location: 'New Location',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-06-01T00:00:00Z', // NEWER
    };

    await engine._applyCloudRecord('districts', cloudRecord);

    const record = await testDb.districts.get(localId);
    expect(record.name).toBe('New Name'); // Updated
  });

  it('does NOT update local record when cloud is older', async () => {
    const localId = await testDb.districts.add({
      uuid: 'uuid-dist-1', name: 'My Name', location: 'Mine',
      updatedAt: new Date('2024-12-01').getTime(), // Local is NEWER
    });
    idMapper.register('districts', localId, 'uuid-dist-1');

    const cloudRecord = {
      id: 'uuid-dist-1',
      device_id: 'device-B',
      name: 'Old Cloud Name',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-06-01T00:00:00Z', // OLDER than local
    };

    await engine._applyCloudRecord('districts', cloudRecord);

    const record = await testDb.districts.get(localId);
    expect(record.name).toBe('My Name'); // NOT overwritten
  });

  it('skips own-device records when local exists', async () => {
    const localId = await testDb.districts.add({
      uuid: 'uuid-dist-own', name: 'My Record',
      updatedAt: new Date('2024-01-01').getTime(),
    });
    idMapper.register('districts', localId, 'uuid-dist-own');

    const cloudRecord = {
      id: 'uuid-dist-own',
      device_id: 'device-A', // SAME device
      name: 'Should Not Update',
      updated_at: '2099-01-01T00:00:00Z', // Even if newer
    };

    await engine._applyCloudRecord('districts', cloudRecord);

    const record = await testDb.districts.get(localId);
    expect(record.name).toBe('My Record'); // Not touched
  });

  it('recreates own-device record if local data was lost', async () => {
    // No local record exists (simulating data loss)
    const cloudRecord = {
      id: 'uuid-lost-record',
      device_id: 'device-A', // OWN device, but local is missing
      name: 'Recovered Record',
      location: 'Somewhere',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    await engine._applyCloudRecord('districts', cloudRecord);

    const records = await testDb.districts.toArray();
    expect(records).toHaveLength(1);
    expect(records[0].name).toBe('Recovered Record');
  });
});

describe('SyncEngine: supplier conflict resolution preserves card data', () => {
  let engine;

  beforeEach(async () => {
    if (testDb) {
      testDb.close();
      await Dexie.delete('TestSyncDB');
    }
    testDb = createTestDb();
    await testDb.open();
    dbModule.default = testDb;

    engine = new SyncEngineModule.constructor();
    engine.deviceId = 'device-A';
    engine.roomId = 'room-123';
    idMapper.cache = { districts: {}, suppliers: {}, products: {} };
    idMapper.register('districts', 1, 'uuid-dist-1');
  });

  it('cloud supplier update includes cardPhotoUrl', async () => {
    const localId = await testDb.suppliers.add({
      uuid: 'uuid-sup-1', company: 'OldCo', districtId: 1,
      cardPhotoUrl: null,
      updatedAt: new Date('2024-01-01').getTime(),
    });
    idMapper.register('suppliers', localId, 'uuid-sup-1');

    const cloudRecord = {
      id: 'uuid-sup-1',
      device_id: 'device-B',
      district_id: 'uuid-dist-1',
      company: 'NewCo',
      card_photo_url: 'https://r2.dev/cards/newco.jpg', // Card uploaded on other device
      updated_at: '2024-06-01T00:00:00Z',
    };

    await engine._applyCloudRecord('suppliers', cloudRecord);

    const record = await testDb.suppliers.get(localId);
    expect(record.company).toBe('NewCo');
    expect(record.cardPhotoUrl).toBe('https://r2.dev/cards/newco.jpg');
  });
});

describe('Copias de seguridad: qué se borra y cuál se restaura (10/09)', async () => {
  const { copiasParaBorrar, copiaParaRestaurar } = await import('../syncEngine.js');
  const dia = 24 * 60 * 60 * 1000;
  const ahora = Date.parse('2026-09-10T12:00:00Z');
  const copia = (id, hace) => ({ id, created_at: new Date(ahora - hace).toISOString() });

  it('no borra nada de los últimos 7 días aunque haya más de 24', () => {
    const copias = Array.from({ length: 40 }, (_, i) => copia(`c${i}`, i * 3600 * 1000)); // una por hora, 40 h
    expect(copiasParaBorrar(copias, { ahora })).toEqual([]);
  });
  it('borra solo lo que está fuera de las 24 más nuevas Y tiene más de 7 días', () => {
    const copias = [...Array.from({ length: 30 }, (_, i) => copia(`n${i}`, i * dia / 24)), copia('vieja', 8 * dia), copia('viejisima', 30 * dia)];
    expect(copiasParaBorrar(copias, { ahora }).sort()).toEqual(['vieja', 'viejisima']);
  });
  it('con menos de 24 copias no borra ni las viejas', () => {
    expect(copiasParaBorrar([copia('a', 40 * dia), copia('b', 1)], { ahora })).toEqual([]);
  });
  it('para restaurar elige la más nueva con datos, no la vacía más nueva', () => {
    const copias = [
      { id: 'vacia', counts: { products: 0, suppliers: 98, districts: 6 } },
      { id: 'vacia2', counts: { products: 0, suppliers: 0 } },
      { id: 'buena', counts: { products: 495, suppliers: 233 } },
    ];
    expect(copiaParaRestaurar([copias[1], copias[2]]).id).toBe('buena');
    expect(copiaParaRestaurar(copias).id).toBe('vacia'); // 98 proveedores también son datos
    expect(copiaParaRestaurar([copias[1]]).id).toBe('vacia2'); // si todas están vacías, la más nueva
    expect(copiaParaRestaurar([])).toBeNull();
  });
});
