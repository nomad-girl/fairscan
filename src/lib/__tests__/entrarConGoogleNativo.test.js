import { describe, it, expect, vi, beforeEach } from "vitest";

// E19 (25/10/2026): en el iPhone, Google ya no pasa por el navegador (que mostraba el dominio de Supabase)
const plataforma = { valor: "ios" };
const entrarPlugin = vi.fn();
vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => true, getPlatform: () => plataforma.valor },
  registerPlugin: () => ({ entrar: entrarPlugin }),
}));
const auth = {
  signInWithIdToken: vi.fn(async () => ({ data: {}, error: null })),
  linkIdentity: vi.fn(async () => ({ data: {}, error: null })),
  signInWithOAuth: vi.fn(async () => ({ data: { url: "https://x" }, error: null })),
};
vi.mock("../supabase.js", () => ({ supabase: { auth } }));

const { entrarCon, GOOGLE_CLIENTE_IOS, GOOGLE_CLIENTE_WEB } = await import("../entrarCon.js");

describe("Entrar con Google nativo (E19)", () => {
  beforeEach(() => { vi.clearAllMocks(); entrarPlugin.mockResolvedValue({ idToken: "TOKEN" }); });

  it("en iPhone usa la hoja de Google con el cliente iOS y le da el token a Supabase con el nonce original", async () => {
    plataforma.valor = "ios";
    await expect(entrarCon("google")).resolves.toEqual({ ok: true });
    const pedido = entrarPlugin.mock.calls[0][0];
    expect(pedido.clienteIos).toBe(GOOGLE_CLIENTE_IOS);
    expect(pedido.clienteWeb).toBe(GOOGLE_CLIENTE_WEB);
    const cred = auth.signInWithIdToken.mock.calls[0][0];
    expect(cred).toMatchObject({ provider: "google", token: "TOKEN" });
    const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(cred.nonce));
    expect(pedido.nonce).toBe(Array.from(new Uint8Array(h), b => b.toString(16).padStart(2, "0")).join(""));
    expect(auth.signInWithOAuth).not.toHaveBeenCalled();
  });

  it("con sesión anónima vincula en vez de entrar", async () => {
    plataforma.valor = "ios";
    await entrarCon("google", { vincular: true });
    expect(auth.linkIdentity).toHaveBeenCalledWith(expect.objectContaining({ provider: "google", token: "TOKEN" }));
    expect(auth.signInWithIdToken).not.toHaveBeenCalled();
  });

  it("si la usuaria cierra la hoja, es una cancelación y no abre el navegador", async () => {
    plataforma.valor = "ios";
    entrarPlugin.mockRejectedValue(Object.assign(new Error("cancelado"), { code: "CANCELADO" }));
    await expect(entrarCon("google")).rejects.toMatchObject({ cancelado: true });
    expect(auth.signInWithOAuth).not.toHaveBeenCalled();
  });
});
