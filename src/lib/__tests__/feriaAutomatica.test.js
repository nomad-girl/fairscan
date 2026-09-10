import { describe, it, expect } from 'vitest';
import { feriaAutomaticaVacia, feriaMasReciente, decidirFeriaActiva } from '../feriaAutomatica.js';

const auto = { id: 9, name: 'Feria 10 de sept de 2026', autoCreada: 1, updatedAt: 5000 };
const yiwu = { id: 1, name: 'Yiwu', updatedAt: 100 };
const canton = { id: 2, name: 'Cantón', updatedAt: 200 };

describe('feriaAutomaticaVacia', () => {
  it('una feria normal nunca cuenta como automática', () => {
    expect(feriaAutomaticaVacia(yiwu, { products: [] })).toBe(false);
  });
  it('la automática sin nada adentro está vacía', () => {
    expect(feriaAutomaticaVacia(auto, { products: [{ districtId: 1 }], suppliers: [] })).toBe(true);
  });
  it('con un producto o un proveedor deja de estar vacía', () => {
    expect(feriaAutomaticaVacia(auto, { products: [{ districtId: 9 }] })).toBe(false);
    expect(feriaAutomaticaVacia(auto, { suppliers: [{ districtId: 9 }] })).toBe(false);
  });
});

describe('feriaMasReciente', () => {
  it('gana la feria con el producto más nuevo, no la editada más tarde', () => {
    const products = [{ districtId: 1, createdAt: 900 }, { districtId: 2, createdAt: 300 }];
    expect(feriaMasReciente([yiwu, canton], products).id).toBe(1);
  });
  it('sin productos, gana la actualizada más recientemente', () => {
    expect(feriaMasReciente([yiwu, canton], []).id).toBe(2);
  });
  it('sin ferias devuelve null', () => {
    expect(feriaMasReciente([], [])).toBeNull();
  });
});

describe('decidirFeriaActiva: lo que pasó el 10/09 (495 productos bajados y catálogo "vacío")', () => {
  it('automática vacía activa + ferias reales bajadas: se descarta y se activa la real', () => {
    const products = [{ districtId: 1, createdAt: 900 }, { districtId: 2, createdAt: 300 }];
    const r = decidirFeriaActiva({ districts: [auto, yiwu, canton], products, activeDistrictId: 9 });
    expect(r).toEqual({ borrarId: 9, activarId: 1 });
  });
  it('teléfono nuevo sin nube: la automática es la única y se queda', () => {
    expect(decidirFeriaActiva({ districts: [auto], products: [], activeDistrictId: 9 })).toBeNull();
  });
  it('la automática ya tiene un producto: no se toca aunque haya otras', () => {
    const r = decidirFeriaActiva({ districts: [auto, yiwu], products: [{ districtId: 9, createdAt: 1 }], activeDistrictId: 9 });
    expect(r).toBeNull();
  });
  it('una feria real activa: no se toca', () => {
    expect(decidirFeriaActiva({ districts: [auto, yiwu], products: [], activeDistrictId: 1 })).toBeNull();
  });
  it('la activa ya no existe (la borraron desde otro teléfono): se elige otra sin borrar nada', () => {
    const r = decidirFeriaActiva({ districts: [yiwu, canton], products: [], activeDistrictId: 77 });
    expect(r).toEqual({ activarId: 2 });
  });
  it('sin ferias no hay nada que hacer', () => {
    expect(decidirFeriaActiva({ districts: [], products: [], activeDistrictId: null })).toBeNull();
  });
});
