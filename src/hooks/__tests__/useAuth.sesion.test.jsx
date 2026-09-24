// @vitest-environment jsdom
/**
 * Protocolo de datos sagrados (24/09), medida 4: los cambios de sesión que el 23/09 hicieron ver
 * el catálogo vacío a Lucas quedan como tests. Un dispositivo que tuvo cuenta nunca pasa a
 * "sin cuenta" en silencio.
 */
import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  signInAnonymously: vi.fn(),
}));
vi.mock("../../lib/supabase.js", () => ({
  supabase: { auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }), getSession: mocks.getSession } },
  signIn: vi.fn(), signUp: vi.fn(), signOut: vi.fn(), convertirCuenta: vi.fn(), resetPassword: vi.fn(), updatePassword: vi.fn(),
  getSession: mocks.getSession,
  signInAnonymously: mocks.signInAnonymously,
  onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
}));

import useAuth from "../useAuth.js";

function Sonda() {
  const auth = useAuth();
  if (auth.loading) return <span>cargando</span>;
  if (!auth.user) return <span>login</span>;
  return <span>{auth.esAnonima ? "sin cuenta" : `cuenta ${auth.user.email}`}</span>;
}

beforeEach(() => { localStorage.clear(); mocks.getSession.mockReset(); mocks.signInAnonymously.mockReset(); });

describe("La sesión y los datos", () => {
  it("primera vez, sin sesión: entra sin cuenta (para sacar la primera foto sin registrarse)", async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null } });
    mocks.signInAnonymously.mockResolvedValue({ user: { id: "anon", is_anonymous: true } });
    render(<Sonda />);
    await screen.findByText("sin cuenta");
    expect(mocks.signInAnonymously).toHaveBeenCalledTimes(1);
  });

  it("un dispositivo que ya tuvo cuenta y pierde la sesión va al login, nunca a 'sin cuenta' (caso Lucas)", async () => {
    localStorage.setItem("fairscan_tuvo_cuenta", "1");
    mocks.getSession.mockResolvedValue({ data: { session: null } });
    render(<Sonda />);
    await screen.findByText("login");
    expect(mocks.signInAnonymously).not.toHaveBeenCalled();
  });

  it("al ver una cuenta real, el dispositivo la recuerda para la próxima", async () => {
    mocks.getSession.mockResolvedValue({ data: { session: { user: { id: "u1", email: "lucas@ejemplo.com", is_anonymous: false } } } });
    render(<Sonda />);
    await screen.findByText("cuenta lucas@ejemplo.com");
    expect(localStorage.getItem("fairscan_tuvo_cuenta")).toBe("1");
  });

  it("después de cerrar sesión a propósito, tampoco entra sin cuenta", async () => {
    localStorage.setItem("fairscan_cerro_sesion", "1");
    mocks.getSession.mockResolvedValue({ data: { session: null } });
    render(<Sonda />);
    await screen.findByText("login");
    await waitFor(() => expect(mocks.signInAnonymously).not.toHaveBeenCalled());
  });
});
