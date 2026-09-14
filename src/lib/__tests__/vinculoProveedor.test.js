/**
 * El vínculo producto–proveedor al subir a la nube (hallazgo 1 del 13/09).
 *
 * Lo que pasaba: el mapa que traduce el número interno del teléfono al
 * identificador de la nube se armaba SOLO al arrancar la app. Un proveedor
 * escaneado en la misma sesión no estaba en el mapa, así que el producto subía
 * apuntando a la nada. Medido en producción el 14/09: 174 productos sin
 * proveedor, y 162 imposibles de reparar desde el servidor.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// toCloud sella cada fila con el id del dispositivo, que sale del navegador.
vi.stubGlobal('localStorage', { store: {}, getItem(k) { return this.store[k] || null; }, setItem(k, v) { this.store[k] = v; } });

const { default: idMapper } = await import('../idMapper.js');

describe('idMapper: traducir referencias de lo creado en esta sesión', () => {
  beforeEach(() => { idMapper.cache = { districts: {}, suppliers: {}, products: {} }; });

  it('sin registrar, un proveedor nuevo no se puede traducir (el bug)', () => {
    expect(idMapper.getUuid('suppliers', 7)).toBeNull();
    const nube = idMapper.toCloud('products', { uuid: 'p1', supplierId: 7, districtId: 3 }, 'equipo-1');
    expect(nube.supplier_id).toBeNull();
    expect(nube.district_id).toBeNull();
  });

  it('registrando al crear, el producto sube con su proveedor y su feria', () => {
    idMapper.register('suppliers', 7, 'uuid-proveedor');
    idMapper.register('districts', 3, 'uuid-feria');
    const nube = idMapper.toCloud('products', { uuid: 'p1', supplierId: 7, districtId: 3 }, 'equipo-1');
    expect(nube.supplier_id).toBe('uuid-proveedor');
    expect(nube.district_id).toBe('uuid-feria');
  });

  it('un producto sin proveedor sigue subiendo sin proveedor, no inventa uno', () => {
    idMapper.register('suppliers', 7, 'uuid-proveedor');
    const nube = idMapper.toCloud('products', { uuid: 'p1', supplierId: null, districtId: null }, 'equipo-1');
    expect(nube.supplier_id).toBeNull();
    expect(nube.district_id).toBeNull();
  });

  it('la traducción va en los dos sentidos', () => {
    idMapper.register('suppliers', 7, 'uuid-proveedor');
    expect(idMapper.getUuid('suppliers', 7)).toBe('uuid-proveedor');
    expect(idMapper.getLocalId('suppliers', 'uuid-proveedor')).toBe(7);
  });

  it('buildFromLocal sin base no explota (ya no importa db.js)', async () => {
    await expect(idMapper.buildFromLocal(undefined)).resolves.toBeUndefined();
  });

  it('buildFromLocal carga lo que hay y descarta lo que no tiene uuid', async () => {
    const fakeDb = {
      table: (t) => ({ toArray: async () => t === 'suppliers'
        ? [{ id: 7, uuid: 'uuid-proveedor' }, { id: 8 }]   // el 8 nunca se sincronizó
        : [] }),
    };
    await idMapper.buildFromLocal(fakeDb);
    expect(idMapper.getUuid('suppliers', 7)).toBe('uuid-proveedor');
    expect(idMapper.getUuid('suppliers', 8)).toBeNull();
  });
});
