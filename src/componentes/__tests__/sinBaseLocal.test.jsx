// @vitest-environment jsdom
// Sin base local (02/11/2026, Sentry FAIRSCAN-17): con el Modo de aislamiento del iPhone no hay IndexedDB; la app lo explica.
import React from "react";
import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { iniciarIdiomas } from "../../idiomas/index.js";
import { SistemaProvider } from "../../sistema/SistemaProvider.jsx";

vi.mock("../../sistema/vibrar.js", () => ({ vibrarSeleccion: vi.fn(), vibrarExito: vi.fn(), vibrarError: vi.fn(), vibrarObturador: vi.fn(), vibrarAviso: vi.fn() }));
const { SinBaseLocal, hayBaseLocal } = await import("../SinBaseLocal.jsx");

beforeAll(() => { iniciarIdiomas("es-AR"); });
afterEach(cleanup);

describe("Sin base local", () => {
  it("detecta si falta IndexedDB", () => {
    expect(hayBaseLocal({ indexedDB: {} })).toBe(true);
    expect(hayBaseLocal({})).toBe(false);
  });
  it("explica cómo excluir FairScan del Modo de aislamiento y deja reintentar", () => {
    const onReintentar = vi.fn();
    render(<SistemaProvider modo="claro"><SinBaseLocal onReintentar={onReintentar} /></SistemaProvider>);
    expect(screen.getByText(/no puede guardar en este iPhone/)).toBeTruthy();
    expect(screen.getByText(/Configurar navegación web/)).toBeTruthy();
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(onReintentar).toHaveBeenCalled();
  });
});
