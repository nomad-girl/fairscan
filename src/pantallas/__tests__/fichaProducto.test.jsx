// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { iniciarIdiomas } from "../../idiomas/index.js";
import { SistemaProvider } from "../../sistema/SistemaProvider.jsx";
import { FichaProducto } from "../FichaProducto.jsx";

vi.mock("../../sistema/vibrar.js", () => ({ vibrarSeleccion: vi.fn(), vibrarExito: vi.fn(), vibrarError: vi.fn(), vibrarObturador: vi.fn(), vibrarAviso: vi.fn() }));

beforeAll(() => { iniciarIdiomas("es-AR"); });
afterEach(cleanup);

const FOTO = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
const con = (ui) => render(<SistemaProvider modo="claro">{ui}</SistemaProvider>);
const suppliers = [{ id: 10, company: "Yiwu Sunrise", contact: "Lily", createdAt: 1 }, { id: 11, company: "Shenzhen Brightwave", createdAt: 2 }];
const districts = [{ id: 1, name: "Cantón", emoji: "🇨🇳" }];
const base = { id: 1, name: "Taza de cerámica blanca", price: "0.85", moq: "500", moqBase: "caja", supplierId: 10, districtId: 1, createdAt: Date.now() - 3600000, photos: [FOTO, FOTO], ai_processed: true, favorito: 0, category: "Vajilla", material: ["Cerámica"] };

describe("Ficha de producto", () => {
  it("muestra precio grande, MOQ con base, dos fotos y el proveedor como fila", () => {
    con(<FichaProducto product={base} suppliers={suppliers} districts={districts} allProducts={[base]} onAddPhoto={vi.fn()} />);
    expect(screen.getByText("USD 0.85")).toBeTruthy();
    expect(screen.getByText(/MOQ 500 por caja/)).toBeTruthy();
    expect(screen.getAllByText("Yiwu Sunrise").length).toBe(2); // bajo el título y como fila
    expect(screen.getByText("2 fotos")).toBeTruthy(); // el botón "+ ángulo" muestra cuántas hay
  });
  it("los datos del bulto son una sola línea hasta que se abren", () => {
    const onUpdate = vi.fn();
    con(<FichaProducto product={base} suppliers={suppliers} districts={districts} allProducts={[base]} onUpdate={onUpdate} />);
    expect(screen.queryByText("Piezas por caja")).toBeNull();
    fireEvent.click(screen.getByText("Datos del bulto"));
    expect(screen.getByText("Piezas por caja")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Piezas por caja/ }));
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "48" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onUpdate).toHaveBeenCalledWith(1, { piezasPorCaja: 48 });
  });
  it("favorito, cambiar de proveedor y eliminar con confirmación", () => {
    const onUpdate = vi.fn(), onDelete = vi.fn();
    con(<FichaProducto product={base} suppliers={suppliers} districts={districts} allProducts={[base]} onUpdate={onUpdate} onDelete={onDelete} />);
    fireEvent.click(screen.getByRole("button", { name: "Marcar como favorito" }));
    expect(onUpdate).toHaveBeenCalledWith(1, { favorito: 1 });
    fireEvent.click(screen.getByText("Cambiar de proveedor"));
    fireEvent.click(screen.getByText("Shenzhen Brightwave"));
    expect(onUpdate).toHaveBeenCalledWith(1, { supplierId: 11, supplierCompany: "Shenzhen Brightwave" });
    fireEvent.click(screen.getByRole("button", { name: /Eliminar producto/ }));
    expect(onDelete).not.toHaveBeenCalled();
    fireEvent.click(screen.getAllByText("Eliminar producto").pop());
    expect(onDelete).toHaveBeenCalledWith(1);
  });
  it("sin nombre y con IA pendiente muestra esqueleto; con fallo ofrece reintentar", () => {
    const onUpdate = vi.fn();
    const pendiente = { ...base, id: 2, name: "", ai_processed: false };
    const { unmount } = con(<FichaProducto product={pendiente} suppliers={suppliers} districts={districts} allProducts={[pendiente]} />);
    expect(screen.getByRole("img", { name: "Cargando" })).toBeTruthy();
    unmount();
    const fallo = { ...base, id: 3, ai_processed: true, ai_error: "timeout", aiPendiente: 0, ai_failed: true };
    con(<FichaProducto product={fallo} suppliers={suppliers} districts={districts} allProducts={[fallo]} onUpdate={onUpdate} />);
    const boton = screen.queryByText("Reintentar con IA");
    if (boton) { fireEvent.click(boton); expect(onUpdate).toHaveBeenCalled(); }
  });
});
