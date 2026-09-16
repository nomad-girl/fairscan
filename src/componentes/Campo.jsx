/**
 * Campo de la ficha: una línea "etiqueta · valor". Si está vacío y no está en
 * edición, muestra "Agregar ›" en gris y no ocupa más que una línea (decisión
 * del 16/09: nada vacío ocupa lugar). Al tocarlo se edita en el lugar; guarda
 * al salir. Numérico abre el teclado de números.
 */
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSistema } from "../sistema/SistemaProvider.jsx";

export function Campo({ etiqueta, valor, onChange, tipo = "texto", sufijo, placeholder, multilinea = false, soloLectura = false, estilo }) {
  const { paleta, alturas, texto } = useSistema();
  const { t } = useTranslation();
  const [editando, setEditando] = useState(false);
  const [borrador, setBorrador] = useState(valor ?? "");
  const ref = useRef(null);

  useEffect(() => { if (!editando) setBorrador(valor ?? ""); }, [valor, editando]);
  useEffect(() => { if (editando) ref.current?.focus(); }, [editando]);

  const vacio = valor === null || valor === undefined || String(valor).trim() === "";

  const confirmar = () => {
    setEditando(false);
    const nuevo = tipo === "numero" ? (borrador === "" ? null : Number(String(borrador).replace(",", "."))) : borrador;
    if (nuevo !== valor) onChange?.(nuevo);
  };

  const filaBase = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, minHeight: alturas.campo, borderBottom: `1px solid ${paleta.border}`, ...estilo };

  if (!editando) {
    return (
      <button
        type="button"
        onClick={() => !soloLectura && setEditando(true)}
        aria-label={`${etiqueta}: ${vacio ? t("componentes.campo.vacio") : valor}`}
        style={{ ...filaBase, width: "100%", background: "none", border: "none", borderBottom: filaBase.borderBottom, padding: 0, textAlign: "left", cursor: soloLectura ? "default" : "pointer", fontFamily: "inherit", WebkitTapHighlightColor: "transparent" }}
      >
        <span style={{ ...texto("cuerpo", { fontWeight: 400 }), color: paleta.muted, flexShrink: 0 }}>{etiqueta}</span>
        <span style={{ ...texto("cuerpo", { fontWeight: vacio ? 400 : 600 }), color: vacio ? paleta.dim : paleta.text, textAlign: "right", minWidth: 0, overflowWrap: "anywhere" }}>
          {vacio ? t("componentes.campo.vacio") : `${valor}${sufijo ? ` ${sufijo}` : ""}`}
        </span>
      </button>
    );
  }

  const comun = {
    ref, value: borrador, placeholder,
    onChange: e => setBorrador(e.target.value),
    onBlur: confirmar,
    onKeyDown: e => { if (e.key === "Enter" && !multilinea) { e.preventDefault(); confirmar(); } if (e.key === "Escape") { setBorrador(valor ?? ""); setEditando(false); } },
    style: { ...texto("cuerpo"), flex: 1, minWidth: 0, textAlign: "right", background: paleta.surface, color: paleta.text, border: `1px solid ${paleta.accent}`, borderRadius: 10, padding: "8px 10px", fontFamily: "inherit", outline: "none" },
  };

  return (
    <div style={filaBase}>
      <span style={{ ...texto("cuerpo", { fontWeight: 400 }), color: paleta.muted, flexShrink: 0 }}>{etiqueta}</span>
      {multilinea
        ? <textarea rows={3} {...comun} style={{ ...comun.style, textAlign: "left", resize: "none" }} />
        : <input type="text" inputMode={tipo === "numero" ? "decimal" : "text"} {...comun} />}
    </div>
  );
}

/** Agrupa campos en una tarjeta con título de sección opcional. */
export function Bloque({ titulo, children, estilo }) {
  const { paleta, radios } = useSistema();
  return (
    <section style={{ background: paleta.card, border: `1px solid ${paleta.border}`, borderRadius: radios.grande, boxShadow: paleta.sombraTarjeta, padding: "4px 14px", ...estilo }}>
      {titulo && <h3 style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: paleta.dim, margin: "10px 0 2px" }}>{titulo}</h3>}
      {children}
    </section>
  );
}
