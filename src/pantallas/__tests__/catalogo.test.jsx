// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { iniciarIdiomas } from "../../idiomas/index.js";
import { SistemaProvider } from "../../sistema/SistemaProvider.jsx";
import { Catalogo } from "../Catalogo.jsx";
import { RevisarDia } from "../RevisarDia.jsx";

vi.mock("../../sistema/vibrar.js", () => ({ vibrarSeleccion: vi.fn(), vibrarExito: vi.fn(), vibrarError: vi.fn(), vibrarObturador: vi.fn(), vibrarAviso: vi.fn() }));

beforeAll(() => { iniciarIdiomas("es-AR"); });
afterEach(cleanup);

const FOTO = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
const con = (ui) => render(<SistemaProvider modo="claro">{ui}</SistemaProvider>);
const hoy = Date.now();
const ayer = hoy - 2 * 86400000;
const districts = [{ id: 1, name: "Cantón", emoji: "🇨🇳", createdAt: ayer }];
const suppliers = [{ id: 10, company: "Yiwu Sunrise", contact: "Lily", districtId: 1, createdAt: ayer, favorito: 1 }, { id: 11, company: "Shenzhen Brightwave", districtId: 1, createdAt: ayer }];
const products = [
  { id: 1, name: "Taza de cerámica blanca", category: "Vajilla", price: "0.85", supplierId: 10, supplierCompany: "Yiwu Sunrise", districtId: 1, createdAt: hoy - 1000, photos: [FOTO], ai_processed: true, favorito: 1 },
  { id: 2, name: "", category: "", supplierId: 10, districtId: 1, createdAt: hoy - 2000, photos: [FOTO], ai_processed: false },
  { id: 3, name: "Auriculares vincha", category: "Audio", price: "4.80", supplierId: null, districtId: 1, createdAt: hoy - 3000, photos: [FOTO], ai_processed: true },
  { id: 4, name: "Vela vieja", category: "Deco", price: "1.95", supplierId: 10, districtId: 1, createdAt: ayer, photos: [FOTO], ai_processed: true, favorito: 1 },
];

describe("Catálogo", () => {
  it("Todo abre en grilla, muestra el badge de pendientes y filtra por favoritos", () => {
    const onPestana = vi.fn();
    con(<Catalogo products={products} suppliers={suppliers} districts={districts} activeDistrictId={1} activeDistrict={districts[0]} pestana="todo" onPestana={onPestana} enLinea={false} />);
    expect(screen.getByRole("status").textContent).toContain("1 sin nombre · se completa cuando vuelva la señal");
    expect(screen.getByText("Taza de cerámica blanca")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Favoritos/ }));
    expect(screen.queryByText("Auriculares vincha")).toBeNull();
    expect(screen.getByText("Vela vieja")).toBeTruthy();
  });
  it("la búsqueda no distingue tildes y en Proveedores encuentra por contacto", () => {
    const onNavigate = vi.fn();
    con(<Catalogo products={products} suppliers={suppliers} districts={districts} activeDistrictId={1} activeDistrict={districts[0]} pestana="proveedores" onNavigate={onNavigate} />);
    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "lily" } });
    expect(screen.getByText("Yiwu Sunrise")).toBeTruthy();
    expect(screen.queryByText("Shenzhen Brightwave")).toBeNull();
    fireEvent.click(screen.getByText("Yiwu Sunrise"));
    expect(onNavigate).toHaveBeenCalledWith("supplier", suppliers[0]);
  });
  it("Hoy muestra el resumen y el botón Revisar el día cuando hay capturas de hoy", () => {
    const onRevisarDia = vi.fn();
    con(<Catalogo products={products} suppliers={suppliers} districts={districts} activeDistrictId={1} activeDistrict={districts[0]} pestana="hoy" onRevisarDia={onRevisarDia} />);
    expect(screen.getByText(/3 productos · 1 proveedor/)).toBeTruthy();
    fireEvent.click(screen.getByText(/Revisar el día/));
    expect(onRevisarDia).toHaveBeenCalled();
  });
  it("sin capturas de hoy, Hoy redescubre un favorito viejo", () => {
    const viejos = products.filter(p => p.createdAt < hoy - 86400000);
    con(<Catalogo products={viejos} suppliers={suppliers} districts={districts} activeDistrictId={1} activeDistrict={districts[0]} pestana="hoy" />);
    expect(screen.getByText("Hoy no capturaste nada")).toBeTruthy();
    expect(screen.getByText("Vela vieja")).toBeTruthy();
    expect(screen.getByText("Ver proveedor")).toBeTruthy();
  });
  it("vacío del todo: una sola acción, sacar la primera foto", () => {
    const onNavigate = vi.fn();
    con(<Catalogo products={[]} suppliers={[]} districts={districts} activeDistrictId={1} activeDistrict={districts[0]} pestana="todo" onNavigate={onNavigate} />);
    fireEvent.click(screen.getByText("Sacar la primera foto"));
    expect(onNavigate).toHaveBeenCalledWith("capture");
  });
});

describe("Revisar el día", () => {
  const deHoy = products.filter(p => p.createdAt > hoy - 86400000);
  it("abre en el menú de juegos con los números; el precio se carga con teclado y el proveedor con chips", () => {
    const onActualizar = vi.fn();
    con(<RevisarDia productosDeHoy={deHoy} suppliers={suppliers} onActualizarProducto={onActualizar} />);
    expect(screen.getByText("¿Qué querés revisar?")).toBeTruthy();
    fireEvent.click(screen.getByText("Falta el precio"));
    expect(screen.getByText("¿A cuánto estaba?")).toBeTruthy();
    expect(screen.getByText("1 de 1")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "4" }));
    fireEvent.click(screen.getByRole("button", { name: "," }));
    fireEvent.click(screen.getByRole("button", { name: "8" }));
    const saltar = screen.getByText("Saltar"), listo = screen.getByText("Listo");
    expect(saltar.closest("button").style.minHeight).toBe(listo.closest("button").style.minHeight);
    fireEvent.click(listo);
    expect(onActualizar).toHaveBeenCalledWith(2, { price: "4.8" });
    expect(screen.getByText("¿Qué querés revisar?")).toBeTruthy(); // vuelve al menú
    fireEvent.click(screen.getByText("Falta el proveedor"));
    expect(screen.getByText("¿De qué proveedor era?")).toBeTruthy();
    fireEvent.click(screen.getByText("Yiwu Sunrise"));
    expect(onActualizar).toHaveBeenCalledWith(3, { supplierId: 10, supplierCompany: "Yiwu Sunrise" });
  });
  it("saltar no guarda nada; favoritos y cierre; la cuenta se pide solo a quien no la tiene; eliminar siempre a mano", () => {
    const onActualizar = vi.fn(), onCrearCuenta = vi.fn(), onEliminar = vi.fn();
    con(<RevisarDia productosDeHoy={deHoy} suppliers={suppliers} esAnonima onActualizarProducto={onActualizar} onCrearCuenta={onCrearCuenta} onEliminar={onEliminar} />);
    fireEvent.click(screen.getByText("Falta el precio"));
    fireEvent.click(screen.getByText("Saltar"));
    expect(onActualizar).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Falta el proveedor"));
    fireEvent.click(screen.getByRole("button", { name: /Eliminar producto/ }));
    expect(onEliminar).toHaveBeenCalledWith(deHoy.find(p => p.id === 3));
    fireEvent.click(screen.getByText("Mis favoritos de hoy"));
    expect(screen.getByText("Tus favoritos de hoy")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Taza de cerámica blanca" }));
    expect(onActualizar).toHaveBeenCalledWith(1, { favorito: 0 });
    fireEvent.click(screen.getByText("Cerrar el día"));
    expect(screen.getByText("Día cerrado")).toBeTruthy();
    fireEvent.click(screen.getByText("Crear cuenta"));
    expect(onCrearCuenta).toHaveBeenCalled();
  });
  it("los repetidos probables son un juego aparte; Juntar avisa y vuelve al menú", () => {
    const onJuntar = vi.fn();
    const par = [
      { id: 21, name: "Taza de cerámica blanca", category: "Vajilla", price: "0.85", supplierId: 10, createdAt: hoy - 50000, photos: [FOTO], ai_processed: true },
      { id: 22, name: "Taza cerámica blanca lisa", category: "Vajilla", price: "0.85", supplierId: 10, createdAt: hoy - 20000, photos: [FOTO], ai_processed: true },
    ];
    con(<RevisarDia productosDeHoy={[...deHoy, ...par]} suppliers={suppliers} onJuntar={onJuntar} />);
    expect(screen.getByText("1 par")).toBeTruthy();
    fireEvent.click(screen.getByText("Repetidos probables"));
    expect(screen.getByText("¿Son el mismo producto?")).toBeTruthy();
    fireEvent.click(screen.getByText("Juntar en uno"));
    expect(onJuntar).toHaveBeenCalledWith(par[0], par[1]);
    expect(screen.getByText("¿Qué querés revisar?")).toBeTruthy();
  });
});
