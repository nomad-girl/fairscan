import { describe, it, expect } from 'vitest';
import { TABLAS, claveDeVolcado, armarVolcado, volcadosParaBorrar, autorizado, columnaDeOrden } from '../respaldo.js';

describe('volcado completo: piezas puras', () => {
  it('la clave va en su carpeta, con fecha y un token que no se adivina', () => {
    const k = claveDeVolcado(new Date('2026-09-15T12:00:00Z'), 'abc123');
    expect(k).toBe('respaldos/abc123/base-2026-09-15.json');
    const otra = claveDeVolcado();
    expect(otra).toMatch(/^respaldos\/[A-Za-z0-9_-]{20,}\/base-\d{4}-\d{2}-\d{2}\.json$/);
    expect(claveDeVolcado()).not.toBe(claveDeVolcado());
  });

  it('arma el documento con conteos por tabla y todas las tablas presentes', () => {
    const v = armarVolcado({ products: [{ id: 1 }, { id: 2 }], teams: [{ id: 't' }] }, { fecha: new Date('2026-09-15T12:00:00Z'), objetosEnBucket: { productos: 5, tarjetas: 1 } });
    expect(v.filas.products).toBe(2);
    expect(v.filas.teams).toBe(1);
    expect(v.filas.suppliers).toBe(0);
    expect(Object.keys(v.tablas)).toEqual(TABLAS);
    expect(v.objetosEnBucket).toEqual({ productos: 5, tarjetas: 1 });
    expect(v.motivo).toBe('semanal');
  });

  it('conserva los 8 más nuevos y borra el resto, ignorando lo que no es un volcado', () => {
    const claves = [];
    for (let i = 1; i <= 10; i++) claves.push(`respaldos/t${i}/base-2026-09-${String(i).padStart(2, '0')}.json`);
    claves.push('products/x/y.jpg', 'respaldos/raro.txt');
    const borrar = volcadosParaBorrar(claves, 8);
    expect(borrar).toEqual(['respaldos/t2/base-2026-09-02.json', 'respaldos/t1/base-2026-09-01.json']);
  });

  it('con menos de 8 no borra nada', () => {
    expect(volcadosParaBorrar(['respaldos/a/base-2026-09-01.json'], 8)).toEqual([]);
  });

  it('autoriza la corrida programada y la manual con secreto, y nada más', () => {
    expect(autorizado({ body: JSON.stringify({ next_run: '2026-09-22T06:00:00Z' }), headers: {} }, 's')).toBe('programado');
    expect(autorizado({ body: '', headers: { authorization: 'Bearer s' } }, 's')).toBe('manual');
    expect(autorizado({ body: '', headers: { authorization: 'Bearer otro' } }, 's')).toBeNull();
    expect(autorizado({ body: '', headers: { authorization: 'Bearer s' } }, undefined)).toBeNull(); // sin secreto configurado, solo programada
    expect(autorizado({ body: 'no es json', headers: {} }, 's')).toBeNull();
  });
});

describe('columna de orden por tabla', () => {
  it('usa created_at salvo en las tablas que no la tienen', () => {
    expect(columnaDeOrden('products')).toBe('created_at');
    expect(columnaDeOrden('consumos')).toBe('creado_at');
    expect(columnaDeOrden('compras')).toBe('creado_at');
    expect(columnaDeOrden('creditos')).toBe('user_id');
    expect(columnaDeOrden('config')).toBe('key');
  });
});
