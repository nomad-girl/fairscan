import { describe, it, expect } from 'vitest';
import { claveDia, etiquetaDia, agruparPorDia, conEncabezadosDeDia, soloDeHoy, resumenDelDia } from '../porDia.js';

const AHORA = new Date(2026, 8, 9, 15, 0).getTime(); // mié 9 sep 2026, 15:00 local
const enDia = (diasAtras, hora = 10) => new Date(2026, 8, 9 - diasAtras, hora).getTime();

describe('etiquetaDia', () => {
  it('Hoy, Ayer, y después el día con fecha', () => {
    expect(etiquetaDia(claveDia(AHORA), AHORA)).toBe('Hoy');
    expect(etiquetaDia(claveDia(enDia(1)), AHORA)).toBe('Ayer');
    expect(etiquetaDia(claveDia(enDia(2)), AHORA)).toBe('lun 7 sep');
    expect(etiquetaDia('2025-11-03', AHORA)).toBe('lun 3 nov 2025');
  });
});

describe('agruparPorDia / conEncabezadosDeDia', () => {
  const productos = [
    { id: 1, createdAt: enDia(0, 14) }, { id: 2, createdAt: enDia(0, 9) },
    { id: 3, createdAt: enDia(1) }, { id: 4, createdAt: enDia(5) },
  ];
  it('agrupa por día del más nuevo al más viejo, con etiqueta y conteo', () => {
    const g = agruparPorDia(productos, AHORA);
    expect(g.map(x => [x.etiqueta, x.productos.length])).toEqual([['Hoy', 2], ['Ayer', 1], ['jue 4 sep', 1]]);
  });
  it('intercala encabezados para dibujar', () => {
    const l = conEncabezadosDeDia(productos, AHORA);
    expect(l.map(x => (x.tipo === 'dia' ? `#${x.etiqueta}·${x.n}` : x.p.id))).toEqual(['#Hoy·2', 1, 2, '#Ayer·1', 3, '#jue 4 sep·1', 4]);
  });
  it('soloDeHoy filtra por el día local', () => {
    expect(soloDeHoy(productos, AHORA).map(p => p.id)).toEqual([1, 2]);
  });
});

describe('resumenDelDia', () => {
  it('cuenta proveedores, productos, sin precio y promedio de hoy', () => {
    const productos = [
      { id: 1, createdAt: enDia(0), supplierId: 7, price: '1', photos: ['a'] },
      { id: 2, createdAt: enDia(0), supplierId: 7, price: '0.6', photos: ['a', 'b'] },
      { id: 3, createdAt: enDia(0), supplierCompany: 'Suelto SA', price: '', photos: [] },
      { id: 4, createdAt: enDia(1), supplierId: 9, price: '99' },
    ];
    expect(resumenDelDia(productos, AHORA)).toEqual({ productos: 3, proveedores: 2, sinPrecio: 1, promedioUsd: 0.8, fotos: 3 });
    expect(resumenDelDia([], AHORA)).toEqual({ productos: 0, proveedores: 0, sinPrecio: 0, promedioUsd: null, fotos: 0 });
  });
});
