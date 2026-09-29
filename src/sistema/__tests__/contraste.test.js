import { describe, it, expect } from "vitest";
import { contraste, aRGBA, sobreFondo } from "../contraste.js";

describe("contraste WCAG", () => {
  it("negro sobre blanco es 21:1 y blanco sobre blanco es 1:1", () => {
    expect(contraste("#000000", "#FFFFFF")).toBeCloseTo(21, 0);
    expect(contraste("#FFFFFF", "#FFFFFF")).toBeCloseTo(1, 5);
  });
  it("es simétrico", () => {
    expect(contraste("#475569", "#EDF1F6")).toBeCloseTo(contraste("#EDF1F6", "#475569"), 6);
  });
  it("entiende hex corto, hex con alfa y rgba", () => {
    expect(aRGBA("#fff")).toEqual([255, 255, 255, 1]);
    expect(aRGBA("#F25F2A14")[3]).toBeCloseTo(0.078, 2);
    expect(aRGBA("rgba(242, 95, 42, 0.5)")).toEqual([242, 95, 42, 0.5]);
  });
  it("mezcla la transparencia sobre el fondo antes de medir", () => {
    expect(sobreFondo("rgba(0,0,0,0.5)", "#FFFFFF")).toEqual([128, 128, 128]);
    expect(contraste("rgba(0,0,0,0.5)", "#FFFFFF")).toBeLessThan(contraste("#000000", "#FFFFFF"));
  });
  it("rechaza colores que no entiende", () => {
    expect(() => aRGBA("naranja")).toThrow();
  });
});

// La paleta de la identidad (28/09/2026): cada par que se usa de verdad tiene que pasar WCAG.
import { PALETAS } from "../tokens.js";
describe("la paleta pasa los contrastes que promete", () => {
  for (const modo of ["claro", "oscuro"]) {
    const p = PALETAS[modo];
    it(`${modo}: texto, secundario y terciario sobre fondo y tarjeta ≥ 4,5:1`, () => {
      for (const fondo of [p.bg, p.card, p.surface]) {
        expect(contraste(p.text, fondo)).toBeGreaterThanOrEqual(4.5);
        expect(contraste(p.muted, fondo)).toBeGreaterThanOrEqual(4.5);
        expect(contraste(p.dim, fondo)).toBeGreaterThanOrEqual(4.5);
      }
    });
    it(`${modo}: el naranja como relleno ≥ 3:1 y como texto ≥ 4,5:1; el botón principal legible`, () => {
      expect(contraste(p.accent, p.bg)).toBeGreaterThanOrEqual(3);
      expect(contraste(p.accent, p.card)).toBeGreaterThanOrEqual(3);
      expect(contraste(p.accentTexto, p.card)).toBeGreaterThanOrEqual(4.5);
      expect(contraste(p.accentTexto, p.bg)).toBeGreaterThanOrEqual(4.5);
      expect(contraste(p.botonPrincipal.texto, p.botonPrincipal.desde)).toBeGreaterThanOrEqual(4.5);
    });
    it(`${modo}: dinero y rojo legibles sobre fondo y tarjeta`, () => {
      for (const fondo of [p.bg, p.card]) {
        expect(contraste(p.green, fondo)).toBeGreaterThanOrEqual(4.5);
        expect(contraste(p.red, fondo)).toBeGreaterThanOrEqual(4.5);
      }
    });
  }
});
