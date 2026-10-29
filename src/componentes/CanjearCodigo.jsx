// Canjear código (E24, 29/10/2026, buzón 28/10 (16)): un código de agencia o campaña suma escaneos de cortesía.
// Vive dentro de la hoja de packs: un enlace "Tengo un código" que abre el campo, en mayúsculas, con un botón
// "Canjear". La validación y la acreditación las hace el servidor (`canjear_codigo`); acá solo se muestra el
// resultado. Sin sesión no se canjea (el saldo vive en la cuenta): quien llama decide si pide la cuenta antes.
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSistema } from "../sistema/SistemaProvider.jsx";
import { Boton } from "./Boton.jsx";

/** Texto para la usuaria según lo que contestó el servidor. */
export function explicarCanje(t, motivo) {
  const claves = { sin_sesion: "codigo.sinSesion", no_existe: "codigo.noExiste", vencido: "codigo.vencido", ya_canjeado: "codigo.yaCanjeado", agotado: "codigo.agotado", sin_senal: "codigo.sinSenal" };
  return t(claves[motivo] || "codigo.noExiste");
}

/** Normaliza lo tecleado: mayúsculas, sin espacios ni guiones, 20 como máximo. */
export const limpiarCodigo = (texto) => String(texto || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20);

/**
 * @param {(codigo: string) => Promise<{ ok: boolean, motivo?: string, escaneos?: number, origen?: string }>} onCanjear
 */
export function CanjearCodigo({ onCanjear, estilo }) {
  const { t } = useTranslation();
  const { paleta, texto } = useSistema();
  const [abierto, setAbierto] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null); // { ok, texto }

  const canjear = async () => {
    if (codigo.length < 4 || enviando) return;
    setEnviando(true); setResultado(null);
    try {
      const r = await onCanjear(codigo);
      if (r?.ok) { setResultado({ ok: true, texto: t("codigo.ok", { count: r.escaneos, origen: r.origen || "" }) }); setCodigo(""); }
      else setResultado({ ok: false, texto: explicarCanje(t, r?.motivo) });
    } catch (e) {
      setResultado({ ok: false, texto: explicarCanje(t, /fetch|network|failed|load/i.test(String(e?.message)) ? "sin_senal" : "no_existe") });
    } finally { setEnviando(false); }
  };

  if (!abierto) {
    return (
      <button type="button" onClick={() => setAbierto(true)}
        style={{ ...estilo, minHeight: 40, padding: "8px 4px", border: "none", background: "transparent", color: paleta.accent, fontFamily: "inherit", fontSize: 14, fontWeight: 700, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 }}>
        {t("codigo.tengo")}
      </button>
    );
  }
  return (
    <div style={{ ...estilo, display: "flex", flexDirection: "column", gap: 8 }}>
      <label style={{ ...texto("pie"), color: paleta.muted, fontWeight: 600 }} htmlFor="fs-codigo">{t("codigo.titulo")}</label>
      <div style={{ display: "flex", gap: 8 }}>
        <input id="fs-codigo" autoFocus autoCapitalize="characters" autoCorrect="off" spellCheck={false} inputMode="text" maxLength={20} value={codigo} placeholder={t("codigo.placeholder")}
          onChange={e => { setCodigo(limpiarCodigo(e.target.value)); setResultado(null); }}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); canjear(); } }}
          style={{ flex: 1, minWidth: 0, minHeight: 48, padding: "0 14px", borderRadius: 14, border: `1px solid ${paleta.border}`, background: paleta.card, color: paleta.text, fontFamily: "inherit", fontSize: 18, fontWeight: 700, letterSpacing: "0.08em", outline: "none" }} />
        <Boton variante="principal" deshabilitado={codigo.length < 4} cargando={enviando} onClick={canjear}>{t("codigo.canjear")}</Boton>
      </div>
      {resultado && <p role="status" style={{ ...texto("pie"), margin: 0, fontWeight: 600, color: resultado.ok ? "#15803D" : paleta.red }}>{resultado.texto}</p>}
    </div>
  );
}
