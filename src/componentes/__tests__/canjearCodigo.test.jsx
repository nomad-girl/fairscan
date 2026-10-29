// @vitest-environment jsdom
// Canjear código (E24, 29/10/2026): el campo limpia lo tecleado, no manda códigos cortos, y muestra lo que contestó el servidor.
import React from "react";
import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import i18next from "i18next";
import { iniciarIdiomas } from "../../idiomas/index.js";
import { SistemaProvider } from "../../sistema/SistemaProvider.jsx";

vi.mock("../../sistema/vibrar.js", () => ({ vibrarSeleccion: vi.fn(), vibrarExito: vi.fn(), vibrarError: vi.fn(), vibrarObturador: vi.fn(), vibrarAviso: vi.fn() }));
const { CanjearCodigo, limpiarCodigo, explicarCanje } = await import("../CanjearCodigo.jsx");

beforeAll(() => { iniciarIdiomas("es-AR"); });
afterEach(cleanup);

describe("Canjear código (E24)", () => {
  it("limpia lo tecleado: mayúsculas, sin espacios ni guiones, 20 como máximo", () => {
    expect(limpiarCodigo(" indigo-26 ")).toBe("INDIGO26");
    expect(limpiarCodigo("a".repeat(30))).toHaveLength(20);
    expect(limpiarCodigo(null)).toBe("");
  });

  it("cada motivo del servidor tiene su texto", () => {
    const t = i18next.t.bind(i18next);
    expect(explicarCanje(t, "ya_canjeado")).toMatch(/Ya usaste/);
    expect(explicarCanje(t, "agotado")).toMatch(/cupos/);
    expect(explicarCanje(t, "sin_sesion")).toMatch(/cuenta/);
    expect(explicarCanje(t, "lo-que-sea")).toMatch(/no existe/);
  });

  it("arranca como un enlace; con el campo abierto no canjea códigos cortos y muestra el resultado del servidor", async () => {
    const onCanjear = vi.fn(async (codigo) => (codigo === "INDIGO26" ? { ok: true, escaneos: 100, origen: "IndiGO" } : { ok: false, motivo: "no_existe" }));
    render(<SistemaProvider modo="claro"><CanjearCodigo onCanjear={onCanjear} /></SistemaProvider>);
    fireEvent.click(screen.getByRole("button", { name: /Tengo un código/ }));
    const campo = screen.getByPlaceholderText("Ej.: INDIGO26");
    const boton = screen.getByRole("button", { name: /Canjear/ });
    fireEvent.change(campo, { target: { value: "ab" } });
    expect(boton.disabled).toBe(true);
    fireEvent.change(campo, { target: { value: "nada99" } });
    fireEvent.click(boton);
    await waitFor(() => expect(screen.getByRole("status").textContent).toMatch(/no existe/));
    fireEvent.change(campo, { target: { value: "indigo 26" } });
    expect(campo.value).toBe("INDIGO26");
    fireEvent.keyDown(campo, { key: "Enter" });
    await waitFor(() => expect(screen.getByRole("status").textContent).toMatch(/100 escaneos de IndiGO/));
    expect(onCanjear).toHaveBeenLastCalledWith("INDIGO26");
  });
});
