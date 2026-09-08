import { describe, it, expect } from 'vitest';
import { groupBySupplier } from '../supplierGroups.js';

const sup = (id, company, createdAt, extra = {}) => ({ id, company, createdAt, districtId: 1, ...extra });
const prod = (id, supplierId, createdAt, extra = {}) => ({ id, supplierId, createdAt, districtId: 1, ...extra });

describe('groupBySupplier', () => {
  it('un proveedor sin productos aparece igual (N4: tarjetas gratis tienen que verse)', () => {
    const groups = groupBySupplier({
      suppliers: [sup(1, 'Yiwu Lights', 100)],
      products: [],
    });
    expect(groups).toHaveLength(1);
    expect(groups[0].supplier.company).toBe('Yiwu Lights');
    expect(groups[0].products).toEqual([]);
  });

  it('cuelga cada producto de su proveedor', () => {
    const groups = groupBySupplier({
      suppliers: [sup(1, 'A', 100), sup(2, 'B', 200)],
      products: [prod(10, 1, 300), prod(11, 2, 310), prod(12, 1, 320)],
    });
    const byName = Object.fromEntries(groups.map(g => [g.supplier.company, g.products.map(p => p.id)]));
    expect(byName).toEqual({ A: [10, 12], B: [11] });
  });

  it('el proveedor más reciente va arriba, tenga productos o no; "Sin proveedor" al final', () => {
    const groups = groupBySupplier({
      suppliers: [sup(1, 'Viejo con productos', 100), sup(2, 'Recién escaneado', 900)],
      products: [prod(10, 1, 500), prod(11, null, 600)],
    });
    expect(groups.map(g => g.supplier?.company ?? null)).toEqual(['Recién escaneado', 'Viejo con productos', null]);
  });

  it('productos con solo un nombre de empresa forman su propio grupo', () => {
    const groups = groupBySupplier({
      suppliers: [],
      products: [prod(10, null, 1, { supplierCompany: 'Sin vínculo SA' }), prod(11, null, 2, { supplierCompany: 'Sin vínculo SA' })],
    });
    expect(groups).toHaveLength(1);
    expect(groups[0].supplier._unlinked).toBe(true);
    expect(groups[0].products).toHaveLength(2);
  });

  it('un producto vinculado a un proveedor de otra feria no se pierde', () => {
    const groups = groupBySupplier({ suppliers: [], products: [prod(10, 77, 1)] });
    expect(groups).toHaveLength(1);
    expect(groups[0].products[0].id).toBe(10);
  });

  it('con búsqueda, un proveedor vacío solo aparece si la búsqueda le pega a él', () => {
    const suppliers = [sup(1, 'Guangzhou Textiles', 100, { contact: 'Lin' }), sup(2, 'Otro', 200)];
    expect(groupBySupplier({ suppliers, products: [], search: 'textil' }).map(g => g.supplier.company)).toEqual(['Guangzhou Textiles']);
    expect(groupBySupplier({ suppliers, products: [], search: 'lin' }).map(g => g.supplier.company)).toEqual(['Guangzhou Textiles']);
    expect(groupBySupplier({ suppliers, products: [], search: 'zzz' })).toEqual([]);
  });

  it('con filtros de producto activos, los proveedores vacíos se ocultan', () => {
    const groups = groupBySupplier({
      suppliers: [sup(1, 'Vacío', 100), sup(2, 'Con producto', 50)],
      products: [prod(10, 2, 1)],
      filtersActive: true,
    });
    expect(groups.map(g => g.supplier.company)).toEqual(['Con producto']);
  });
});
