// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { resolverIdioma, guardarPreferencia, leerPreferencia, RECURSOS } from "../index.js";

// E6 (Nati, 27/09): la app sigue al idioma del teléfono; español → es-AR, portugués → pt-BR (E25, 30/10), cualquier otro → inglés; y se puede fijar a mano.
describe("idioma del teléfono", () => {
  beforeEach(() => { try { localStorage.clear(); } catch {} });
  const conIdioma = (lang) => Object.defineProperty(globalThis, "navigator", { value: { language: lang, languages: [lang] }, configurable: true });

  it("español de cualquier país → es-AR; portugués → pt-BR; inglés o chino → inglés", () => {
    conIdioma("es-MX"); expect(resolverIdioma("auto")).toBe("es-AR");
    conIdioma("es"); expect(resolverIdioma("auto")).toBe("es-AR");
    conIdioma("en-US"); expect(resolverIdioma("auto")).toBe("en");
    conIdioma("zh-CN"); expect(resolverIdioma("auto")).toBe("en");
    conIdioma("pt-BR"); expect(resolverIdioma("auto")).toBe("pt-BR");
    conIdioma("pt-PT"); expect(resolverIdioma("auto")).toBe("pt-BR");
    conIdioma("pt"); expect(resolverIdioma("auto")).toBe("pt-BR");
  });
  it("la preferencia fijada a mano manda sobre el teléfono, y 'auto' la borra", () => {
    conIdioma("en-US");
    guardarPreferencia("es-AR"); expect(leerPreferencia()).toBe("es-AR"); expect(resolverIdioma()).toBe("es-AR");
    guardarPreferencia("auto"); expect(leerPreferencia()).toBe("auto"); expect(resolverIdioma()).toBe("en");
  });
  it("los tres idiomas tienen las mismas claves y las mismas variables", () => {
    const aplanar = (o, pre = "") => Object.entries(o).flatMap(([k, v]) => (v && typeof v === "object" ? aplanar(v, `${pre}${k}.`) : [[`${pre}${k}`, v]]));
    const es = Object.fromEntries(aplanar(RECURSOS["es-AR"].translation));
    for (const idioma of ["en", "pt-BR"]) {
      const otro = Object.fromEntries(aplanar(RECURSOS[idioma].translation).filter(([k]) => !(k.endsWith("_zero") && !(k in es))));
      expect(Object.keys(otro).filter(k => !(k in es))).toEqual([]);
      expect(Object.keys(es).filter(k => !(k in otro))).toEqual([]);
      // las variables {{…}} tienen que ser las mismas en cada texto (si no, sale "{{count}}" o falta un dato)
      const vars = (v) => (String(v).match(/\{\{[^}]+\}\}/g) || []).sort().join(",");
      expect(Object.keys(es).filter(k => vars(es[k]) !== vars(otro[k]))).toEqual([]);
    }
  });
  it("en portugués el 0 va en plural: '0 produtos', no '0 produto'", async () => {
    const { iniciarIdiomas, i18next } = await import("../index.js");
    iniciarIdiomas("pt-BR");
    expect(i18next.t("cantidades.productos", { count: 0 })).toBe("0 produtos");
    expect(i18next.t("cantidades.productos", { count: 1 })).toBe("1 produto");
    expect(i18next.t("cantidades.productos", { count: 3 })).toBe("3 produtos");
  });
});
