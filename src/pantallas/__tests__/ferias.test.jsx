// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { iniciarIdiomas } from "../../idiomas/index.js";
import { SistemaProvider } from "../../sistema/SistemaProvider.jsx";
import { Ferias, partirFechas, unirFechas, fechasLegibles } from "../Ferias.jsx";

vi.mock("../../sistema/vibrar.js", () => ({ vibrarSeleccion: vi.fn(), vibrarExito: vi.fn(), vibrarError: vi.fn(), vibrarObturador: vi.fn(), vibrarAviso: vi.fn() }));

beforeAll(() => { iniciarIdiomas("es-AR"); });
afterEach(cleanup);

const con = (ui) => render(<SistemaProvider modo="claro">{ui}</SistemaProvider>);
const districts = [
  { id: 1, name: "CAFIRA 26", location: "Buenos Aires", dates: "2026-09-19/2026-09-22", emoji: "🏮" },
  { id: 2, name: "Canton Fase 2", location: "Guangzhou", dates: "2026-10-23/2026-10-27" },
  { id: 3, name: "Yiwu 2025", location: "Yiwu, China", dates: "octubre 2025" },
];
const products = [{ id: 1, districtId: 1 }, { id: 2, districtId: 1 }, { id: 3, districtId: 3 }];
const suppliers = [{ id: 10, districtId: 1 }, { id: 11, districtId: 3 }];

describe("Fechas de la feria", () => {
  it("guarda las dos fechas en el campo que ya viaja a la nube y las lee de vuelta", () => {
    expect(unirFechas({ desde: "2026-09-19", hasta: "2026-09-22" })).toBe("2026-09-19/2026-09-22");
    expect(unirFechas({ desde: "", hasta: "" })).toBe("");
    expect(partirFechas("2026-09-19/2026-09-22")).toEqual({ desde: "2026-09-19", hasta: "2026-09-22" });
    expect(partirFechas("15-19 Abr")).toBeNull(); // texto libre de la versión vieja
  });
  it("se leen como fechas de verdad; el texto libre viejo se muestra tal cual", () => {
    expect(fechasLegibles("2026-09-19/2026-09-22", "es-AR")).toBe("19 al 22 de septiembre");
    expect(fechasLegibles("2026-09-28/2026-10-02", "es-AR")).toMatch(/28 .*sep.* al 2 .*oct/);
    expect(fechasLegibles("15-19 Abr", "es-AR")).toBe("15-19 Abr");
    expect(fechasLegibles("", "es-AR")).toBe("");
  });
});

describe("Pantalla de Ferias (wireframe A)", () => {
  it("una fila por feria sin emojis, con ciudad, fechas y cuánto tiene; la que está en uso lleva la tilde", () => {
    con(<Ferias districts={districts} activeDistrictId={1} products={products} suppliers={suppliers} />);
    expect(screen.getByRole("heading", { name: "Ferias" })).toBeTruthy();
    expect(screen.queryByText("🏮")).toBeNull();
    expect(screen.getByText("Buenos Aires · 19 al 22 de septiembre")).toBeTruthy();
    expect(screen.getByText("2 productos · 1 proveedor")).toBeTruthy();
    expect(screen.getByText("Todavía sin productos")).toBeTruthy();
    expect(screen.getByText("En uso")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Usar CAFIRA 26" }).getAttribute("aria-pressed")).toBe("true");
  });
  it("tocar una fila la pone en uso; el lápiz abre la hoja para editar y guarda las dos fechas", () => {
    const onActivate = vi.fn(), onUpdate = vi.fn();
    con(<Ferias districts={districts} activeDistrictId={1} products={products} suppliers={suppliers} onActivate={onActivate} onUpdate={onUpdate} />);
    fireEvent.click(screen.getByRole("button", { name: "Usar Canton Fase 2" }));
    expect(onActivate).toHaveBeenCalledWith(2);
    fireEvent.click(screen.getByRole("button", { name: "Editar Canton Fase 2" }));
    expect(screen.getByText("Editar feria")).toBeTruthy();
    expect(screen.getByLabelText("Nombre").value).toBe("Canton Fase 2");
    expect(screen.getByLabelText("Empieza").value).toBe("2026-10-23");
    fireEvent.change(screen.getByLabelText("Ciudad"), { target: { value: "Cantón" } });
    fireEvent.change(screen.getByLabelText("Termina"), { target: { value: "2026-10-28" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(onUpdate).toHaveBeenCalledWith(2, { name: "Canton Fase 2", location: "Cantón", dates: "2026-10-23/2026-10-28", emoji: null });
  });
  it("Nueva feria abre la misma hoja vacía y crea con nombre, ciudad y fechas", () => {
    const onAdd = vi.fn();
    con(<Ferias districts={districts} activeDistrictId={1} products={products} suppliers={suppliers} onAdd={onAdd} />);
    fireEvent.click(screen.getByRole("button", { name: "Nueva feria" }));
    expect(screen.getByRole("button", { name: "Crear" }).disabled).toBe(true); // sin nombre no se crea
    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Yiwu 2026" } });
    fireEvent.change(screen.getByLabelText("Ciudad"), { target: { value: "Yiwu" } });
    fireEvent.click(screen.getByRole("button", { name: "Crear" }));
    expect(onAdd).toHaveBeenCalledWith({ name: "Yiwu 2026", location: "Yiwu", dates: "", emoji: null });
  });
  it("eliminar con resguardo: por defecto mueve lo que tiene a otra feria; borrar exige escribir el nombre", () => {
    const onDelete = vi.fn();
    con(<Ferias districts={districts} activeDistrictId={1} products={products} suppliers={suppliers} onDelete={onDelete} />);
    fireEvent.click(screen.getByRole("button", { name: "Editar CAFIRA 26" }));
    expect(screen.getByText("Tiene 2 productos y 1 proveedor")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Eliminar" }));
    expect(screen.getByText('Eliminar "CAFIRA 26"')).toBeTruthy();
    // Mover es la opción por defecto, a la primera de las otras ferias
    expect(screen.getByRole("button", { name: /Moverlos a otra feria/ }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByLabelText("A qué feria").value).toBe("2");
    expect(screen.getByText("Esta feria está en uso: la app pasa a Canton Fase 2.")).toBeTruthy();
    // Borrar también: el botón queda deshabilitado hasta escribir el nombre exacto
    fireEvent.click(screen.getByRole("button", { name: /Borrarlos también/ }));
    const eliminar = screen.getByRole("button", { name: "Eliminar la feria" });
    expect(eliminar.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText(/escribí el nombre de la feria/), { target: { value: "CAFIRA 26" } });
    expect(eliminar.disabled).toBe(false);
    // Volvemos a mover, a Yiwu, y confirmamos
    fireEvent.click(screen.getByRole("button", { name: /Moverlos a otra feria/ }));
    fireEvent.change(screen.getByLabelText("A qué feria"), { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: "Eliminar la feria" }));
    expect(onDelete).toHaveBeenCalledWith(1, { moverA: 3 });
  });
  it("una feria vacía se elimina sin preguntar qué hacer con nada", () => {
    const onDelete = vi.fn();
    con(<Ferias districts={districts} activeDistrictId={1} products={products} suppliers={suppliers} onDelete={onDelete} />);
    fireEvent.click(screen.getByRole("button", { name: "Editar Canton Fase 2" }));
    expect(screen.getByText("Está vacía")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Eliminar" }));
    expect(screen.getByText("La feria está vacía: se elimina y no se pierde nada.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Eliminar la feria" }));
    expect(onDelete).toHaveBeenCalledWith(2, { moverA: 1 });
  });
});
