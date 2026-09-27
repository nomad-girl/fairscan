// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { resolverIdioma, guardarPreferencia, leerPreferencia, RECURSOS } from "../index.js";

// E6 (Nati, 27/09): la app sigue al idioma del teléfono; español → es-AR, cualquier otro → inglés; y se puede fijar a mano.
describe("idioma del teléfono", () => {
  beforeEach(() => { try { localStorage.clear(); } catch {} });
  const conIdioma = (lang) => Object.defineProperty(globalThis, "navigator", { value: { language: lang, languages: [lang] }, configurable: true });

  it("español de cualquier país → es-AR; inglés, chino o portugués → inglés", () => {
    conIdioma("es-MX"); expect(resolverIdioma("auto")).toBe("es-AR");
    conIdioma("es"); expect(resolverIdioma("auto")).toBe("es-AR");
    conIdioma("en-US"); expect(resolverIdioma("auto")).toBe("en");
    conIdioma("zh-CN"); expect(resolverIdioma("auto")).toBe("en");
    conIdioma("pt-BR"); expect(resolverIdioma("auto")).toBe("en");
  });
  it("la preferencia fijada a mano manda sobre el teléfono, y 'auto' la borra", () => {
    conIdioma("en-US");
    guardarPreferencia("es-AR"); expect(leerPreferencia()).toBe("es-AR"); expect(resolverIdioma()).toBe("es-AR");
    guardarPreferencia("auto"); expect(leerPreferencia()).toBe("auto"); expect(resolverIdioma()).toBe("en");
  });
  it("los dos idiomas tienen las mismas claves", () => {
    const aplanar = (o, pre = "") => Object.entries(o).flatMap(([k, v]) => (v && typeof v === "object" ? aplanar(v, `${pre}${k}.`) : [`${pre}${k}`]));
    const es = aplanar(RECURSOS["es-AR"].translation), en = aplanar(RECURSOS.en.translation);
    expect(en.length).toBe(es.length);
    expect(en.filter(k => !es.includes(k))).toEqual([]);
    expect(es.filter(k => !en.includes(k))).toEqual([]);
  });
});
