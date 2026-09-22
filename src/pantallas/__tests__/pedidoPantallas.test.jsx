// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { iniciarIdiomas } from "../../idiomas/index.js";
import { SistemaProvider } from "../../sistema/SistemaProvider.jsx";
import { FichaProveedor } from "../FichaProveedor.jsx";
import { ArmarPedido } from "../ArmarPedido.jsx";
import { Pedidos } from "../Pedidos.jsx";

vi.mock("../../sistema/vibrar.js", () => ({ vibrarSeleccion: vi.fn(), vibrarExito: vi.fn(), vibrarError: vi.fn(), vibrarObturador: vi.fn(), vibrarAviso: vi.fn() }));

beforeAll(() => { iniciarIdiomas("es-AR"); });
afterEach(cleanup);

const FOTO = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
const con = (ui) => render(<SistemaProvider modo="claro">{ui}</SistemaProvider>);
const districts = [{ id: 1, name: "Cantón", emoji: "🇨🇳" }, { id: 2, name: "Cafira", emoji: "🇦🇷" }];
const yiwu = { id: 10, company: "Yiwu Sunrise", contact: "Lily", phone: "+86 138 0000", email: "lily@yiwu.cn", districtId: 1, favorito: 0, createdAt: 1 };
const shenzhen = { id: 11, company: "Shenzhen Brightwave", districtId: 1, createdAt: 2 };
const suppliers = [yiwu, shenzhen];
const products = [
  { id: 1, name: "Taza de cerámica", price: "0.85", piezasPorCaja: 48, cbmPorCaja: 0.042, supplierId: 10, favorito: 1, createdAt: 2, photos: [FOTO] },
  { id: 2, name: "Vela de soja", price: "1.95", piezasPorCaja: 24, supplierId: 10, createdAt: 1, photos: [FOTO] },
  { id: 3, name: "Set salero", price: "0.70", supplierId: 10, createdAt: 3, photos: [FOTO] },
  { id: 9, name: "Tren de madera", price: "6.50", supplierId: 11, favorito: 1, createdAt: 4, photos: [FOTO] },
];
const ancho = (px) => Object.defineProperty(window, "innerWidth", { value: px, configurable: true, writable: true });

describe("Ficha de proveedor", () => {
  it("es un feed: muestra al proveedor vecino y la posición", () => {
    con(<FichaProveedor supplier={yiwu} allSuppliers={suppliers} products={products} districts={districts} onNavigateSupplier={vi.fn()} />);
    expect(screen.getByText("1 de 2")).toBeTruthy();
    expect(screen.getByText("Shenzhen Brightwave")).toBeTruthy(); // el siguiente, ya dibujado debajo
  });
  it("productos, contacto directo, favorito y el botón Armar pedido con la cuenta", () => {
    const onUpdate = vi.fn(), onArmarPedido = vi.fn();
    con(<FichaProveedor supplier={yiwu} products={products} districts={districts} onUpdate={onUpdate} onArmarPedido={onArmarPedido} />);
    expect(screen.getByText("Yiwu Sunrise")).toBeTruthy();
    expect(screen.getByText("Llamar")).toBeTruthy();
    expect(screen.getByText("Mail")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Taza de cerámica" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Marcar proveedor como favorito" }));
    expect(onUpdate).toHaveBeenCalledWith(10, { favorito: 1 }, true);
    fireEvent.click(screen.getByText("Armar pedido · 3 productos"));
    expect(onArmarPedido).toHaveBeenCalledWith(yiwu);
  });
  it("con un pedido en curso dice Seguir el pedido; sin productos el botón no se puede tocar", () => {
    const pedidos = [{ id: 1, supplierId: 10, estado: "en_curso", items: [{ productId: 1, cantidad: 10 }, { productId: 2, cantidad: 6 }] }];
    const { unmount } = con(<FichaProveedor supplier={yiwu} products={products} pedidos={pedidos} districts={districts} />);
    expect(screen.getByText("Seguir el pedido · 2 productos")).toBeTruthy();
    unmount();
    con(<FichaProveedor supplier={shenzhen} products={[]} districts={districts} />);
    expect(screen.getByText("Armar pedido · 0 productos").closest("button").disabled).toBe(true);
    expect(screen.getByText("Todavía no hay productos de este proveedor")).toBeTruthy();
  });
  it("los campos vacíos se ven en gris al final; eliminar pide confirmación", () => {
    const onDelete = vi.fn();
    con(<FichaProveedor supplier={yiwu} products={products} districts={districts} onDelete={onDelete} />);
    fireEvent.click(screen.getByText("Ver todos los datos"));
    expect(screen.getByText("Sitio web")).toBeTruthy(); // opción A: lo vacío a la vista, en gris
    fireEvent.click(screen.getByText("Eliminar proveedor"));
    expect(onDelete).not.toHaveBeenCalled();
    fireEvent.click(screen.getAllByText("Eliminar proveedor").pop());
    expect(onDelete).toHaveBeenCalledWith(10);
  });
});

describe("Armar pedido", () => {
  const pedido = { id: 1, supplierId: 10, districtId: 1, estado: "en_curso", comentarios: "", items: [{ productId: 1, cantidad: 10 }] };
  it("teléfono: más y menos guardan los ítems y los totales se calculan en vivo", () => {
    ancho(390);
    const onGuardar = vi.fn();
    con(<ArmarPedido supplier={yiwu} pedido={pedido} products={products} onGuardar={onGuardar} />);
    expect(screen.getByText("USD 408")).toBeTruthy();
    expect(screen.getByText("480")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Más Vela de soja" }));
    expect(onGuardar).toHaveBeenCalledWith({ items: [{ productId: 1, cantidad: 10 }, { productId: 2, cantidad: 1 }], estado: "en_curso" });
    fireEvent.click(screen.getByRole("button", { name: "Menos Taza de cerámica" }));
    expect(onGuardar).toHaveBeenCalledWith({ items: [{ productId: 1, cantidad: 9 }], estado: "en_curso" });
    fireEvent.change(screen.getByRole("textbox", { name: "Cantidad Set salero" }), { target: { value: "12" } });
    expect(onGuardar).toHaveBeenLastCalledWith({ items: [{ productId: 1, cantidad: 10 }, { productId: 3, cantidad: 12 }], estado: "en_curso" });
  });
  it("Mandar abre la hoja con los caminos del proveedor; Copiar llama onEnviar", () => {
    ancho(390);
    const onEnviar = vi.fn();
    con(<ArmarPedido supplier={yiwu} pedido={pedido} products={products} onEnviar={onEnviar} />);
    fireEvent.click(screen.getByText("Mandar proforma a Yiwu Sunrise"));
    expect(screen.getByText("Por WhatsApp")).toBeTruthy();
    expect(screen.getByText("Por mail")).toBeTruthy();
    expect(screen.queryByText("Por WeChat")).toBeNull();
    fireEvent.click(screen.getByText("Copiar el texto"));
    expect(onEnviar).toHaveBeenCalledWith("copiar");
  });
  it("sin cantidades no hay proforma que mandar", () => {
    ancho(390);
    con(<ArmarPedido supplier={yiwu} pedido={{ ...pedido, items: [] }} products={products} />);
    expect(screen.getByText("Mandar proforma a Yiwu Sunrise").closest("button").disabled).toBe(true);
    expect(screen.getByText("Poné cantidades para armar la proforma")).toBeTruthy();
  });
  it("computadora: la misma cuenta en una tabla", () => {
    ancho(1200);
    con(<ArmarPedido supplier={yiwu} pedido={pedido} products={products} />);
    expect(screen.getByRole("table")).toBeTruthy();
    expect(screen.getAllByRole("row").length).toBe(4); // cabecera + 3 productos
    expect(screen.getAllByText("USD 408").length).toBe(2); // la línea y el total
  });
});

describe("Pedidos", () => {
  it("lista el pedido con su total y estado, los proveedores con favoritos sin pedido, y Crear nuevo pedido", () => {
    const onAbrirPedido = vi.fn();
    const pedidos = [{ id: 1, supplierId: 10, districtId: 1, estado: "enviado", enviadoEl: Date.now(), items: [{ productId: 1, cantidad: 10 }], updatedAt: 1 }];
    con(<Pedidos pedidos={pedidos} suppliers={suppliers} products={products} districts={districts} activeDistrictId={1} onAbrirPedido={onAbrirPedido} />);
    expect(screen.getByText("Yiwu Sunrise")).toBeTruthy();
    expect(screen.getByText(/proforma enviada/)).toBeTruthy();
    expect(screen.getByText("Shenzhen Brightwave")).toBeTruthy();
    expect(screen.getByText(/Sin pedido · 1 favorito/)).toBeTruthy();
    expect(screen.getByText("Total de la feria")).toBeTruthy();
    fireEvent.click(screen.getByText("Shenzhen Brightwave"));
    expect(onAbrirPedido).toHaveBeenCalledWith(shenzhen);
    // Crear nuevo pedido: se elige el proveedor y se abre Armar pedido
    fireEvent.click(screen.getByText("Crear nuevo pedido"));
    expect(screen.getByText("¿De qué proveedor?")).toBeTruthy();
    fireEvent.click(screen.getAllByText("Yiwu Sunrise").pop());
    expect(onAbrirPedido).toHaveBeenCalledWith(yiwu);
  });
  it("vacío del todo, dice cómo empezar", () => {
    con(<Pedidos pedidos={[]} suppliers={[]} products={[]} districts={districts} />);
    expect(screen.getByText("Todavía no hay pedidos")).toBeTruthy();
  });
});
