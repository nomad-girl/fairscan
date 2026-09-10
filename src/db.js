import Dexie from 'dexie';
import { fotosSinSubir, tarjetaSinSubir } from './lib/fotosPendientes.js';
import { decidirFeriaActiva } from './lib/feriaAutomatica.js';
import { productoParaUI, productoParaGuardar, proveedorParaUI, proveedorParaGuardar, liberarObjectUrls, tieneFotosEnTexto, esDataUrl, paraGuardar } from './lib/fotosBinario.js';

const db = new Dexie('FairScanDB');

db.version(1).stores({
  districts: '++id, name',
  suppliers: '++id, districtId, company, ai_processed',
  products:  '++id, supplierId, districtId, name, category, createdAt, ai_processed',
  settings:  'key',
});

// Version 2: Add UUID, roomId, updatedAt for cloud sync + offline queue
db.version(2).stores({
  districts: '++id, name, uuid, roomId',
  suppliers: '++id, districtId, company, ai_processed, uuid, roomId',
  products:  '++id, supplierId, districtId, name, category, createdAt, ai_processed, uuid, roomId',
  settings:  'key',
  _syncQueue: '++id, table, uuid, action, timestamp',
}).upgrade(tx => {
  // Assign UUIDs to all existing records that don't have one
  return Promise.all([
    tx.table('districts').toCollection().modify(record => {
      if (!record.uuid) record.uuid = crypto.randomUUID();
      if (!record.updatedAt) record.updatedAt = record.createdAt || Date.now();
    }),
    tx.table('suppliers').toCollection().modify(record => {
      if (!record.uuid) record.uuid = crypto.randomUUID();
      if (!record.updatedAt) record.updatedAt = record.createdAt || Date.now();
    }),
    tx.table('products').toCollection().modify(record => {
      if (!record.uuid) record.uuid = crypto.randomUUID();
      if (!record.updatedAt) record.updatedAt = record.createdAt || Date.now();
    }),
  ]);
});

// Version 3: bandera indexada "hay fotos sin subir a la nube" (pieza 2.7).
// IndexedDB no indexa booleanos, por eso es 1/0. Permite encontrar lo pendiente
// sin recorrer todos los productos (que traen las fotos adentro y pesan).
db.version(3).stores({
  districts: '++id, name, uuid, roomId',
  suppliers: '++id, districtId, company, ai_processed, uuid, roomId, cardUploadPending',
  products:  '++id, supplierId, districtId, name, category, createdAt, ai_processed, uuid, roomId, uploadPending',
  settings:  'key',
  _syncQueue: '++id, table, uuid, action, timestamp',
}).upgrade(tx => Promise.all([
  tx.table('products').toCollection().modify(p => { p.uploadPending = fotosSinSubir(p).length ? 1 : 0; }),
  tx.table('suppliers').toCollection().modify(s => { s.cardUploadPending = tarjetaSinSubir(s) ? 1 : 0; }),
]));

// Version 4: bandera indexada "falta procesar con IA" (pieza 3.5). El motor de IA
// preguntaba "¿qué falta?" recorriendo todos los productos con las fotos adentro,
// porque IndexedDB no indexa verdadero/falso. Con 1/0 indexado, trae solo lo pendiente.
db.version(4).stores({
  districts: '++id, name, uuid, roomId',
  suppliers: '++id, districtId, company, ai_processed, uuid, roomId, cardUploadPending, aiPendiente',
  products:  '++id, supplierId, districtId, name, category, createdAt, ai_processed, uuid, roomId, uploadPending, aiPendiente',
  settings:  'key',
  _syncQueue: '++id, table, uuid, action, timestamp',
}).upgrade(tx => Promise.all([
  tx.table('products').toCollection().modify(p => { p.aiPendiente = p.ai_processed ? 0 : 1; }),
  tx.table('suppliers').toCollection().modify(s => { s.aiPendiente = s.ai_processed ? 0 : 1; }),
]));

/** La bandera "falta IA" siempre sale de ai_processed: un solo lugar. */
function conBanderaIA(changes) {
  if (changes && 'ai_processed' in changes) changes.aiPendiente = changes.ai_processed ? 0 : 1;
  return changes;
}

/** Deja las banderas indexadas ("fotos por subir", "falta IA") acorde al registro. */
export async function recomputeUploadFlags(table, id) {
  const rec = await db.table(table).get(id);
  if (!rec) return;
  const cambios = {};
  const ia = rec.ai_processed ? 0 : 1;
  if (rec.aiPendiente !== ia) cambios.aiPendiente = ia;
  if (table === 'products') {
    const flag = fotosSinSubir(rec).length ? 1 : 0;
    if (rec.uploadPending !== flag) cambios.uploadPending = flag;
  } else if (table === 'suppliers') {
    const flag = tarjetaSinSubir(rec) ? 1 : 0;
    if (rec.cardUploadPending !== flag) cambios.cardUploadPending = flag;
  }
  if (Object.keys(cambios).length) await db.table(table).update(id, cambios);
}

// ─── Sync engine reference (set externally to avoid circular imports) ───
let _syncEngine = null;
export function setSyncEngine(engine) { _syncEngine = engine; }
export function getSyncEngine() { return _syncEngine; }

// ─── Default data ───
// Feria creada sola con la fecha del día, nombre editable después (decisión 6 del 04/09).
const feriaPorDefecto = () => {
  const hoy = new Date();
  const fecha = hoy.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
  return { name: `Feria ${fecha}`, location: "", emoji: "📍", dates: fecha };
};

const DEFAULT_SETTINGS = {
  activeDistrictId: null,
  theme: "dark",
  preset: "vajilla",
  minMargin: 40,
  categories: ["Vajilla","Cristalería","Té / Café","Cubiertos","Deco / Hogar"],
  materials: ["Porcelana","Bone China","Vidrio","Borosilicato","Cristal","Cerámica","Melamina","Acero Inox"],
  packagingTypes: ["Standard","Gift box","Premium / Display","Bulk","Color box"],
  variantTypes: ["Individual","Set x2","Set x4","Set x6","Set x12","Variante color","Variante tamaño"],
};

// ─── Init: seed default district + settings on first run ───
export async function initDB() {
  const distCount = await db.districts.count();
  if (distCount === 0) {
    const id = await db.districts.add({
      ...feriaPorDefecto(),
      uuid: crypto.randomUUID(),
      updatedAt: Date.now(),
      autoCreada: 1, // no sube a la nube hasta tener algo adentro (ver feriaAutomatica.js)
    });
    await db.settings.put({ key: 'main', ...DEFAULT_SETTINGS, activeDistrictId: id });
    return;
  }
  const existing = await db.settings.get('main');
  if (!existing) {
    const first = await db.districts.toCollection().first();
    await db.settings.put({ key: 'main', ...DEFAULT_SETTINGS, activeDistrictId: first?.id || null });
  }
}

/**
 * Después de cargar o sincronizar: si la feria activa es la automática y sigue
 * vacía pero ya hay ferias reales, se descarta y la activa pasa a la más reciente.
 * También cubre una activa que ya no existe. Devuelve true si cambió algo.
 */
export async function ajustarFeriaAutomatica() {
  const st = await db.settings.get('main');
  if (!st) return false;
  const [districts, products, suppliers] = await Promise.all([
    db.districts.toArray(), db.products.toArray(), db.suppliers.toArray(),
  ]);
  const r = decidirFeriaActiva({ districts, products, suppliers, activeDistrictId: st.activeDistrictId });
  if (!r) return false;
  if (r.borrarId != null) await db.districts.delete(r.borrarId); // local: nunca subió
  await db.settings.put({ ...st, activeDistrictId: r.activarId, key: 'main' });
  return true;
}

// ─── Settings ───
export async function getSettings() {
  const s = await db.settings.get('main');
  return s || { key: 'main', ...DEFAULT_SETTINGS };
}

export async function saveSettings(changes) {
  const current = await getSettings();
  await db.settings.put({ ...current, ...changes, key: 'main' });
}

// ─── Districts ───
export async function getDistricts() {
  return db.districts.toArray();
}

export async function addDistrict(d) {
  d.uuid = d.uuid || crypto.randomUUID();
  d.updatedAt = Date.now();
  const id = await db.districts.add(d);
  // Push to cloud if in a room
  if (_syncEngine?.roomId) {
    _syncEngine.pushRecord('districts', { ...d, id }).catch(console.warn);
  }
  return id;
}

export async function updateDistrict(id, changes) {
  changes.updatedAt = Date.now();
  await db.districts.update(id, changes);
  if (_syncEngine?.roomId) {
    const record = await db.districts.get(id);
    if (record) _syncEngine.pushRecord('districts', record).catch(console.warn);
  }
}

export async function deleteDistrict(id) {
  const record = await db.districts.get(id);
  await db.districts.delete(id);
  if (_syncEngine?.roomId && record?.uuid) {
    _syncEngine.pushDelete('districts', record.uuid).catch(console.warn);
  }
}

// ─── Suppliers ───
export async function getSuppliers() {
  return (await db.suppliers.toArray()).map(proveedorParaUI);
}

export async function addSupplier(s) {
  Object.assign(s, proveedorParaGuardar(s));
  s.uuid = s.uuid || crypto.randomUUID();
  s.updatedAt = Date.now();
  s.cardUploadPending = tarjetaSinSubir(s) ? 1 : 0;
  s.aiPendiente = s.ai_processed ? 0 : 1;
  const id = await db.suppliers.add(s);
  if (_syncEngine?.roomId) {
    _syncEngine.pushRecord('suppliers', { ...s, id }).catch(console.warn);
  }
  return id;
}

export async function updateSupplier(id, changes) {
  Object.assign(changes, proveedorParaGuardar(changes));
  changes.updatedAt = Date.now();
  conBanderaIA(changes);
  await db.suppliers.update(id, changes);
  if ('cardPhoto' in changes || 'cardPhotoUrl' in changes) await recomputeUploadFlags('suppliers', id);
  if (_syncEngine?.roomId) {
    const record = await db.suppliers.get(id);
    if (record) _syncEngine.pushRecord('suppliers', record).catch(console.warn);
  }
}

export async function deleteSupplier(id) {
  const record = await db.suppliers.get(id);
  await db.suppliers.delete(id);
  // Also unlink any products referencing this supplier
  const linkedProducts = await db.products.where('supplierId').equals(id).toArray();
  for (const p of linkedProducts) {
    await db.products.update(p.id, { supplierId: null, supplierCompany: null, updatedAt: Date.now() });
  }
  if (_syncEngine?.roomId && record?.uuid) {
    _syncEngine.pushDelete('suppliers', record.uuid).catch(console.warn);
  }
}

// ─── Products ───
export async function getProducts() {
  // Las fotos salen de la base como bytes y llegan a la pantalla como blob: (3.2).
  return (await db.products.orderBy('createdAt').reverse().toArray()).map(productoParaUI);
}

/**
 * Pasa a bytes las fotos que quedaron guardadas como texto (base de antes de 3.2),
 * de a pocas y con pausas: se corre en segundo plano al abrir, una sola vez.
 */
export async function convertirFotosABinario({ tanda = 8, pausaMs = 80 } = {}) {
  const st = await getSettings();
  if (st.fotosBinarioListo) return 0;
  let convertidos = 0;
  const ids = await db.products.toCollection().primaryKeys();
  for (let i = 0; i < ids.length; i += tanda) {
    const filas = await db.products.bulkGet(ids.slice(i, i + tanda));
    for (const f of filas) {
      if (f && tieneFotosEnTexto(f)) { await db.products.update(f.id, { photos: f.photos.map(paraGuardar) }); convertidos++; }
    }
    await new Promise(r => setTimeout(r, pausaMs));
  }
  const sids = await db.suppliers.toCollection().primaryKeys();
  for (let i = 0; i < sids.length; i += tanda) {
    const filas = await db.suppliers.bulkGet(sids.slice(i, i + tanda));
    for (const f of filas) {
      if (f && esDataUrl(f.cardPhoto)) { await db.suppliers.update(f.id, { cardPhoto: paraGuardar(f.cardPhoto) }); convertidos++; }
    }
    await new Promise(r => setTimeout(r, pausaMs));
  }
  await saveSettings({ fotosBinarioListo: true });
  return convertidos;
}

export async function addProduct(p) {
  Object.assign(p, productoParaGuardar(p));
  p.uuid = p.uuid || crypto.randomUUID();
  p.updatedAt = Date.now();
  p.uploadPending = fotosSinSubir(p).length ? 1 : 0;
  p.aiPendiente = p.ai_processed ? 0 : 1;
  const id = await db.products.add(p);
  if (_syncEngine?.roomId) {
    _syncEngine.pushRecord('products', { ...p, id }).catch(console.warn);
  }
  return id;
}

export async function updateProduct(id, changes) {
  Object.assign(changes, productoParaGuardar(changes));
  changes.updatedAt = Date.now();
  conBanderaIA(changes);
  await db.products.update(id, changes);
  if ('photos' in changes || 'photoUrls' in changes) await recomputeUploadFlags('products', id);
  if (_syncEngine?.roomId) {
    const record = await db.products.get(id);
    if (record) _syncEngine.pushRecord('products', record).catch(console.warn);
  }
}

export async function deleteProduct(id) {
  const record = await db.products.get(id);
  await db.products.delete(id);
  liberarObjectUrls(`p:${id}:`);
  if (_syncEngine?.roomId && record?.uuid) {
    _syncEngine.pushDelete('products', record.uuid).catch(console.warn);
  }
}

// ─── Sync Queue (offline operations) ───
export async function addToSyncQueue(entry) {
  return db.table('_syncQueue').add(entry);
}

export async function getSyncQueue() {
  return db.table('_syncQueue').toArray();
}

export async function clearSyncQueue() {
  return db.table('_syncQueue').clear();
}

export async function deleteSyncQueueItem(id) {
  return db.table('_syncQueue').delete(id);
}

export default db;
