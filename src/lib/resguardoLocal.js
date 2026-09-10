/**
 * Resguardo local antes de limpiar la base (2.12).
 *
 * Lo que pasó (10/09/2026): un usuario entró primero con otra cuenta y después
 * con la suya. La regla 2.12 limpió la base local y se llevó 495 productos que
 * nunca habían subido a la nube. Se recuperaron porque, dos minutos antes, la
 * app había hecho su copia automática horaria. Fue suerte.
 *
 * Desde ahora, antes de limpiar, todo lo local se copia a una base aparte del
 * mismo teléfono (`fairscan_resguardo`), a nombre de la cuenta que lo tenía.
 * Cuando esa cuenta vuelve a entrar y la base está vacía, se le devuelve tal
 * cual: mismos ids, mismas fotos en bytes, mismo equipo recordado. Funciona sin
 * señal y sin depender de permisos de la nube (la cuenta "equivocada" no puede
 * hacer una copia a un equipo que no es suyo).
 *
 * Si el resguardo no se puede escribir (sin espacio), la base NO se limpia:
 * perder datos es irreversible; ver un catálogo ajeno un rato, no.
 */
import Dexie from 'dexie';

const TABLAS = ['districts', 'suppliers', 'products', 'settings', '_syncQueue'];

let resguardo = null;
function base() {
  if (!resguardo) {
    resguardo = new Dexie('fairscan_resguardo');
    resguardo.version(1).stores({ copias: 'userId' });
  }
  return resguardo;
}

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

/**
 * Devuelve a `db` lo resguardado para `userId`, solo si la base está vacía de
 * productos y proveedores. Borra el resguardo al terminar. Devuelve cuántos
 * productos volvieron (0 = no había resguardo o no hacía falta).
 */
export async function restaurarResguardo(db, userId) {
  if (!userId) return 0;
  const copia = await base().copias.get(userId);
  if (!copia) return 0;
  const ocupada = (await db.products.count()) + (await db.suppliers.count());
  if (ocupada > 0) { await base().copias.delete(userId); return 0; }
  await db.transaction('rw', db.tables, async () => {
    for (const t of TABLAS) {
      if (!db.tables.some(x => x.name === t) || !copia[t]?.length) continue;
      await db.table(t).clear();
      await db.table(t).bulkPut(copia[t]);   // mismos ids: las referencias entre tablas siguen valiendo
    }
  });
  await base().copias.delete(userId);
  return copia.products.length;
}

/** Solo para tests. */
export function _reiniciarParaTests() { resguardo = null; }
