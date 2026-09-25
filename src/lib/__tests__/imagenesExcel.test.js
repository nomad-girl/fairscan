// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
vi.mock("../../api/client.js", () => ({ proxyImage: vi.fn(async () => null) }));
import { excelDeProforma } from "../proformaExcel.js";
import { imagenDeProducto } from "../imagenesExcel.js";

// Un JPEG mínimo (1×1) como miniatura local
const JPEG = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==";
const t = (k) => k;

describe("Fotos en los Excel (25/09: pegadas en la celda, no como fórmula)", () => {
  it("la imagen de un producto sale de la miniatura local sin pedir nada al servidor", async () => {
    const img = await imagenDeProducto({ id: 1, thumb: JPEG });
    expect(img?.extension).toBe("jpeg");
    expect(img?.base64?.length).toBeGreaterThan(20);
  });
  it("la proforma lleva la foto embebida y el link en su columna", async () => {
    const productos = [{ id: 1, name: "Taza", price: "0.85", piezasPorCaja: 12, supplierId: 10, thumb: JPEG, photoUrls: ["https://fotos.fairscan.app/a.jpg"] }];
    const pedido = { id: 5, supplierId: 10, items: [{ productId: 1, cantidad: 3 }] };
    const blob = await excelDeProforma({ pedido, proveedor: { id: 10, company: "Yiwu" }, productos, moneda: "USD", t });
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await blob.arrayBuffer());
    const ws = wb.worksheets[0];
    expect(ws.getImages().length).toBe(1);
    const filaCon = [...Array(ws.rowCount)].map((_, i) => ws.getRow(i + 1)).find(r => r.getCell(2).value === "Taza");
    expect(filaCon.getCell(1).value || null).toBe(null); // sin fórmula =IMAGE en la celda
    expect(filaCon.getCell(10).value?.hyperlink).toBe("https://fotos.fairscan.app/a.jpg");
  });
});
