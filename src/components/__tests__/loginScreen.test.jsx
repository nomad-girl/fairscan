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
