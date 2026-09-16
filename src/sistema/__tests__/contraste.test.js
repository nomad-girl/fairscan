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
