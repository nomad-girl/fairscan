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
const { normalizarNegocio } = await import("../../lib/negocio.js");
const { configDeChat, cargarChat } = await import("../../lib/chatSoporte.js");

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
    fireEvent.click(screen.getByText("Ver el ejemplo de nuevo"));
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
  it("sin chat en la config, solo el mail; con Chatwoot configurado, Chatear con soporte primero", () => {
    const { unmount } = render(<SistemaProvider modo="claro"><HojaAyuda abierta onCerrar={() => {}} /></SistemaProvider>);
    expect(screen.queryByRole("button", { name: /Chatear con soporte/ })).toBeNull();
    unmount();
    render(<SistemaProvider modo="claro"><HojaAyuda abierta onCerrar={() => {}} chat={{ url: "https://app.chatwoot.com", token: "abc123TOKEN" }} /></SistemaProvider>);
    expect(screen.getByRole("button", { name: /Chatear con soporte/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Escribinos por mail/ })).toBeTruthy();
  });
  it("la config del chat se valida (https y token) y viene del servidor", () => {
    expect(configDeChat({ url: "https://app.chatwoot.com/", token: "abc123TOKEN" })).toEqual({ url: "https://app.chatwoot.com", token: "abc123TOKEN" });
    expect(configDeChat({ url: "http://app.chatwoot.com", token: "abc123TOKEN" })).toBeNull();
    expect(configDeChat({ url: "https://app.chatwoot.com", token: "<script>" })).toBeNull();
    expect(normalizarNegocio({}).soporte_chat).toBeNull();
    expect(normalizarNegocio({ soporte_chat: { url: "https://app.chatwoot.com", token: "abc123TOKEN" } }).soporte_chat).toEqual({ url: "https://app.chatwoot.com", token: "abc123TOKEN" });
  });
  it("si el chat no carga a tiempo, avisa que no (y la hoja cae al mail)", async () => {
    const doc = { createElement: () => ({}), body: { appendChild: () => {} }, documentElement: { lang: "es" } };
    const win = { addEventListener: () => {} };
    expect(await cargarChat({ url: "https://app.chatwoot.com", token: "abc123TOKEN" }, { doc, win, espera: 20 })).toBe(false);
  });
});
