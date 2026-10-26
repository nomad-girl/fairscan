// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import i18next from "i18next";
import { iniciarIdiomas } from "../../idiomas/index.js";
import { SistemaProvider } from "../../sistema/SistemaProvider.jsx";

vi.mock("../../sistema/vibrar.js", () => ({ vibrarSeleccion: vi.fn(), vibrarExito: vi.fn(), vibrarError: vi.fn(), vibrarObturador: vi.fn(), vibrarAviso: vi.fn() }));
vi.mock("../../lib/supabase.js", () => ({ supabase: null }));
const { HojaAyuda, mailDeAyuda, whatsappDeAyuda, PREGUNTAS_AYUDA } = await import("../HojaAyuda.jsx");
const { normalizarNegocio, soloDigitos } = await import("../../lib/negocio.js");

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
  it("sin número de WhatsApp en la config, solo el mail; con número, Chatear con soporte primero", () => {
    const { unmount } = render(<SistemaProvider modo="claro"><HojaAyuda abierta onCerrar={() => {}} /></SistemaProvider>);
    expect(screen.queryByRole("button", { name: /Chatear con soporte/ })).toBeNull();
    unmount();
    render(<SistemaProvider modo="claro"><HojaAyuda abierta onCerrar={() => {}} whatsapp="5491100000000" /></SistemaProvider>);
    expect(screen.getByRole("button", { name: /Chatear con soporte/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Escribinos por mail/ })).toBeTruthy();
    expect(screen.getByText(/WhatsApp no anda sin VPN/)).toBeTruthy(); // aviso para China
  });
  it("el WhatsApp abre wa.me con el mensaje empezado y el contexto, y el número se valida desde la config", () => {
    const url = whatsappDeAyuda(i18next.t.bind(i18next), "5491100000000", { plataforma: "ios", version: "1.0.2", instalacion: "x1" });
    expect(url.startsWith("https://wa.me/5491100000000?text=")).toBe(true);
    expect(decodeURIComponent(url.split("text=")[1])).toContain("ios · versión 1.0.2");
    expect(soloDigitos("+54 9 11 0000-0000")).toBe("5491100000000");
    expect(soloDigitos("123")).toBe("");
    expect(normalizarNegocio({}).soporte_whatsapp).toBe("");
    expect(normalizarNegocio({ soporte_whatsapp: "+54 9 11 0000 0000" }).soporte_whatsapp).toBe("5491100000000");
  });
});
