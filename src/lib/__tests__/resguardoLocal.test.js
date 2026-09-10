import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { guardarResguardo, restaurarResguardo, hayResguardo, _reiniciarParaTests } from '../resguardoLocal.js';

function baseApp(nombre) {
  const db = new Dexie(nombre);
  db.version(1).stores({
    districts: '++id, name, uuid',
    suppliers: '++id, districtId, uuid',
    products: '++id, supplierId, districtId, uuid',
    settings: 'key',
    _syncQueue: '++id, table',
  });
  return db;
}

let n = 0;
let db;
beforeEach(async () => {
  _reiniciarParaTests();
  await Dexie.delete('fairscan_resguardo');
  db = baseApp(`app-${++n}`);
  await db.districts.add({ id: 1, name: 'Yiwu', uuid: 'd1' });
  await db.suppliers.add({ id: 7, districtId: 1, uuid: 's7', company: 'Bing Rong' });
  await db.products.bulkAdd([
    { id: 40, districtId: 1, supplierId: 7, uuid: 'p40', name: 'Copa', photos: [{ data: new Uint8Array([1, 2, 3]), type: 'image/jpeg' }] },
    { id: 41, districtId: 1, supplierId: 7, uuid: 'p41', name: 'Plato' },
  ]);
  await db.settings.put({ key: 'main', activeDistrictId: 1, roomId: 'equipo-x', lastUserId: 'u-amigo' });
});

describe('resguardo local antes de limpiar la base (lo del 10/09)', () => {
  it('guarda todo y lo devuelve tal cual, con los mismos ids y las fotos en bytes', async () => {
    expect(await guardarResguardo(db, 'u-amigo')).toBe(2);
    expect(await hayResguardo('u-amigo')).toBe(true);

    // La app limpia la base (otra cuenta entró) y la vuelve a crear vacía.
    await db.delete(); await db.open();
    expect(await db.products.count()).toBe(0);

    // Vuelve la cuenta original.
    expect(await restaurarResguardo(db, 'u-amigo')).toBe(2);
    const copa = await db.products.get(40);
    expect(copa.name).toBe('Copa');
    expect(copa.supplierId).toBe(7);
    expect(Array.from(copa.photos[0].data)).toEqual([1, 2, 3]);
    expect((await db.settings.get('main')).roomId).toBe('equipo-x');
    expect(await hayResguardo('u-amigo')).toBe(false); // se consume
  });

  it('otra cuenta no recibe el resguardo ajeno', async () => {
    await guardarResguardo(db, 'u-amigo');
    await db.delete(); await db.open();
    expect(await restaurarResguardo(db, 'u-otra')).toBe(0);
    expect(await db.products.count()).toBe(0);
    expect(await hayResguardo('u-amigo')).toBe(true); // sigue esperando a su dueña
  });

  it('si la base ya tiene datos, no pisa nada y descarta el resguardo', async () => {
    await guardarResguardo(db, 'u-amigo');
    await db.products.add({ id: 99, districtId: 1, uuid: 'p99', name: 'Nuevo' });
    expect(await restaurarResguardo(db, 'u-amigo')).toBe(0);
    expect(await db.products.count()).toBe(3);
    expect(await hayResguardo('u-amigo')).toBe(false);
  });

  it('sin usuaria no hace nada', async () => {
    expect(await guardarResguardo(db, null)).toBe(0);
    expect(await restaurarResguardo(db, undefined)).toBe(0);
  });
});
