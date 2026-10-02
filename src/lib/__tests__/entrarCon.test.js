import { describe, it, expect } from "vitest";
import { leerVuelta, esCuentaYaExistente, esCancelado, VUELTA_NATIVA } from "../entrarCon.js";

describe("Entrar con Apple / Google (E11)", () => {
  it("lee los tokens que vuelven en el fragmento de la dirección de la app", () => {
    const v = leerVuelta(`${VUELTA_NATIVA}#access_token=AAA&refresh_token=RRR&token_type=bearer&type=signup`);
    expect(v.access_token).toBe("AAA");
    expect(v.refresh_token).toBe("RRR");
    expect(v.error).toBeNull();
  });
  it("lee el código (PKCE) y el error cuando vienen en la consulta", () => {
    expect(leerVuelta(`${VUELTA_NATIVA}?code=xyz`).code).toBe("xyz");
    const e = leerVuelta(`${VUELTA_NATIVA}?error=access_denied&error_description=El%20usuario%20cancel%C3%B3`);
    expect(e.error).toBe("El usuario canceló");
  });
  it("una dirección rota no tira: devuelve todo vacío", () => {
    expect(leerVuelta("no es una url").access_token).toBeNull();
  });
  it("reconoce 'ese mail ya tiene cuenta' y la cancelación", () => {
    expect(esCuentaYaExistente(new Error("Identity is already linked to another user"))).toBe(true);
    expect(esCuentaYaExistente({ code: "identity_already_exists" })).toBe(true);
    expect(esCuentaYaExistente(new Error("Network request failed"))).toBe(false);
    expect(esCancelado(Object.assign(new Error("cancelado"), { cancelado: true }))).toBe(true);
    expect(esCancelado(new Error("otro"))).toBe(false);
  });
});
