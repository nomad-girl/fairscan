import { describe, it, expect } from "vitest";
import { conDominioPropio, esFotoDelBucket, DOMINIO_VIEJO, DOMINIO_PROPIO } from "../fotosDominio.js";

describe("dominio propio de las fotos", () => {
  it("traduce el dominio viejo del bucket y deja lo demás igual", () => {
    expect(conDominioPropio(`${DOMINIO_VIEJO}/products/a/b.jpg`)).toBe(`${DOMINIO_PROPIO}/products/a/b.jpg`);
    expect(conDominioPropio(`${DOMINIO_PROPIO}/x.jpg`)).toBe(`${DOMINIO_PROPIO}/x.jpg`);
    expect(conDominioPropio("blob:abc")).toBe("blob:abc");
    expect(conDominioPropio(null)).toBe(null);
  });
  it("reconoce las fotos del bucket en las dos formas", () => {
    expect(esFotoDelBucket(`${DOMINIO_VIEJO}/a.jpg`)).toBe(true);
    expect(esFotoDelBucket(`${DOMINIO_PROPIO}/a.jpg`)).toBe(true);
    expect(esFotoDelBucket("https://otro.com/a.jpg")).toBe(false);
  });
});
