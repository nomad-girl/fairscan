import { describe, it, expect } from "vitest";
import { aplicarFiltros, ordenarProductos, cantidadDeFiltros, rangoEntre, precioDesdeConsulta } from "../filtros.js";
import { vistaModificada, VISTAS_DE_FABRICA } from "../vistas.js";

const HOY = Date.now();
const suppliers = [{ id: 10, company: "Yiwu Home" }, { id: 11, company: "Shenzhen Light" }];
const productos = [
  { id: 1, name: "Taza", price: "0.85", moq: "100", supplierId: 10, category: "Mesa", favorito: 1, createdAt: HOY - 1000, photos: ["a"] },
  { id: 2, name: "Vela", price: null, moq: "500", supplierId: 10, category: "Deco", createdAt: HOY - 2000, photos: ["a", "b"] },
  { id: 3, name: "Tren", price: "6.50", supplierId: 11, category: "Juguete", createdAt: HOY - 3 * 86400000, photos: [] },
  { id: 4, name: "Espejo", price: "7.30", supplierId: null, category: "Deco", createdAt: HOY - 4000, descartado: 1, photos: ["a"] },
];

describe("Filtros del escritorio", () => {
  it("sin filtros, los descartados no se ven; con 'solo', solo ellos; con 'todos', todos", () => {
    expect(aplicarFiltros(productos).map(p => p.id)).toEqual([1, 2, 3]);
    expect(aplicarFiltros(productos, { descartado: "solo" }).map(p => p.id)).toEqual([4]);
    expect(aplicarFiltros(productos, { descartado: "todos" })).toHaveLength(4);
  });
  it("se combinan: proveedor + sin precio", () => {
    expect(aplicarFiltros(productos, { proveedor: [10], sinPrecio: true }).map(p => p.id)).toEqual([2]);
  });
  it("rangos de precio y MOQ, fotos y capturado", () => {
    expect(aplicarFiltros(productos, { precio: { min: 1, max: 7 } }).map(p => p.id)).toEqual([3]);
    expect(aplicarFiltros(productos, { moq: { min: 200 } }).map(p => p.id)).toEqual([2]);
    expect(aplicarFiltros(productos, { fotos: "varias" }).map(p => p.id)).toEqual([2]);
    expect(aplicarFiltros(productos, { fotos: "sin" }).map(p => p.id)).toEqual([3]);
    expect(aplicarFiltros(productos, { capturado: "hoy" }).map(p => p.id)).toEqual([1, 2]);
  });
  it("el buscador entiende '< 2' como precio y busca por proveedor", () => {
    expect(precioDesdeConsulta("< 2")).toEqual({ max: 2 });
    expect(precioDesdeConsulta(">= 5,5")).toEqual({ min: 5.5 });
    expect(aplicarFiltros(productos, {}, { consulta: "< 2" }).map(p => p.id)).toEqual([1]);
    expect(aplicarFiltros(productos, {}, { consulta: "shenzhen", suppliers }).map(p => p.id)).toEqual([3]);
  });
  it("cuenta los filtros puestos", () => {
    expect(cantidadDeFiltros({})).toBe(0);
    expect(cantidadDeFiltros({ favorito: true, proveedor: [], precio: { min: null, max: null }, moq: { min: 1 } })).toBe(2);
  });
});

describe("Orden", () => {
  it("por precio ascendente, y lo vacío siempre al final", () => {
    expect(ordenarProductos(productos, { campo: "price", dir: "asc" }).map(p => p.id)).toEqual([1, 3, 4, 2]);
    expect(ordenarProductos(productos, { campo: "price", dir: "desc" }).map(p => p.id)).toEqual([4, 3, 1, 2]);
  });
  it("por proveedor, alfabético", () => {
    expect(ordenarProductos(productos, { campo: "proveedor", dir: "asc" }, suppliers).map(p => p.id)).toEqual([3, 1, 2, 4]);
  });
  it("el rango con Shift toma lo que está entre los dos, en el orden visible", () => {
    const lista = ordenarProductos(productos, { campo: "createdAt", dir: "desc" });
    expect(rangoEntre(lista, 1, 4)).toEqual([1, 2, 4]);
    expect(rangoEntre(lista, 4, 1)).toEqual([1, 2, 4]);
  });
});

describe("Vistas", () => {
  it("detecta si la vista abierta cambió respecto de lo guardado", () => {
    const v = VISTAS_DE_FABRICA[0];
    expect(vistaModificada(v, { ...v.config })).toBe(false);
    expect(vistaModificada(v, { ...v.config, filtros: { sinPrecio: true, favorito: true } })).toBe(true);
    expect(vistaModificada(v, { ...v.config, vista: "grilla" })).toBe(true);
  });
});
