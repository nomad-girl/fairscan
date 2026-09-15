/**
 * Resguardo local antes de limpiar la base (2.12).
 *
 * Lo que pasó (10/09/2026): un usuario entró primero con otra cuenta y después
 * con la suya. La regla 2.12 limpió la base local y se llevó 495 productos que
 * nunca habían subido a la nube. Se recuperaron porque, dos minutos antes, la
 * app había hecho su copia automática horaria. Fue suerte.
 *
 * Desde entonces, antes de limpiar, todo lo local se copia a una base aparte del
 * mismo teléfono (`fairscan_resguardo`), a nombre de la cuenta que lo tenía.
 * Cuando esa cuenta vuelve a entrar, se le devuelve. Funciona sin señal y sin
 * depender de permisos de la nube.
 *
 * Lo que corrigió el análisis del 13/09 (hallazgo 2): la primera versión BORRABA
 * el resguardo si la base ya tenía algo adentro, sin devolver nada. O sea que la
 * red de seguridad podía tirar la última copia. Reglas de ahora:
 *   · Un resguardo solo se borra después de haberse devuelto entero.
 *   · Si la base está vacía, vuelve tal cual: mismos ids, mismas fotos en bytes.
 *   · Si la base ya tiene cosas, se FUSIONA: entra lo que falta (por uuid), con
 *     ids nuevos y las referencias entre tablas traducidas. Nada se pisa.
 *   · Una base vieja sin usuaria anotada se resguarda a nombre de su equipo, y
 *     se busca también por equipo al devolver (antes se escribía y nunca se leía).
 *
 * Si el resguardo no se puede escribir (sin espacio), la base NO se limpia:
 * perder datos es irreversible; ver un catálogo ajeno un rato, no.
 */
import Dexie from 'dexie';

const TABLAS = ['districts', 'suppliers', 'products', 'settings', '_syncQueue'];
const NOMBRE_BASE = 'fairscan_resguardo';

let resguardo = null;
function base() {
  if (!resguardo) {
    resguardo = new Dexie(NOMBRE_BASE);
    resguardo.version(1).stores({ copias: 'userId' });
  }
  return resguardo;
}

/** Clave con la que se guarda una base sin usuaria anotada. */
export const claveDeEquipo = (roomId) => `equipo:${roomId || 'sin-equipo'}`;

/** Copia todas las tablas de `db` a nombre de `userId`. Devuelve cuántos productos guardó. */
export async function guardarResguardo(db, userId) {
  if (!userId) return 0;
  const copia = { userId, creadoEn: Date.now() };
  for (const t of TABLAS) copia[t] = db.tables.some(x => x.name === t) ? await db.table(t).toArray() : [];
  await base().copias.put(copia);
  return copia.products.length;
}

export async function hayResguardo(userId) {
  if (!userId) return false;
  return !!(await base().copias.get(userId));
}

/** Todas las claves bajo las que puede estar guardado lo de esta usuaria. */
export function clavesPosibles(userId, roomIds = []) {
  const claves = [];
  if (userId) claves.push(userId);
  for (const r of roomIds || []) if (r) claves.push(claveDeEquipo(r));
  return claves;
}

/**
 * Devuelve a `db` lo resguardado para `userId` (o para alguno de sus equipos).
 * Devuelve cuántos productos volvieron (0 = no había resguardo o no hacía falta).
 * Nunca borra un resguardo que no se haya devuelto.
 */
export async function restaurarResguardo(db, userId, { roomIds = [] } = {}) {
  if (!userId) return 0;
  let total = 0;
  for (const clave of clavesPosibles(userId, roomIds)) {
    const copia = await base().copias.get(clave);
    if (!copia) continue;
    const ocupada = (await db.products.count()) + (await db.suppliers.count());
    const devueltos = ocupada > 0 ? await fusionar(db, copia) : await reponerEntera(db, copia);
    await base().copias.delete(clave);   // recién ahora: ya está devuelto
    total += devueltos;
  }
  return total;
}

/** Base vacía: vuelve todo tal cual, con los mismos ids. */
async function reponerEntera(db, copia) {
  await db.transaction('rw', db.tables, async () => {
    for (const t of TABLAS) {
      if (!db.tables.some(x => x.name === t) || !copia[t]?.length) continue;
      await db.table(t).clear();
      await db.table(t).bulkPut(copia[t]);   // mismos ids: las referencias entre tablas siguen valiendo
    }
  });
  return copia.products?.length || 0;
}

/**
 * Base con cosas: entra lo que falta (por uuid), con ids nuevos y referencias
 * traducidas. Lo que ya está no se toca. Devuelve cuántos productos entraron.
 */
export async function fusionar(db, copia) {
  const mapa = { districts: new Map(), suppliers: new Map() };   // id viejo → id nuevo
  let productosNuevos = 0;

  await db.transaction('rw', db.districts, db.suppliers, db.products, async () => {
    const existentes = async (t) => new Set((await db.table(t).toArray()).map(r => r.uuid).filter(Boolean));
    const uuidALocal = async (t) => new Map((await db.table(t).toArray()).filter(r => r.uuid).map(r => [r.uuid, r.id]));

    // Ferias
    const feriasQueHay = await uuidALocal('districts');
    for (const d of copia.districts || []) {
      if (!d.uuid) continue;
      if (feriasQueHay.has(d.uuid)) { mapa.districts.set(d.id, feriasQueHay.get(d.uuid)); continue; }
      const { id: _viejo, ...sin } = d;
      const nuevo = await db.districts.add(sin);
      mapa.districts.set(d.id, nuevo);
    }

    // Proveedores
    const provQueHay = await uuidALocal('suppliers');
    for (const s of copia.suppliers || []) {
      if (!s.uuid) continue;
      if (provQueHay.has(s.uuid)) { mapa.suppliers.set(s.id, provQueHay.get(s.uuid)); continue; }
      const { id: _viejo, ...sin } = s;
      if (sin.districtId != null) sin.districtId = mapa.districts.get(sin.districtId) ?? null;
      const nuevo = await db.suppliers.add(sin);
      mapa.suppliers.set(s.id, nuevo);
    }

    // Productos
    const prodQueHay = await existentes('products');
    for (const p of copia.products || []) {
      if (!p.uuid || prodQueHay.has(p.uuid)) continue;
      const { id: _viejo, ...sin } = p;
      if (sin.districtId != null) sin.districtId = mapa.districts.get(sin.districtId) ?? null;
      if (sin.supplierId != null) sin.supplierId = mapa.suppliers.get(sin.supplierId) ?? null;
      await db.products.add(sin);
      productosNuevos++;
    }
  });
  return productosNuevos;
}

/** Al borrar la cuenta no puede quedar nada de la usuaria en el teléfono (hallazgo 11). */
export async function borrarResguardos() {
  try { resguardo?.close?.(); } catch { /* ya cerrada */ }
  resguardo = null;
  await Dexie.delete(NOMBRE_BASE);
}

/** Solo para tests. */
export function _reiniciarParaTests() { resguardo = null; }
