// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import i18next from "i18next";
import { iniciarIdiomas } from "../../idiomas/index.js";
import { SistemaProvider } from "../../sistema/SistemaProvider.jsx";

vi.mock("../../sistema/vibrar.js", () => ({ vibrarSeleccion: vi.fn(), vibrarExito: vi.fn(), vibrarError: vi.fn(), vibrarObturador: vi.fn(), vibrarAviso: vi.fn() }));
vi.mock("../../lib/supabase.js", () => ({ supabase: null }));
const { HojaAyuda, mailDeAyuda, PREGUNTAS_AYUDA } = await import("../HojaAyuda.jsx");

beforeAll(() => { iniciarIdiomas("es-AR"); });
afterEach(cleanup);

describe("Ayuda (26/10)", () => {
  it("muestra las seis preguntas, abre la respuesta y ofrece ver la guía", () => {
    const onVerGuia = vi.fn();
    render(<SistemaProvider modo="claro"><HojaAyuda abierta onCerrar={() => {}} onVerGuia={onVerGuia} /></SistemaProvider>);
    expect(PREGUNTAS_AYUDA).toHaveLength(6);
    fireEvent.click(screen.getByText("¿Funciona sin internet?"));
    // verificado contra la app: sin señal se sacan las fotos y la IA las completa al volver
    expect(screen.getByText(/la IA las completa cuando vuelve la señal/)).toBeTruthy();
    fireEvent.click(screen.getByText("Ver la guía de nuevo"));
    expect(onVerGuia).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /Escribinos/ })).toBeTruthy();
  });
  it("el mail va a hola@fairscan.app con plataforma, versión e instalación, sin datos personales", () => {
    const url = mailDeAyuda(i18next.t.bind(i18next), { plataforma: "android", version: "1.7.9", instalacion: "abc-123" });
    expect(url.startsWith("mailto:hola@fairscan.app?subject=")).toBe(true);
    const cuerpo = decodeURIComponent(url.split("body=")[1]);
    expect(cuerpo).toContain("android");
    expect(cuerpo).toContain("1.7.9");
    expect(cuerpo).toContain("abc-123");
  });
});
