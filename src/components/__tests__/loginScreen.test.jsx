// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
afterEach(cleanup); // sin globals, RTL no limpia solo entre tests
import LoginScreen from "../LoginScreen.jsx";
import { PALETAS } from "../../sistema/tokens.js";
import { iniciarIdiomas } from "../../idiomas/index.js";

// La pantalla pide sus textos por clave (E6): se arranca el idioma como en la app.
beforeAll(() => { iniciarIdiomas("es-AR"); });

const tema = { ...PALETAS.claro, redSoft: "rgba(220,38,38,0.1)", greenSoft: "rgba(21,128,61,0.1)" };

describe("Entrar · Olvidé mi contraseña (27/09)", () => {
  it("abre su propia pantalla con solo el mail, manda el enlace y confirma a qué mail", async () => {
    const recuperar = vi.fn().mockResolvedValue(true);
    render(<LoginScreen t={tema} onAuth={{ recuperar, signIn: vi.fn() }} />);
    fireEvent.click(screen.getByText("Olvidé mi contraseña"));
    expect(screen.getByRole("heading", { name: "Recuperar la contraseña" })).toBeTruthy();
    expect(screen.queryByLabelText("Contraseña")).toBeNull(); // solo el campo de mail
    fireEvent.change(screen.getByLabelText("Mail"), { target: { value: "nati@ejemplo.com" } });
    fireEvent.click(screen.getByText("Mandarme el enlace"));
    await waitFor(() => expect(recuperar).toHaveBeenCalledWith("nati@ejemplo.com"));
    expect(await screen.findByText(/te mandamos un mail a/i)).toBeTruthy();
    fireEvent.click(screen.getByText("Volver a entrar"));
    expect(screen.getByRole("heading", { name: "Entrar" })).toBeTruthy();
  });
});

describe("Crear cuenta desde una sesión sin cuenta, con Confirm email encendido (D3, 27/09)", () => {
  it("si la cuenta queda pendiente de confirmar, lo dice, ofrece reenviar y no cierra como si ya existiera", async () => {
    const convertir = vi.fn().mockResolvedValue({ user: { is_anonymous: true, new_email: "nati@ejemplo.com" } });
    const reenviar = vi.fn().mockResolvedValue(true); const onCancel = vi.fn();
    render(<LoginScreen t={tema} convertir onCancel={onCancel} onAuth={{ convertir, reenviar, signIn: vi.fn(), signUp: vi.fn() }} />);
    fireEvent.change(screen.getByLabelText("Mail"), { target: { value: "nati@ejemplo.com" } });
    fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: "secreta1" } });
    fireEvent.submit(screen.getByLabelText("Mail").closest("form"));
    await waitFor(() => expect(convertir).toHaveBeenCalled());
    expect(await screen.findByRole("heading", { name: "Revisá tu mail" })).toBeTruthy();
    expect(onCancel).not.toHaveBeenCalled(); // no la deja seguir como si la cuenta ya existiera
    fireEvent.click(screen.getByText("Reenviar el mail"));
    await waitFor(() => expect(reenviar).toHaveBeenCalledWith("nati@ejemplo.com"));
    fireEvent.click(screen.getByText("Ya lo confirmé"));
    expect(onCancel).toHaveBeenCalled();
  });
});

describe("Crear cuenta con un mail que ya tiene cuenta (caso Ganga Home, 25/10)", () => {
  it("no dice 'revisá tu mail': avisa que ya tiene cuenta y pasa a Entrar", async () => {
    // Supabase responde "bien", sin sesión y sin identidades, y no manda ningún correo
    const signUp = vi.fn().mockResolvedValue({ user: { id: "x", identities: [] }, session: null });
    render(<LoginScreen t={tema} modoInicial="register" onAuth={{ signUp, signIn: vi.fn() }} />);
    expect(screen.getByRole("heading", { name: "Crear cuenta" })).toBeTruthy(); // abre directo en crear cuenta
    fireEvent.change(screen.getByLabelText("Mail"), { target: { value: "importador@ejemplo.com" } });
    fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: "secreta-larga-1" } });
    fireEvent.submit(screen.getByLabelText("Mail").closest("form"));
    expect(await screen.findByText(/Ese mail ya tiene una cuenta en FairScan/)).toBeTruthy();
    expect(screen.queryByText("Revisá tu email para confirmar la cuenta")).toBeNull();
    expect(screen.getByRole("heading", { name: "Entrar" })).toBeTruthy();
  });
});

describe("Cuenta obligatoria (27/10)", () => {
  it("convierte la sesión sin cuenta: muestra el motivo, crea con convertir y, sin cancelable, no se puede volver", () => {
    const convertir = vi.fn().mockResolvedValue({ user: { is_anonymous: true, new_email: "a@b.com" } });
    render(<LoginScreen t={tema} convertir modoInicial="register" frase="Creá tu cuenta para seguir escaneando." onAuth={{ convertir, signIn: vi.fn(), signUp: vi.fn() }} />);
    expect(screen.getByText("Creá tu cuenta para seguir escaneando.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Volver" })).toBeNull();
  });
  it("la de pago se puede cerrar", () => {
    const onCancel = vi.fn();
    render(<LoginScreen t={tema} convertir cancelable modoInicial="register" onCancel={onCancel} onAuth={{ convertir: vi.fn(), signIn: vi.fn(), signUp: vi.fn() }} />);
    fireEvent.click(screen.getByRole("button", { name: "Volver" }));
    expect(onCancel).toHaveBeenCalled();
  });
  it("si elige Ya tengo cuenta, avisa que lo del teléfono sin cuenta no pasa a esa cuenta", () => {
    render(<LoginScreen t={tema} convertir modoInicial="register" onAuth={{ convertir: vi.fn(), signIn: vi.fn(), signUp: vi.fn() }} />);
    fireEvent.click(screen.getByText("Ya tengo cuenta"));
    expect(screen.getByText(/no pasa a esa cuenta/)).toBeTruthy();
  });
});
