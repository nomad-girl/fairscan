import { describe, it, expect } from "vitest";
import { ESCALA, PESOS, ALTURAS, RADIOS, PALETAS, MOVIMIENTO, paletaCompatible, variablesCSS, estiloTexto } from "../tokens.js";
import { contraste } from "../contraste.js";

describe("escala tipográfica (decisión 1: seis pasos, piso 13, base regular)", () => {
  it("tiene exactamente seis pasos y ninguno por debajo de 13", () => {
    const pasos = Object.values(ESCALA).map(e => e.px);
    expect(pasos).toHaveLength(6);
    expect(Math.min(...pasos)).toBe(13);
    expect(pasos).toEqual([13, 15, 17, 20, 24, 30]);
  });
  it("solo usa los pesos permitidos: nada de 600 ni 800", () => {
    const permitidos = new Set(Object.values(PESOS));
    for (const e of Object.values(ESCALA)) expect(permitidos.has(e.peso)).toBe(true);
    expect(permitidos.has(600)).toBe(false);
    expect(permitidos.has(800)).toBe(false);
  });
  it("estiloTexto devuelve el paso pedido y cae en cuerpo si el nombre no existe", () => {
    expect(estiloTexto("titulo").fontSize).toBe(20);
    expect(estiloTexto("inexistente").fontSize).toBe(15);
  });
});

describe("densidad (decisión 2: feria primero, todo lo tocable ≥ 44)", () => {
  it("nada tocable mide menos de 44", () => {
    for (const [k, v] of Object.entries(ALTURAS)) {
      if (["tocable", "botonPrincipal", "botonSecundario", "icono", "fila", "campo", "obturador"].includes(k)) expect(v, k).toBeGreaterThanOrEqual(44);
    }
    expect(ALTURAS.chip).toBe(40); // el chip es la única excepción decidida: 40 de alto con 8 de separación
    expect(ALTURAS.fila).toBe(72);
    expect(ALTURAS.botonPrincipal).toBe(56);
  });
  it("los radios son una lista corta", () => {
    expect(Object.values(RADIOS).sort((a, b) => a - b)).toEqual([10, 12, 14, 999]);
  });
});

describe("color (decisiones 3 y 4: tres significados; el claro es la madre)", () => {
  it("las dos paletas tienen los mismos roles", () => {
    expect(Object.keys(PALETAS.claro).sort()).toEqual(Object.keys(PALETAS.oscuro).sort());
  });
  it("no existen roles para azul, amarillo ni violeta", () => {
    for (const p of Object.values(PALETAS)) {
      expect(p).not.toHaveProperty("blue");
      expect(p).not.toHaveProperty("yellow");
      expect(p).not.toHaveProperty("purple");
    }
  });
  it("la compatibilidad mapea los colores viejos a neutros o al naranja, nunca a un cuarto color", () => {
    const c = paletaCompatible("claro");
    expect([c.text, c.muted, c.dim, c.accent]).toContain(c.blue);
    expect([c.text, c.muted, c.dim, c.accent]).toContain(c.purple);
    expect(c.yellow).toBe(c.accent);
  });
  for (const modo of ["claro", "oscuro"]) {
    const p = PALETAS[modo];
    for (const fondo of ["bg", "card"]) {
      it(`${modo}: texto principal sobre ${fondo} ≥ 4,5:1`, () => {
        expect(contraste(p.text, p[fondo])).toBeGreaterThanOrEqual(4.5);
      });
      it(`${modo}: texto secundario (muted) sobre ${fondo} ≥ 4,5:1`, () => {
        expect(contraste(p.muted, p[fondo])).toBeGreaterThanOrEqual(4.5);
      });
      it(`${modo}: texto terciario (dim) sobre ${fondo} ≥ 3:1`, () => {
        expect(contraste(p.dim, p[fondo])).toBeGreaterThanOrEqual(3);
      });
      it(`${modo}: precio verde sobre ${fondo} ≥ 3:1 (es texto destacado, 17 negrita)`, () => {
        expect(contraste(p.green, p[fondo])).toBeGreaterThanOrEqual(3);
      });
    }
    it(`${modo}: el texto del botón principal aguanta sobre los dos extremos del degradé ≥ 3:1`, () => {
      expect(contraste(p.botonPrincipal.texto, p.botonPrincipal.desde)).toBeGreaterThanOrEqual(3);
      expect(contraste(p.botonPrincipal.texto, p.botonPrincipal.hasta)).toBeGreaterThanOrEqual(3);
    });
    it(`${modo}: el naranja de acción como relleno, borde o ícono ≥ 3:1 sobre fondo y tarjeta`, () => {
      expect(contraste(p.accent, p.bg)).toBeGreaterThanOrEqual(3);
      expect(contraste(p.accent, p.card)).toBeGreaterThanOrEqual(3);
    });
    it(`${modo}: el naranja como texto (link, chip activo) ≥ 4,5:1 sobre fondo y tarjeta`, () => {
      expect(contraste(p.accentTexto, p.bg)).toBeGreaterThanOrEqual(4.5);
      expect(contraste(p.accentTexto, p.card)).toBeGreaterThanOrEqual(4.5);
    });
  }
});

describe("movimiento (nada frecuente se anima largo)", () => {
  it("el toque y el obturador quedan por debajo de 350 ms", () => {
    expect(MOVIMIENTO.toque.bajada).toBeLessThanOrEqual(100);
    expect(MOVIMIENTO.toque.vuelta).toBeLessThanOrEqual(250);
    expect(MOVIMIENTO.obturador.miniatura).toBeLessThanOrEqual(350);
  });
  it("ninguna transición pasa de 500 ms salvo lo que vive (el aviso)", () => {
    for (const [nombre, anim] of Object.entries(MOVIMIENTO)) {
      for (const [k, v] of Object.entries(anim)) {
        if (k === "vive" || k === "escala" || k === "velo" || k === "desplazamiento") continue;
        expect(v, `${nombre}.${k}`).toBeLessThanOrEqual(500);
      }
    }
  });
});

describe("variables CSS", () => {
  it("expone la escala, la paleta y las curvas con prefijo fs-", () => {
    const v = variablesCSS("claro");
    expect(v["--fs-cuerpo"]).toBe("15px");
    expect(v["--fs-accent"]).toBe(PALETAS.claro.accent);
    expect(v["--fs-tocable"]).toBe("44px");
    expect(Object.keys(v).every(k => k.startsWith("--fs-"))).toBe(true);
  });
});
