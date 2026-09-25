// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { iniciarIdiomas } from "../../idiomas/index.js";
import { SistemaProvider } from "../../sistema/SistemaProvider.jsx";
import { Escritorio } from "../Escritorio.jsx";
import { useEsEscritorio } from "../util.jsx";

vi.mock("../../sistema/vibrar.js", () => ({ vibrarSeleccion: vi.fn(), vibrarExito: vi.fn(), vibrarError: vi.fn(), vibrarObturador: vi.fn(), vibrarAviso: vi.fn() }));

beforeAll(() => { iniciarIdiomas("es-AR"); });
beforeEach(() => { localStorage.clear(); localStorage.setItem("fairscan.escritorio.bienvenida", "1"); });
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
  { id: 1, name: "Taza de cerámica", price: "0.85", piezasPorCaja: 48, supplierId: 10, favorito: 1, createdAt: AYER, photos: [FOTO], districtId: 1, category: "Mesa" },
  { id: 2, name: "Vela de soja", price: null, supplierId: 10, createdAt: AYER - 1000, photos: [FOTO], districtId: 1, category: "Deco" },
  { id: 3, name: "Tren de madera", price: "6.50", supplierId: 11, createdAt: AYER - 2000, photos: [FOTO], districtId: 1, category: "Juguete" },
  { id: 4, name: "Mate imperial", price: "3.00", supplierId: null, createdAt: AYER - 3000, photos: [FOTO], districtId: 2 },
];
const base = (extra = {}) => ({ products, suppliers, districts, activeDistrictId: 1, orders: [], moneda: "USD", cuenta: { email: "lucas@fairscan.app", esAnonima: false }, ...extra });
const nav = () => screen.getByRole("navigation");

describe("El escritorio (la versión de computadora)", () => {
  it("abre en el catálogo cuando hoy no llegó nada, con la barra lateral, las vistas de fábrica y las cuentas", () => {
    con(<Escritorio {...base()} />);
    expect(screen.getByRole("heading", { level: 1, name: "Catálogo" })).toBeTruthy();
    expect(screen.getByLabelText("3 productos")).toBeTruthy();
    expect(within(nav()).queryByTitle("Sin precio")).toBeNull(); // las vistas, plegadas de fábrica
    fireEvent.click(within(nav()).getByRole("button", { name: "Mostrar las vistas" }));
    expect(within(nav()).getByTitle("Sin precio").textContent).toContain("1");
    expect(within(nav()).getByTitle("Favoritos").textContent).toContain("1");
  });

  it("abre en Revisar el día cuando hay fotos de hoy", () => {
    const deHoy = [{ id: 9, name: "Difusor", supplierId: 10, createdAt: HOY, photos: [FOTO], districtId: 1 }];
    con(<Escritorio {...base({ products: [...products, ...deHoy] })} />);
    expect(screen.getByRole("heading", { level: 1, name: "Revisar el día · 1" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Difusor" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Taza de cerámica" })).toBeNull();
  });

  it("clic en una foto abre la vista rápida encima de todo; las flechas pasan al vecino; Escape cierra", () => {
    con(<Escritorio {...base()} />);
    fireEvent.click(screen.getByRole("button", { name: "Taza de cerámica" }));
    const vista = screen.getByRole("dialog", { name: "Taza de cerámica" });
    expect(within(vista).getByText("1 de 3")).toBeTruthy();
    expect(within(vista).getByRole("button", { name: "Agregar al pedido" })).toBeTruthy(); // la acción principal, arriba
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByRole("dialog", { name: "Vela de soja" })).toBeTruthy();
    expect(screen.getByText("2 de 3")).toBeTruthy();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("el precio se edita en el panel y se guarda al salir", () => {
    const onActualizar = vi.fn();
    con(<Escritorio {...base({ onActualizarProducto: onActualizar })} />);
    fireEvent.click(screen.getByRole("button", { name: "Vela de soja" }));
    const panel = screen.getByRole("dialog", { name: "Vela de soja" });
    fireEvent.click(within(panel).getByLabelText(/Precio USD: Agregar/));
    const input = within(panel).getByDisplayValue("");
    fireEvent.change(input, { target: { value: "1,95" } });
    fireEvent.blur(input);
    expect(onActualizar).toHaveBeenCalledWith(2, { price: "1.95" });
  });

  it("la vista de fábrica 'Sin precio' deja solo la vela; el buscador encuentra por nombre y por '< 2'", () => {
    con(<Escritorio {...base()} />);
    fireEvent.click(within(nav()).getByRole("button", { name: "Mostrar las vistas" }));
    fireEvent.click(within(nav()).getByTitle("Sin precio"));
    expect(screen.getByRole("heading", { level: 1, name: "Sin precio" })).toBeTruthy();
    expect(screen.getByLabelText("Editar Nombre de Vela de soja")).toBeTruthy(); // la vista es tabla
    expect(screen.queryByLabelText("Editar Nombre de Taza de cerámica")).toBeNull();
    fireEvent.click(within(nav()).getByText("Catálogo"));
    fireEvent.change(screen.getByLabelText("Buscar producto o proveedor"), { target: { value: "tren" } });
    expect(screen.getByRole("button", { name: "Tren de madera" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Vela de soja" })).toBeNull();
    fireEvent.change(screen.getByLabelText("Buscar producto o proveedor"), { target: { value: "< 2" } });
    expect(screen.getByRole("button", { name: "Taza de cerámica" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Tren de madera" })).toBeNull();
  });

  it("'+ Filtro' agrega un chip; Quitar filtros lo saca; sin resultados ofrece quitar", () => {
    con(<Escritorio {...base()} />);
    expect(screen.queryByRole("button", { name: "+ Filtro" })).toBeNull(); // detrás de Filtrar
    fireEvent.click(screen.getByRole("button", { name: "Filtrar" }));
    fireEvent.click(screen.getByRole("button", { name: "+ Filtro" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Favorito" }));
    expect(screen.getByLabelText("1 producto")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "+ Filtro" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Sin precio" }));
    expect(screen.getByText("Nada con esos criterios")).toBeTruthy();
    fireEvent.click(screen.getAllByRole("button", { name: "Quitar filtros" })[0]);
    expect(screen.getByLabelText("3 productos")).toBeTruthy();
  });

  it("la tabla ordena por precio con la cabecera y deja lo vacío al final; 'Columnas' apaga una", () => {
    con(<Escritorio {...base()} />);
    fireEvent.click(screen.getByRole("button", { name: "Ver en tabla" }));
    fireEvent.click(screen.getByRole("columnheader", { name: /Precio USD/ }));
    const nombres = () => screen.getAllByRole("row").slice(1).map(f => within(f).getAllByRole("cell")[2].textContent);
    expect(nombres()).toEqual(["Taza de cerámica", "Tren de madera", "Vela de soja"]);
    fireEvent.click(screen.getByRole("columnheader", { name: /Precio USD/ }));
    expect(nombres()).toEqual(["Tren de madera", "Taza de cerámica", "Vela de soja"]);
    fireEvent.click(screen.getByRole("button", { name: /Columnas/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: "MOQ" }));
    expect(screen.queryByRole("columnheader", { name: "MOQ" })).toBeNull();
  });

  it("selección múltiple: casilla, Shift para el rango, barra flotante con Favorito y Borrar; Escape la quita", () => {
    const onActualizarVarios = vi.fn(), onEliminarVarios = vi.fn();
    con(<Escritorio {...base({ onActualizarVarios, onEliminarVarios })} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Elegir Taza de cerámica" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Elegir Tren de madera" }), { shiftKey: true });
    const barra = screen.getByRole("toolbar");
    expect(barra.textContent).toContain("3");
    fireEvent.click(within(barra).getByRole("button", { name: "Favorito" }));
    expect(onActualizarVarios).toHaveBeenCalledWith(expect.arrayContaining([1, 2, 3]), { favorito: 1 });
    fireEvent.click(within(barra).getByRole("button", { name: "Borrar" }));
    fireEvent.click(within(barra).getByRole("button", { name: "Sí, borrar" }));
    expect(onEliminarVarios).toHaveBeenCalledWith(expect.arrayContaining([1, 2, 3]));
    expect(screen.queryByRole("toolbar")).toBeNull();
  });

  it("Descartar saca de la vista sin borrar; el filtro Descartados los muestra; la tecla X descarta el elegido", () => {
    const onActualizarVarios = vi.fn();
    const conDescartado = products.map(p => (p.id === 3 ? { ...p, descartado: 1 } : p));
    con(<Escritorio {...base({ products: conDescartado, onActualizarVarios })} />);
    expect(screen.queryByRole("button", { name: "Tren de madera" })).toBeNull();
    expect(screen.getByLabelText("2 productos")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Taza de cerámica" }));
    fireEvent.keyDown(window, { key: "x" });
    expect(onActualizarVarios).toHaveBeenCalledWith([1], { descartado: 1 });
    fireEvent.keyDown(window, { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: "Filtrar" }));
    fireEvent.click(screen.getByRole("button", { name: "+ Filtro" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Descartados" }));
    fireEvent.click(screen.getByRole("button", { name: "Solo descartados" }));
    expect(screen.getByRole("button", { name: "Tren de madera" })).toBeTruthy();
  });

  it("⌘K abre la paleta: busca un proveedor y lo abre con Enter", () => {
    con(<Escritorio {...base()} />);
    fireEvent.keyDown(window, { key: "k", metaKey: true });
    const paleta = screen.getByRole("dialog", { name: "Buscar y hacer" });
    fireEvent.change(within(paleta).getByRole("textbox"), { target: { value: "shenzhen" } });
    fireEvent.keyDown(within(paleta).getByRole("textbox"), { key: "Enter" });
    expect(screen.getByRole("heading", { level: 1, name: "Shenzhen Brightwave" })).toBeTruthy(); // la home del proveedor
    expect(screen.getByRole("button", { name: "Armar pedido" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Tren de madera" })).toBeTruthy(); // sus productos, la foto primero
  });

  it("guarda la vista actual con nombre y la muestra en la barra lateral", async () => {
    con(<Escritorio {...base({ equipoId: "equipo-1" })} />);
    fireEvent.click(screen.getByRole("button", { name: "Filtrar" }));
    fireEvent.click(screen.getByRole("button", { name: "+ Filtro" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Favorito" }));
    fireEvent.click(within(nav()).getByRole("button", { name: "Mostrar las vistas" }));
    fireEvent.click(screen.getByRole("button", { name: "+ Guardar vista actual" }));
    fireEvent.change(screen.getByLabelText("Nombre de la vista"), { target: { value: "Para pedir · Yiwu" } });
    fireEvent.submit(screen.getByLabelText("Nombre de la vista").closest("form"));
    await screen.findByTitle("Para pedir · Yiwu");
    expect(screen.getByRole("heading", { level: 1, name: "Para pedir · Yiwu" })).toBeTruthy();
    expect(JSON.parse(localStorage.getItem("fairscan.vistas.equipo-1"))[0].nombre).toBe("Para pedir · Yiwu");
  });

  it("el atajo '?' muestra los atajos; 1 a 5 cambian de sección; T cambia a tabla", () => {
    con(<Escritorio {...base()} />);
    fireEvent.keyDown(window, { key: "?" });
    expect(screen.getByRole("dialog", { name: "Atajos de teclado" })).toBeTruthy();
    fireEvent.keyDown(window, { key: "Escape" });
    fireEvent.keyDown(window, { key: "2" });
    expect(screen.getByRole("heading", { level: 1, name: /Proveedores/ })).toBeTruthy();
    fireEvent.keyDown(window, { key: "1" });
    fireEvent.keyDown(window, { key: "t" });
    expect(screen.getByRole("table", { name: "Catálogo" })).toBeTruthy();
  });

  it("feria sin fotos: explica qué va a aparecer y ofrece mirar la feria que sí tiene", () => {
    const onSwitch = vi.fn();
    con(<Escritorio {...base({ activeDistrictId: 2, products: products.filter(p => p.id !== 4), onSwitchDistrict: onSwitch })} />);
    expect(screen.getByText("Cafira todavía no tiene fotos")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /o mirá Cantón, que tiene 3/ }));
    expect(onSwitch).toHaveBeenCalledWith(1);
  });

  it("la barra lateral se pliega con [ y se recuerda; ] cierra la ficha", () => {
    con(<Escritorio {...base()} />);
    fireEvent.keyDown(window, { key: "[" });
    expect(within(nav()).queryByText("Proveedores")).toBeNull();
    expect(within(nav()).getByLabelText("Proveedores")).toBeTruthy(); // queda el ícono con su nombre
    expect(localStorage.getItem("fairscan.escritorio.lateral")).toBe("1");
    fireEvent.keyDown(window, { key: "[" });
    fireEvent.click(screen.getByRole("button", { name: "Taza de cerámica" }));
    expect(screen.getByRole("dialog", { name: "Taza de cerámica" })).toBeTruthy();
    fireEvent.keyDown(window, { key: "]" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("campos propios: se crea desde Columnas, aparece como columna y la celda guarda en extras", async () => {
    const onActualizar = vi.fn();
    con(<Escritorio {...base({ equipoId: "equipo-1", onActualizarProducto: onActualizar })} />);
    fireEvent.click(screen.getByRole("button", { name: "Ver en tabla" }));
    fireEvent.click(screen.getByRole("button", { name: /Columnas/ }));
    fireEvent.click(screen.getByRole("button", { name: "+ Campo nuevo" }));
    fireEvent.change(screen.getByLabelText("Nombre del campo"), { target: { value: "Código interno" } });
    fireEvent.submit(screen.getByLabelText("Nombre del campo").closest("form"));
    await screen.findByRole("columnheader", { name: /Código interno/ });
    fireEvent.keyDown(window, { key: "Escape" });
    const celda = screen.getByLabelText("Editar Código interno de Taza de cerámica");
    fireEvent.click(celda);
    fireEvent.change(screen.getByLabelText("Editar Código interno de Taza de cerámica"), { target: { value: "TZ-01" } });
    fireEvent.keyDown(screen.getByLabelText("Editar Código interno de Taza de cerámica"), { key: "Enter" });
    expect(onActualizar).toHaveBeenCalledWith(1, { extras: { codigo_interno: "TZ-01" } });
    expect(JSON.parse(localStorage.getItem("fairscan.camposPropios.equipo-1"))[0].nombre).toBe("Código interno");
  });

  it("abrir un producto desde un pedido no se va del pedido", async () => {
    const orders = [{ id: 5, supplierId: 10, districtId: 1, estado: "en_curso", items: [{ productId: 1, cantidad: 10 }] }];
    con(<Escritorio {...base({ orders, onPedidoPara: vi.fn(async () => orders[0]) })} />);
    fireEvent.click(within(nav()).getByText("Pedidos"));
    fireEvent.click(screen.getByText("Yiwu Sunrise"));
    await screen.findByRole("heading", { level: 1, name: /Pedido · Yiwu Sunrise/ });
    fireEvent.click(screen.getAllByRole("button", { name: "Ver producto" })[0]);
    expect(screen.getByRole("dialog", { name: /Taza de cerámica|Vela de soja/ })).toBeTruthy();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.getByRole("heading", { level: 1, name: /Pedido · Yiwu Sunrise/ })).toBeTruthy(); // sigue en el pedido
  });

  it("la pista de la primera vez se ve una vez y se cierra para siempre", () => {
    localStorage.removeItem("fairscan.escritorio.bienvenida");
    con(<Escritorio {...base()} />);
    expect(screen.getByRole("note")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cerrar este aviso" }));
    expect(screen.queryByRole("note")).toBeNull();
    expect(localStorage.getItem("fairscan.escritorio.bienvenida")).toBe("1");
  });

  it("Pedidos: la lista con totales y el Excel de la feria; se puede borrar un pedido; Crear elige cualquier proveedor con productos", async () => {
    const orders = [{ id: 5, supplierId: 10, districtId: 1, estado: "en_curso", items: [{ productId: 1, cantidad: 10 }] }];
    const onEliminarPedido = vi.fn(), onPedidoPara = vi.fn(async () => orders[0]);
    con(<Escritorio {...base({ orders, onEliminarPedido, onPedidoPara })} />);
    fireEvent.click(within(nav()).getByText("Pedidos"));
    const tabla = screen.getByRole("table", { name: "Pedidos" });
    expect(within(tabla).getByText("Yiwu Sunrise")).toBeTruthy();
    expect(within(tabla).getAllByText("480").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Excel de toda la feria" })).toBeTruthy();
    fireEvent.click(within(tabla).getByRole("button", { name: /Eliminar pedido/ }));
    fireEvent.click(within(tabla).getByRole("button", { name: "Sí, borrar" }));
    expect(onEliminarPedido).toHaveBeenCalledWith(5);
    fireEvent.click(screen.getByRole("button", { name: "Crear nuevo pedido" }));
    const opciones = screen.getByRole("combobox", { name: "¿De qué proveedor?" }).querySelectorAll("option");
    expect([...opciones].map(o => o.textContent)).toEqual(expect.arrayContaining(["Shenzhen Brightwave", "Yiwu Sunrise"]));
  });

  it("sin cuenta: el aviso y el botón Entrar", () => {
    const onEntrar = vi.fn();
    con(<Escritorio {...base({ cuenta: { esAnonima: true }, onEntrar })} />);
    expect(screen.getByText("Sin cuenta")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
    expect(onEntrar).toHaveBeenCalled();
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
