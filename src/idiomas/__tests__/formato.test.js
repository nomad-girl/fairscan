import { describe, it, expect, beforeAll } from "vitest";
import { iniciarIdiomas, idiomasDisponibles, i18next } from "../index.js";
import { numero, dolares, cbm, fechaCorta, fechaLarga, haceCuanto } from "../formato.js";

beforeAll(() => { iniciarIdiomas("es-AR"); });

describe("idiomas", () => {
  it("arranca en es-AR y lo lista como un idioma más", () => {
    expect(i18next.language).toBe("es-AR");
    expect(idiomasDisponibles()).toContain("es-AR");
  });
  it("traduce por clave y maneja plurales con count", () => {
    expect(i18next.t("comun.listo")).toBe("Listo");
    expect(i18next.t("cantidades.productos", { count: 1 })).toBe("1 producto");
    expect(i18next.t("cantidades.productos", { count: 84 })).toBe("84 productos");
  });
  it("una clave que falta devuelve la clave, no null (para que se note en pantalla)", () => {
    expect(i18next.t("no.existe")).toBe("no.existe");
  });
});

describe("formato por región", () => {
  it("números con separador de miles argentino", () => {
    expect(numero(1128)).toBe("1.128");
    expect(numero(0.85)).toBe("0,85");
    expect(numero(null)).toBe("");
  });
  it("dólares sin símbolo $ y con dos decimales solo si hacen falta", () => {
    expect(dolares(408)).toBe("USD 408");
    expect(dolares(0.85)).toBe("USD 0,85");
    expect(dolares(1574.5)).toBe("USD 1.574,50");
  });
  it("CBM con coma decimal", () => {
    expect(cbm(1.26)).toBe("1,26 CBM");
    expect(cbm(0.042)).toBe("0,042 CBM");
  });
  it("fechas en castellano", () => {
    const d = new Date(2026, 8, 16, 12, 0, 0);
    expect(fechaCorta(d).toLowerCase()).toContain("sep");
    expect(fechaLarga(d)).toBe("16 de septiembre de 2026");
    expect(fechaCorta("no es fecha")).toBe("");
  });
  it("hace cuánto, en palabras", () => {
    const ahora = Date.now();
    expect(haceCuanto(ahora - 2 * 60 * 1000, ahora)).toBe("hace 2 minutos");
    expect(haceCuanto(ahora - 26 * 3600 * 1000, ahora)).toBe("ayer");
  });
});
