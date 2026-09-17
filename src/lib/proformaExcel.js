/**
 * La proforma en Excel (Lucas, 16/09: "exporta como proforma, incluso mandársela al
 * proveedor"). Una hoja por proveedor: foto en la celda (fórmula IMAGE, como el export
 * general), cantidades y las cuentas como fórmulas, así si en la planilla cambian un 10
 * por un 12 se recalcula. El Excel es la salida, no el lugar de trabajo.
 */
import { totalesDePedido } from "./pedidos.js";

const TIPO_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const urlDeFoto = (p) => (p?.photoUrls || []).find(u => typeof u === "string" && u.startsWith("http")) || null;

async function libro() {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "FairScan";
  wb.created = new Date();
  return wb;
}

function nombreDeHoja(wb, base) {
  const limpio = (base || "Proveedor").replace(/[\\/?*[\]:]/g, " ").trim().slice(0, 28) || "Proveedor";
  let nombre = limpio, i = 2;
  while (wb.worksheets.some(ws => ws.name === nombre)) nombre = `${limpio} ${i++}`;
  return nombre;
}

function hojaDeProveedor(wb, { pedido, proveedor, productos, moneda = "USD", feria = null, t }) {
  const ws = wb.addWorksheet(nombreDeHoja(wb, proveedor?.company));
  ws.addRow([`${t("pedido.proformaTitulo")} · ${proveedor?.company || ""}`.trim()]).font = { bold: true, size: 14 };
  if (proveedor?.contact) ws.addRow([`${t("pedido.atencion")}: ${proveedor.contact}`]);
  if (feria?.name) ws.addRow([feria.name]);
  ws.addRow([new Date().toLocaleDateString()]);
  ws.addRow([]);
  const cab = ws.addRow([t("pedido.foto"), t("pedido.producto"), `${t("pedido.precio")} (${moneda})`, t("pedido.piezasPorCaja"), t("pedido.bultos"), t("pedido.unidades"), t("pedido.cbmPorCaja"), t("pedido.cbm"), `${t("pedido.total")} (${moneda})`]);
  cab.font = { bold: true };

  const tot = totalesDePedido(pedido, productos);
  const primera = ws.rowCount + 1;
  for (const l of tot.lineas) {
    const r = ws.rowCount + 1;
    const url = urlDeFoto(l.producto);
    const cbmCaja = l.producto.cbmPorCaja != null && l.producto.cbmPorCaja !== "" ? Number(String(l.producto.cbmPorCaja).replace(",", ".")) : null;
    const fila = ws.addRow([
      url ? { formula: `IMAGE("${url}")` } : "",
      l.producto.name || "",
      l.precio ?? "",
      l.piezas ?? "",
      l.porCaja ? l.bultos : "",
      l.porCaja ? { formula: `D${r}*E${r}` } : l.unidades,
      cbmCaja ?? "",
      l.porCaja && cbmCaja != null ? { formula: `E${r}*G${r}` } : "",
      l.precio != null ? { formula: `C${r}*F${r}` } : "",
    ]);
    fila.height = 64;
    fila.alignment = { vertical: "middle", wrapText: true };
  }
  const ultima = ws.rowCount;
  if (ultima >= primera) {
    const total = ws.addRow(["", t("pedido.total"), "", "", { formula: `SUM(E${primera}:E${ultima})` }, { formula: `SUM(F${primera}:F${ultima})` }, "", { formula: `SUM(H${primera}:H${ultima})` }, { formula: `SUM(I${primera}:I${ultima})` }]);
    total.font = { bold: true };
  }
  if (pedido?.comentarios) {
    ws.addRow([]);
    ws.addRow([t("pedido.comentarios")]).font = { bold: true };
    ws.addRow([pedido.comentarios]);
  }
  [14, 36, 12, 12, 10, 12, 12, 12, 14].forEach((ancho, i) => { ws.getColumn(i + 1).width = ancho; });
  return ws;
}

/** La proforma de un proveedor: un archivo, una hoja. */
export async function excelDeProforma(args) {
  const wb = await libro();
  hojaDeProveedor(wb, args);
  return new Blob([await wb.xlsx.writeBuffer()], { type: TIPO_XLSX });
}

/** Todos los pedidos de una feria: una hoja resumen y una por proveedor. */
export async function excelDeFeria({ pedidos = [], suppliers = [], productos = [], moneda = "USD", feria = null, t }) {
  const wb = await libro();
  const resumen = wb.addWorksheet(t("pedidos.titulo"));
  resumen.addRow([`${t("pedidos.titulo")}${feria?.name ? ` · ${feria.name}` : ""}`]).font = { bold: true, size: 14 };
  resumen.addRow([]);
  resumen.addRow([t("proveedor.titulo"), t("pedido.bultos"), t("pedido.unidades"), t("pedido.cbm"), `${t("pedido.total")} (${moneda})`]).font = { bold: true };
  const primera = resumen.rowCount + 1;
  for (const pedido of pedidos) {
    const proveedor = suppliers.find(s => s.id === pedido.supplierId);
    const tot = totalesDePedido(pedido, productos);
    if (tot.vacio) continue;
    resumen.addRow([proveedor?.company || "", tot.bultos, tot.unidades, tot.cbm, tot.total]);
    hojaDeProveedor(wb, { pedido, proveedor, productos, moneda, feria, t });
  }
  const ultima = resumen.rowCount;
  if (ultima >= primera) {
    resumen.addRow([t("pedido.total"), { formula: `SUM(B${primera}:B${ultima})` }, { formula: `SUM(C${primera}:C${ultima})` }, { formula: `SUM(D${primera}:D${ultima})` }, { formula: `SUM(E${primera}:E${ultima})` }]).font = { bold: true };
  }
  [36, 10, 12, 12, 14].forEach((ancho, i) => { resumen.getColumn(i + 1).width = ancho; });
  return new Blob([await wb.xlsx.writeBuffer()], { type: TIPO_XLSX });
}
