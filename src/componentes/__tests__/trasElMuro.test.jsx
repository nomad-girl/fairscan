// @vitest-environment jsdom
// E26 (02/11/2026): la hoja después del muro canjea el regalo con un toque y guarda el motivo.
import React from "react";
import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { iniciarIdiomas } from "../../idiomas/index.js";
import { SistemaProvider } from "../../sistema/SistemaProvider.jsx";

vi.mock("../../sistema/vibrar.js", () => ({ vibrarSeleccion: vi.fn(), vibrarExito: vi.fn(), vibrarError: vi.fn(), vibrarObturador: vi.fn(), vibrarAviso: vi.fn() }));
const { TrasElMuro } = await import("../TrasElMuro.jsx");

beforeAll(() => { iniciarIdiomas("es-AR"); });
afterEach(cleanup);
const envolver = (el) => render(<SistemaProvider modo="claro">{el}</SistemaProvider>);

describe("E26 · TrasElMuro", () => {
  it("el regalo se canjea con un toque y muestra cuántos sumó", async () => {
    const onRegalo = vi.fn(async () => ({ ok: true, escaneos: 10 }));
    envolver(<TrasElMuro oferta={{ regalo: { codigo: "REGALO10", escaneos: 10 }, preguntar: true }} onRegalo={onRegalo} onMotivo={vi.fn()} onCerrar={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Sumar 10 escaneos gratis/ }));
    await waitFor(() => expect(screen.getByText("Listo: sumamos 10 escaneos.")).toBeTruthy());
    expect(onRegalo).toHaveBeenCalledWith("REGALO10");
  });

  it("si ya lo había canjeado, lo dice", async () => {
    envolver(<TrasElMuro oferta={{ regalo: { codigo: "REGALO10", escaneos: 10 }, preguntar: false }} onRegalo={async () => ({ ok: false, motivo: "ya_canjeado" })} onMotivo={vi.fn()} onCerrar={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Sumar 10/ }));
    await waitFor(() => expect(screen.getByText(/Ya usaste/)).toBeTruthy());
  });

  it("un motivo se guarda con un toque; 'Otra cosa' pide el texto antes de mandar", () => {
    const onMotivo = vi.fn();
    envolver(<TrasElMuro oferta={{ regalo: null, preguntar: true }} onRegalo={vi.fn()} onMotivo={onMotivo} onCerrar={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Otra cosa" }));
    expect(onMotivo).not.toHaveBeenCalled();
    fireEvent.change(screen.getByPlaceholderText(/quiero probar/), { target: { value: "Prefiero Excel" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));
    expect(onMotivo).toHaveBeenCalledWith("otra", "Prefiero Excel");
    expect(screen.getByText(/Gracias/)).toBeTruthy();
  });

  it("El precio se manda directo", () => {
    const onMotivo = vi.fn();
    envolver(<TrasElMuro oferta={{ regalo: null, preguntar: true }} onRegalo={vi.fn()} onMotivo={onMotivo} onCerrar={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "El precio" }));
    expect(onMotivo).toHaveBeenCalledWith("precio", "");
  });
});
