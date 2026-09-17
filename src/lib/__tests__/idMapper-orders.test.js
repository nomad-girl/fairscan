// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
vi.mock("../../db.js", () => ({ default: { table: () => ({ toArray: async () => [] }) } }));
import idMapper from "../idMapper.js";

describe("idMapper · orders (pedidos)", () => {
  it("ida y vuelta: los ítems viajan con el uuid del producto y lo no subido no viaja", () => {
    idMapper.register("suppliers", 10, "s-uuid");
    idMapper.register("districts", 1, "d-uuid");
    idMapper.register("products", 1, "p1-uuid");
    const local = { uuid: "o-uuid", supplierId: 10, districtId: 1, estado: "en_curso", comentarios: "Logo azul", items: [{ productId: 1, cantidad: 10 }, { productId: 77, cantidad: 3 }], enviadoEl: null, createdAt: 1000, updatedAt: 2000 };
    const cloud = idMapper.toCloud("orders", local, "room");
    expect(cloud).toMatchObject({ id: "o-uuid", room_id: "room", supplier_id: "s-uuid", district_id: "d-uuid", status: "en_curso", comments: "Logo azul", items: [{ product_id: "p1-uuid", quantity: 10 }], sent_at: null });
    const vuelta = idMapper.toLocal("orders", { ...cloud, sent_at: "2026-09-16T10:00:00Z", status: "enviado" });
    expect(vuelta).toMatchObject({ uuid: "o-uuid", supplierId: 10, districtId: 1, estado: "enviado", comentarios: "Logo azul", items: [{ productId: 1, cantidad: 10 }] });
    expect(vuelta.enviadoEl).toBe(new Date("2026-09-16T10:00:00Z").getTime());
  });
});
