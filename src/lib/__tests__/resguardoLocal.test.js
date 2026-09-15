import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { guardarResguardo, restaurarResguardo, hayResguardo, fusionar, claveDeEquipo, clavesPosibles, borrarResguardos, _reiniciarParaTests } from '../resguardoLocal.js';

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
async function sembrar(db) {
  await db.districts.add({ id: 1, name: 'Yiwu', uuid: 'd1' });
  await db.suppliers.add({ id: 7, districtId: 1, uuid: 's7', company: 'Bing Rong' });
  await db.products.bulkAdd([
    { id: 40, districtId: 1, supplierId: 7, uuid: 'p40', name: 'Copa', photos: [{ data: new Uint8Array([1, 2, 3]), type: 'image/jpeg' }] },
    { id: 41, districtId: 1, supplierId: 7, uuid: 'p41', name: 'Plato' },
  ]);
  await db.settings.put({ key: 'main', activeDistrictId: 1, roomId: 'equipo-x', lastUserId: 'u-amiga' });
}
beforeEach(async () => {
  _reiniciarParaTests();
  await Dexie.delete('fairscan_resguardo');
  db = baseApp(`app-${++n}`);
  await sembrar(db);
});

describe('resguardo local antes de limpiar la base (lo del 10/09)', () => {
  it('guarda todo y lo devuelve tal cual en una base vacía: mismos ids, fotos en bytes', async () => {
    expect(await guardarResguardo(db, 'u-amiga')).toBe(2);
    expect(await hayResguardo('u-amiga')).toBe(true);
    await db.delete(); await db.open();
    expect(await db.products.count()).toBe(0);

    expect(await restaurarResguardo(db, 'u-amiga')).toBe(2);
    const copa = await db.products.get(40);
    expect(copa.name).toBe('Copa');
    expect(copa.supplierId).toBe(7);
    expect(Array.from(copa.photos[0].data)).toEqual([1, 2, 3]);
    expect((await db.settings.get('main')).roomId).toBe('equipo-x');
    expect(await hayResguardo('u-amiga')).toBe(false); // se consume recién después de devolverse
  });

  it('otra cuenta no recibe el resguardo ajeno, y el resguardo sigue esperando', async () => {
    await guardarResguardo(db, 'u-amiga');
    await db.delete(); await db.open();
    expect(await restaurarResguardo(db, 'u-otra')).toBe(0);
    expect(await db.products.count()).toBe(0);
    expect(await hayResguardo('u-amiga')).toBe(true);
  });

  it('sin usuaria no hace nada', async () => {
    expect(await guardarResguardo(db, null)).toBe(0);
    expect(await restaurarResguardo(db, undefined)).toBe(0);
  });
});

describe('hallazgo 2: con la base ocupada se FUSIONA, nunca se descarta', () => {
  it('lo que falta entra con ids nuevos y referencias traducidas; lo que ya está no se toca', async () => {
    await guardarResguardo(db, 'u-amiga');
    // La base se limpia y se vuelve a poblar desde la nube con OTROS ids locales
    // (misma feria y mismo proveedor por uuid, pero solo uno de los dos productos).
    await db.delete(); await db.open();
    await db.districts.add({ id: 30, name: 'Yiwu', uuid: 'd1' });
    await db.suppliers.add({ id: 50, districtId: 30, uuid: 's7', company: 'Bing Rong' });
    await db.products.add({ id: 90, districtId: 30, supplierId: 50, uuid: 'p41', name: 'Plato (de la nube)' });

    expect(await restaurarResguardo(db, 'u-amiga')).toBe(1);   // solo faltaba "Copa"
    expect(await db.products.count()).toBe(2);
    expect(await db.districts.count()).toBe(1);               // no duplicó la feria
    expect(await db.suppliers.count()).toBe(1);               // ni el proveedor
    const copa = await db.products.filter(p => p.uuid === 'p40').first();
    expect(copa.districtId).toBe(30);                         // referencia traducida al id nuevo
    expect(copa.supplierId).toBe(50);
    expect(Array.from(copa.photos[0].data)).toEqual([1, 2, 3]);
    const plato = await db.products.get(90);
    expect(plato.name).toBe('Plato (de la nube)');            // lo existente quedó igual
    expect(await hayResguardo('u-amiga')).toBe(false);        // consumido, porque se devolvió
  });

  it('un proveedor que solo estaba en el resguardo entra con su feria traducida', async () => {
    await db.suppliers.add({ id: 8, districtId: 1, uuid: 's8', company: 'Nuevo' });
    await db.products.add({ id: 42, districtId: 1, supplierId: 8, uuid: 'p42', name: 'Taza' });
    await guardarResguardo(db, 'u-amiga');
    await db.delete(); await db.open();
    await db.districts.add({ id: 30, name: 'Yiwu', uuid: 'd1' });
    await db.products.add({ id: 90, districtId: 30, supplierId: null, uuid: 'p41', name: 'Plato' });

    expect(await fusionar(db, {})).toBe(0);   // fusionar con una copia vacía no hace nada
    expect(await restaurarResguardo(db, 'u-amiga')).toBe(2);   // Copa y Taza
    const nuevoProv = await db.suppliers.filter(s => s.uuid === 's8').first();
    expect(nuevoProv.districtId).toBe(30);
    const taza = await db.products.filter(p => p.uuid === 'p42').first();
    expect(taza.supplierId).toBe(nuevoProv.id);
  });

  it('si devolver falla, el resguardo NO se borra', async () => {
    await guardarResguardo(db, 'u-amiga');
    await db.delete(); await db.open();
    const rota = { ...db, products: { count: async () => { throw new Error('disco'); } }, suppliers: db.suppliers };
    await expect(restaurarResguardo(rota, 'u-amiga')).rejects.toThrow('disco');
    expect(await hayResguardo('u-amiga')).toBe(true);
  });
});

describe('hallazgo 3 (R3): base vieja sin usuaria anotada', () => {
  it('se guarda a nombre del equipo y se devuelve buscando por equipo', async () => {
    await guardarResguardo(db, claveDeEquipo('equipo-x'));
    await db.delete(); await db.open();
    expect(await restaurarResguardo(db, 'u-amiga', { roomIds: ['equipo-x'] })).toBe(2);
    expect(await db.products.count()).toBe(2);
  });
  it('clavesPosibles junta la usuaria y sus equipos', () => {
    expect(clavesPosibles('u1', ['a', null, 'b'])).toEqual(['u1', 'equipo:a', 'equipo:b']);
    expect(clavesPosibles(null, [])).toEqual([]);
  });
});

describe('hallazgo 11: al borrar la cuenta no queda resguardo en el teléfono', () => {
  it('borrarResguardos elimina la base entera', async () => {
    await guardarResguardo(db, 'u-amiga');
    expect(await hayResguardo('u-amiga')).toBe(true);
    await borrarResguardos();
    expect(await hayResguardo('u-amiga')).toBe(false);
  });
});
