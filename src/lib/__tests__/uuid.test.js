// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { esUuid } from "../uuid.js";
import idMapper from "../idMapper.js";

describe("Identificadores que viajan a la nube (05/10)", () => {
  it("acepta un uuid y rechaza el texto 'null', 'undefined', vacío o un no-texto", () => {
    expect(esUuid("3f2a1b4c-5d6e-4f70-8a9b-0c1d2e3f4a5b")).toBe(true);
    expect(esUuid("null")).toBe(false);
    expect(esUuid("undefined")).toBe(false);
    expect(esUuid("  ")).toBe(false);
    expect(esUuid(null)).toBe(false);
    expect(esUuid(12)).toBe(false);
  });
  it("una referencia a una feria cuyo uuid no es válido viaja como null, no como el texto", () => {
    idMapper.register("districts", 7, "null");
    idMapper.register("districts", 8, "3f2a1b4c-5d6e-4f70-8a9b-0c1d2e3f4a5b");
    const malo = idMapper.toCloud("suppliers", { id: 1, uuid: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d", districtId: 7, company: "X" }, "11111111-2222-4333-8444-555555555555");
    expect(malo.district_id).toBeNull();
    const bueno = idMapper.toCloud("suppliers", { id: 2, uuid: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5e", districtId: 8, company: "Y" }, "11111111-2222-4333-8444-555555555555");
    expect(bueno.district_id).toBe("3f2a1b4c-5d6e-4f70-8a9b-0c1d2e3f4a5b");
  });
});
