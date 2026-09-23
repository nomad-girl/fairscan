// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { iniciarIdiomas } from "../../idiomas/index.js";
import { SistemaProvider } from "../../sistema/SistemaProvider.jsx";
import { Escritorio } from "../Escritorio.jsx";
import { useEsEscritorio } from "../util.jsx";

vi.mock("../../sistema/vibrar.js", () => ({ vibrarSeleccion: vi.fn(), vibrarExito: vi.fn(), vibrarError: vi.fn(), vibrarObturador: vi.fn(), vibrarAviso: vi.fn() }));

beforeAll(() => { iniciarIdiomas("es-AR"); });
afterEach(cleanup);

const FOTO = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
const con = (ui) => render(<SistemaProvider modo="claro">{ui}</SistemaProvider>);
const HOY = Date.now();
const AYER = HOY - 36 * 3600 * 1000;
const districts = [{ id: 1, name: "Cantón" }, { id: 2, name: "Cafira" }];
const yiwu = { id: 10, company: "Yiwu Sunrise", contact: "Lily", districtId: 1, createdAt: 1 };
const shenzhen = { id: 11, company: "Shenzhen Brightwave", districtId: 1, createdAt: 2 };
const suppliers = [yiwu, shenzhen];
const products = [
  { id: 1, name: "Taza de cerámica", price: "0.85", piezasPorCaja: 48, supplierId: 10, favorito: 1, createdAt: AYER, photos: [FOTO], districtId: 1 },
  { id: 2, name: "Vela de soja", price: null, supplierId: 10, createdAt: AYER - 1000, photos: [FOTO], districtId: 1 },
  { id: 3, name: "Tren de madera", price: "6.50", supplierId: 11, createdAt: AYER - 2000, photos: [FOTO], districtId: 1 },
  { id: 4, name: "Mate imperial", price: "3.00", supplierId: null, createdAt: AYER - 3000, photos: [FOTO], districtId: 2 },
];
const base = (extra = {}) => ({ products, suppliers, districts, activeDistrictId: 1, orders: [], moneda: "USD", cuenta: { email: "lucas@fairscan.app", esAnonima: false }, ...extra });

describe("El escritorio (la versión de computadora)", () => {
  it("abre en el catálogo cuando hoy no llegó nada, con la barra lateral y las cuentas de la feria", () => {
    con(<Escritorio {...base()} />);
    expect(screen.getByRole("heading", { level: 1, name: "Catálogo" })).toBeTruthy();
    const nav = screen.getByRole("navigation");
    expect(within(nav).getByText("Catálogo").parentElement.textContent).toContain("3"); // solo los de Cantón
    expect(within(nav).getByText("Proveedores").parentElement.textContent).toContain("2");
    expect(screen.getByText("Elegí un producto para ver sus datos")).toBeTruthy();
  });

  it("abre en Revisar el día cuando hay fotos de hoy", () => {
    const deHoy = [{ id: 9, name: "Difusor", supplierId: 10, createdAt: HOY, photos: [FOTO], districtId: 1 }];
    con(<Escritorio {...base({ products: [...products, ...deHoy] })} />);
    expect(screen.getByRole("heading", { level: 1, name: "Revisar el día · 1" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Difusor" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Taza de cerámica" })).toBeNull(); // los de ayer no están en Revisar
  });

  it("clic en una foto abre el panel con la ficha; las flechas pasan al vecino; Escape cierra", () => {
    const onActualizar = vi.fn();
    con(<Escritorio {...base({ onActualizarProducto: onActualizar })} />);
    fireEvent.click(screen.getByRole("button", { name: "Taza de cerámica" }));
    const panel = screen.getByRole("complementary");
    expect(within(panel).getByText("1 de 3")).toBeTruthy();
    expect(within(panel).getByLabelText(/Nombre: Taza de cerámica/)).toBeTruthy();
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(within(panel).getByText("2 de 3")).toBeTruthy();
    expect(within(panel).getByLabelText(/Nombre: Vela de soja/)).toBeTruthy();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.getByText("Elegí un producto para ver sus datos")).toBeTruthy();
  });

  it("el precio se edita en el panel, en el lugar, y se guarda al salir", () => {
    const onActualizar = vi.fn();
    con(<Escritorio {...base({ onActualizarProducto: onActualizar })} />);
    fireEvent.click(screen.getByRole("button", { name: "Vela de soja" }));
    const panel = screen.getByRole("complementary");
    fireEvent.click(within(panel).getByLabelText(/Precio USD: Agregar/));
    const input = within(panel).getByDisplayValue("");
    fireEvent.change(input, { target: { value: "1,95" } });
    fireEvent.blur(input);
    expect(onActualizar).toHaveBeenCalledWith(2, { price: "1.95" });
  });

  it("los filtros: Sin precio deja solo la vela; el buscador encuentra por nombre", () => {
    con(<Escritorio {...base()} />);
    fireEvent.click(screen.getByText(/Sin precio · 1/));
    expect(screen.getByRole("button", { name: "Vela de soja" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Taza de cerámica" })).toBeNull();
    fireEvent.click(screen.getByText(/Todos · 3/));
    fireEvent.change(screen.getByLabelText("Buscar producto o proveedor"), { target: { value: "tren" } });
    expect(screen.getByRole("button", { name: "Tren de madera" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Vela de soja" })).toBeNull();
  });

  it("la vista tabla edita una celda con un clic y guarda con Enter", () => {
    const onActualizar = vi.fn();
    con(<Escritorio {...base({ onActualizarProducto: onActualizar })} />);
    fireEvent.click(screen.getByRole("button", { name: "Ver en tabla" }));
    const tabla = screen.getByRole("table", { name: "Catálogo" });
    const celda = within(tabla).getByLabelText("Editar Piezas por caja de Vela de soja");
    fireEvent.click(celda);
    const input = within(tabla).getByLabelText("Editar Piezas por caja de Vela de soja");
    fireEvent.change(input, { target: { value: "24" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onActualizar).toHaveBeenCalledWith(2, { piezasPorCaja: 24 });
  });

  it("la feria de arriba es el filtro global: Todas las ferias suma el mate de Cafira", () => {
    const onSwitch = vi.fn();
    con(<Escritorio {...base({ onSwitchDistrict: onSwitch })} />);
    fireEvent.change(screen.getByLabelText("Feria"), { target: { value: "" } });
    expect(onSwitch).toHaveBeenCalledWith(null);
    cleanup();
    con(<Escritorio {...base({ activeDistrictId: null })} />);
    expect(screen.getByRole("button", { name: "Mate imperial" })).toBeTruthy();
  });

  it("Proveedores: clic en la tarjeta abre el panel del proveedor con sus productos y Armar pedido", async () => {
    // En la app, asegurarPedido crea el pedido y lo suma a la lista; acá ya viene en orders
    const pedido77 = { id: 77, supplierId: 10, districtId: 1, estado: "en_curso", items: [] };
    const onPedidoPara = vi.fn(async () => pedido77);
    con(<Escritorio {...base({ onPedidoPara, orders: [pedido77] })} />);
    fireEvent.click(screen.getByText("Proveedores"));
    fireEvent.click(screen.getByRole("button", { name: /Yiwu Sunrise/ }));
    const panel = screen.getByRole("complementary");
    expect(within(panel).getByText("Productos de este proveedor · 2")).toBeTruthy();
    fireEvent.click(within(panel).getByRole("button", { name: "Armar pedido" }));
    await screen.findByText(/Pedido · Yiwu Sunrise/);
    expect(onPedidoPara).toHaveBeenCalledWith(yiwu);
  });

  it("Pedidos: la lista con totales y el Excel de la feria; sin pedidos, el aviso", () => {
    const orders = [{ id: 5, supplierId: 10, districtId: 1, estado: "en_curso", items: [{ productId: 1, cantidad: 10 }] }];
    con(<Escritorio {...base({ orders })} />);
    fireEvent.click(screen.getByText("Pedidos"));
    const tabla = screen.getByRole("table", { name: "Pedidos" });
    expect(within(tabla).getByText("Yiwu Sunrise")).toBeTruthy();
    expect(within(tabla).getAllByText("480").length).toBeGreaterThan(0); // 10 cajas × 48 piezas
    expect(screen.getByRole("button", { name: "Excel de toda la feria" })).toBeTruthy();
  });

  it("sin cuenta: el aviso y el botón Entrar", () => {
    const onEntrar = vi.fn();
    con(<Escritorio {...base({ cuenta: { esAnonima: true }, onEntrar })} />);
    expect(screen.getByText(/Sin cuenta, lo que hagas acá queda en este navegador/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
    expect(onEntrar).toHaveBeenCalled();
  });
});

describe("El panel se agranda y la foto se ve a pantalla completa", () => {
  it("el botón agranda el panel y lo vuelve a achicar", () => {
    con(<Escritorio {...base()} />);
    fireEvent.click(screen.getByRole("button", { name: "Taza de cerámica" }));
    const panel = screen.getByRole("complementary");
    expect(panel.style.width).toBe("360px");
    fireEvent.click(within(panel).getByRole("button", { name: "Agrandar el panel" }));
    expect(parseInt(panel.style.width)).toBeGreaterThan(360);
    fireEvent.click(within(panel).getByRole("button", { name: "Achicar el panel" }));
    expect(panel.style.width).toBe("360px");
  });
  it("clic en la foto la abre grande; Escape la cierra", () => {
    con(<Escritorio {...base()} />);
    fireEvent.click(screen.getByRole("button", { name: "Taza de cerámica" }));
    fireEvent.click(within(screen.getByRole("complementary")).getByRole("button", { name: "Ver la foto grande" }));
    expect(screen.getByRole("dialog", { name: "Taza de cerámica" })).toBeTruthy();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("complementary")).toBeTruthy(); // el panel sigue abierto
  });
});

describe("useEsEscritorio", () => {
  it("es verdadero con 900 px o más y falso en un teléfono", () => {
    const Sonda = () => <span>{useEsEscritorio() ? "escritorio" : "telefono"}</span>;
    Object.defineProperty(window, "innerWidth", { value: 1280, configurable: true, writable: true });
    const { unmount } = render(<Sonda />);
    expect(screen.getByText("escritorio")).toBeTruthy();
    unmount();
    window.innerWidth = 390;
    render(<Sonda />);
    expect(screen.getByText("telefono")).toBeTruthy();
  });
});
