import Dexie from 'dexie';

const db = new Dexie('FairScanDB');

db.version(1).stores({
  districts: '++id, name',
  suppliers: '++id, districtId, company, ai_processed',
  products:  '++id, supplierId, districtId, name, category, createdAt, ai_processed',
  settings:  'key',
});

// ─── Default data ───
const DEFAULT_DISTRICT = {
  name: "Canton Fair",
  location: "Guangzhou, China",
  emoji: "🏮",
  dates: "Abr 2026",
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
    const id = await db.districts.add(DEFAULT_DISTRICT);
    await db.settings.put({ key: 'main', ...DEFAULT_SETTINGS, activeDistrictId: id });
    return;
  }
  const existing = await db.settings.get('main');
  if (!existing) {
    const first = await db.districts.toCollection().first();
    await db.settings.put({ key: 'main', ...DEFAULT_SETTINGS, activeDistrictId: first?.id || null });
  }
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
  return db.districts.add(d);
}

export async function deleteDistrict(id) {
  await db.districts.delete(id);
}

// ─── Suppliers ───
export async function getSuppliers() {
  return db.suppliers.toArray();
}

export async function addSupplier(s) {
  return db.suppliers.add(s);
}

export async function updateSupplier(id, changes) {
  await db.suppliers.update(id, changes);
}

// ─── Products ───
export async function getProducts() {
  return db.products.orderBy('createdAt').reverse().toArray();
}

export async function addProduct(p) {
  return db.products.add(p);
}

export async function updateProduct(id, changes) {
  await db.products.update(id, changes);
}

export async function deleteProduct(id) {
  await db.products.delete(id);
}

export default db;
