import { describe, it, expect } from "vitest";
import { parecidos, paresRepetidos, juntar, VENTANA_MS } from "../repetidos.js";

const t0 = 1_800_000_000_000;
describe("repetidos probables", () => {
  it("nombres parecidos sin importar tildes; sin palabras en común no son parecidos", () => {
    expect(parecidos({ name: "Taza de cerámica blanca" }, { name: "Taza ceramica blanca lisa" })).toBe(true);
    expect(parecidos({ name: "Taza de cerámica" }, { name: "Auriculares vincha" })).toBe(false);
    expect(parecidos({ name: "Vela", category: "Deco" }, { name: "", category: "Deco" })).toBe(true);
    expect(parecidos({ name: "Vela grande", category: "Deco" }, { name: "Vela chica", category: "Deco" })).toBe(true);
  });
  it("arma pares del mismo stand a menos de dos minutos, cada producto en un solo par", () => {
    const ps = [
      { id: 1, name: "Taza de cerámica blanca", supplierId: 10, createdAt: t0 },
      { id: 2, name: "Taza cerámica blanca lisa", supplierId: 10, createdAt: t0 + 30_000 },
      { id: 3, name: "Taza cerámica", supplierId: 10, createdAt: t0 + 60_000 },
      { id: 4, name: "Taza cerámica", supplierId: 11, createdAt: t0 + 70_000 },
      { id: 5, name: "Taza cerámica", supplierId: 10, createdAt: t0 + VENTANA_MS + 61_000 },
      { id: 6, name: "", ai_processed: false, supplierId: 10, createdAt: t0 + 5_000 },
    ];
    const pares = paresRepetidos(ps);
    expect(pares.map(p => [p.a.id, p.b.id])).toEqual([[1, 2]]);
    expect(pares[0].minutos).toBe(1);
  });
  it("juntar deja las fotos de los dos, completa lo que falta y no pisa lo que ya estaba", () => {
    const r = juntar({ id: 1, photos: ["a"], price: "0.85", notes: "logo", material: ["Cerámica"] }, { id: 2, photos: ["b", "a"], photoUrls: ["http://x/b.jpg"], price: "0.90", moq: "500", favorito: 1, notes: "rojo", material: ["Vidrio"] });
    expect(r).toMatchObject({ conservarId: 1, borrarId: 2, cambios: { photos: ["a", "b"], photoUrls: ["http://x/b.jpg"], moq: "500", favorito: 1, notes: "logo\nrojo", material: ["Cerámica", "Vidrio"] } });
    expect(r.cambios.price).toBeUndefined();
  });
});
