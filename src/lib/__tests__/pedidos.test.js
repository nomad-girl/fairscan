import { describe, it, expect } from "vitest";
import { lineaDePedido, totalesDePedido, totalesDeFeria, porcentajeDeContenedor, pedidoDeProveedor, productosParaPedido, conCantidad, proveedoresSinPedido, textoProforma, nombreDeArchivo } from "../pedidos.js";

const taza = { id: 1, name: "Taza", price: "0.85", piezasPorCaja: 48, cbmPorCaja: 0.042, supplierId: 10, favorito: 1, createdAt: 2 };
const vela = { id: 2, name: "Vela", price: "1,95", piezasPorCaja: 24, supplierId: 10, createdAt: 1 };
const set = { id: 3, name: "Set", price: "0.70", supplierId: 10, createdAt: 3 };
const productos = [taza, vela, set];

describe("lineaDePedido", () => {
  it("por caja: bultos × piezas = unidades; CBM y total", () => {
    const l = lineaDePedido(taza, 10);
    expect(l).toMatchObject({ cantidad: 10, porCaja: true, bultos: 10, unidades: 480, total: 408 });
    expect(l.cbm).toBeCloseTo(0.42);
  });
  it("sin piezas por caja la cantidad son unidades y no hay CBM", () => {
    const l = lineaDePedido(set, 100);
    expect(l).toMatchObject({ porCaja: false, bultos: null, unidades: 100, cbm: null });
    expect(l.total).toBeCloseTo(70);
  });
  it("acepta coma decimal y aguanta basura", () => {
    expect(lineaDePedido(vela, 6).total).toBeCloseTo(280.8);
    expect(lineaDePedido(vela, "abc").cantidad).toBe(0);
  });
});

describe("totales del pedido y de la feria", () => {
  const pedido = { id: 1, supplierId: 10, districtId: 1, estado: "en_curso", items: [{ productId: 1, cantidad: 10 }, { productId: 2, cantidad: 6 }, { productId: 99, cantidad: 3 }] };
  it("suma lo que puede y cuenta lo que quedó sin CBM; ignora productos borrados", () => {
    const t = totalesDePedido(pedido, productos);
    expect(t.lineas.length).toBe(2);
    expect(t.bultos).toBe(16);
    expect(t.unidades).toBe(624);
    expect(t.cbm).toBeCloseTo(0.42);
    expect(t.total).toBeCloseTo(688.8);
    expect(t.sinCbm).toBe(1);
  });
  it("contenedor de 20 pies ≈ 28 CBM", () => {
    expect(porcentajeDeContenedor(0.42)).toBe(2);
    expect(porcentajeDeContenedor(28)).toBe(100);
    expect(porcentajeDeContenedor(0)).toBe(0);
    expect(totalesDeFeria([pedido, { items: [] }], productos).pedidos).toBe(1);
  });
});

describe("orden y selección", () => {
  it("favoritos primero; el elegido, arriba de todo", () => {
    expect(productosParaPedido(productos, 10).map(p => p.id)).toEqual([1, 2, 3]);
    expect(productosParaPedido(productos, 10, 3).map(p => p.id)).toEqual([3, 1, 2]);
  });
  it("el pedido vigente es el que está en curso", () => {
    const ps = [{ supplierId: 10, estado: "enviado", updatedAt: 5 }, { supplierId: 10, estado: "en_curso", updatedAt: 1 }];
    expect(pedidoDeProveedor(ps, 10).estado).toBe("en_curso");
    expect(pedidoDeProveedor(ps, 11)).toBeNull();
  });
  it("conCantidad agrega, cambia y saca con cero", () => {
    let items = conCantidad([], 1, 10);
    items = conCantidad(items, 2, "6");
    expect(items).toEqual([{ productId: 1, cantidad: 10 }, { productId: 2, cantidad: 6 }]);
    expect(conCantidad(items, 1, 0)).toEqual([{ productId: 2, cantidad: 6 }]);
  });
  it("proveedores con favoritos y sin pedido, por feria", () => {
    const suppliers = [{ id: 10, districtId: 1 }, { id: 11, districtId: 1 }, { id: 12, districtId: 2, favorito: 1 }];
    const r = proveedoresSinPedido(suppliers, [...productos, { id: 5, supplierId: 11, favorito: 1 }], [{ supplierId: 10, items: [{ productId: 1, cantidad: 1 }] }], 1);
    expect(r.map(x => x.proveedor.id)).toEqual([11]);
    expect(proveedoresSinPedido(suppliers, productos, [], null).map(x => x.proveedor.id)).toEqual([10, 12]);
  });
});

describe("proforma", () => {
  const t = (k, o) => ({ "pedido.proformaTitulo": "Proforma", "pedido.atencion": "Atención", "pedido.bultosCorto": "bultos", "pedido.unidadesCorto": "u.", "pedido.unidades": "Unidades", "pedido.bultos": "Bultos", "pedido.total": "Total", "pedido.sinNombre": "Sin nombre", "pedido.sinCbmEnLineas": `${o?.count} sin CBM` }[k] || k);
  const f = { numero: (n) => String(n) };
  it("texto plano con líneas, totales y comentarios", () => {
    const txt = textoProforma({ pedido: { items: [{ productId: 1, cantidad: 10 }], comentarios: "Logo azul" }, proveedor: { company: "Yiwu Sunrise", contact: "Lily" }, productos, moneda: "USD", f, t });
    expect(txt).toContain("Proforma · Yiwu Sunrise");
    expect(txt).toContain("Atención: Lily");
    expect(txt).toContain("1. Taza — 10 bultos × 48 = 480 u. · USD 0.85/u · USD 408");
    expect(txt).toContain("Total: USD 408");
    expect(txt).toContain("Logo azul");
  });
  it("nombre de archivo sin tildes ni espacios", () => {
    expect(nombreDeArchivo({ company: "Ningbo Ñandú S.A." }, new Date("2026-09-16T12:00:00Z"))).toBe("Proforma_Ningbo-Nandu-S-A_2026-09-16.xlsx");
  });
});
