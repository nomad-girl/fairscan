// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LoginScreen from "../LoginScreen.jsx";
import { PALETAS } from "../../sistema/tokens.js";

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
