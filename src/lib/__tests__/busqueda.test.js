import { describe, it, expect } from "vitest";
import { normalizarBusqueda, palabrasDeBusqueda, coincideBusqueda } from "../busqueda.js";

describe("normalizarBusqueda", () => {
  it("saca tildes y diéresis y baja a minúsculas", () => {
    expect(normalizarBusqueda("Café con Azúcar")).toBe("cafe con azucar");
    expect(normalizarBusqueda("PINGÜINO")).toBe("pinguino");
  });
  it("la ñ pasa a n para que 'senor' encuentre 'Señor'", () => {
    expect(normalizarBusqueda("Señor")).toBe("senor");
  });
  it("aguanta null y undefined", () => {
    expect(normalizarBusqueda(null)).toBe("");
    expect(normalizarBusqueda(undefined)).toBe("");
  });
});

describe("coincideBusqueda", () => {
  it("encuentra con y sin tilde en los dos sentidos", () => {
    expect(coincideBusqueda("Taza de cerámica blanca", "ceramica")).toBe(true);
    expect(coincideBusqueda("Taza de ceramica blanca", "cerámica")).toBe(true);
  });
  it("todas las palabras tienen que estar, en cualquier orden", () => {
    expect(coincideBusqueda("Taza de cerámica blanca", "blanca taza")).toBe(true);
    expect(coincideBusqueda("Taza de cerámica blanca", "taza roja")).toBe(false);
  });
  it("busca en varios campos a la vez y saltea los vacíos", () => {
    expect(coincideBusqueda(["Auriculares", null, "Shenzhen Brightwave", undefined], "brightwave auri")).toBe(true);
  });
  it("consulta vacía coincide con todo", () => {
    expect(coincideBusqueda("lo que sea", "   ")).toBe(true);
  });
  it("acepta las palabras ya partidas para no repartir la consulta en cada fila", () => {
    const palabras = palabrasDeBusqueda("Cantón sunrise");
    expect(palabras).toEqual(["canton", "sunrise"]);
    expect(coincideBusqueda("Yiwu Sunrise · Feria de Cantón", palabras)).toBe(true);
  });
});
