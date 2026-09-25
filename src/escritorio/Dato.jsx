/**
 * Un dato de la vista rápida (25/09, Nati: "la ficha sigue mareando, es un problema de UI"): la
 * etiqueta chica arriba y el valor grande abajo, en una baldosa. Reemplaza las filas
 * "etiqueta · Agregar ›" que se repetían cuatro veces seguidas: lo vacío es un guion, lo cargado
 * se lee de un vistazo, y se edita tocando la baldosa. Guarda al salir o con Enter; Escape cancela.
 * El nombre accesible sigue siendo "Etiqueta: valor" (o "Etiqueta: Agregar ›" si está vacío).
 */
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSistema } from "../sistema/SistemaProvider.jsx";

export function Dato({ etiqueta, valor, onChange, tipo = "texto", sufijo, multilinea = false, ancho = 1, destacado = false, color, hijos = null, estilo }) {
  const { paleta, radios } = useSistema();
  const { t } = useTranslation();
  const [editando, setEditando] = useState(false);
  const [borrador, setBorrador] = useState(valor ?? "");
  const [sobre, setSobre] = useState(false);
  const ref = useRef(null);
  useEffect(() => { if (!editando) setBorrador(valor ?? ""); }, [valor, editando]);
  useEffect(() => { if (editando) { ref.current?.focus(); if (!multilinea) ref.current?.select?.(); } }, [editando, multilinea]);

  const vacio = valor === null || valor === undefined || String(valor).trim() === "";
  const confirmar = () => {
    setEditando(false);
    let nuevo = borrador;
    if (tipo === "numero") { const n = Number(String(borrador).replace(",", ".")); nuevo = borrador === "" || isNaN(n) ? null : n; }
    if (nuevo !== valor) onChange?.(nuevo);
  };

  const caja = {
    gridColumn: ancho === 2 ? "1 / -1" : undefined, display: "flex", flexDirection: "column", alignItems: "stretch", gap: 3,
    minHeight: 62, padding: "10px 12px", borderRadius: radios.medio, background: paleta.bg, border: `1px solid ${editando ? paleta.accent : sobre ? paleta.border : "transparent"}`,
    textAlign: "left", boxSizing: "border-box", transition: "border-color 150ms ease", ...estilo,
  };
  const etiquetaEstilo = { fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: paleta.dim, lineHeight: 1.3 };
  const valorEstilo = { fontSize: destacado ? 22 : 16, fontWeight: destacado ? 700 : 600, lineHeight: 1.3, color: vacio ? paleta.dim : (color || paleta.text), fontVariantNumeric: "tabular-nums", overflowWrap: "anywhere", whiteSpace: multilinea ? "pre-wrap" : undefined };

  if (hijos) {
    return <div style={caja}><span style={etiquetaEstilo}>{etiqueta}</span>{hijos}</div>;
  }
  if (!editando) {
    return (
      <button type="button" onClick={() => setEditando(true)} onMouseEnter={() => setSobre(true)} onMouseLeave={() => setSobre(false)}
        aria-label={`${etiqueta}: ${vacio ? t("componentes.campo.vacio") : valor}`} title={t("comun.editar")}
        style={{ ...caja, cursor: "text", fontFamily: "inherit", color: paleta.text }}>
        <span style={etiquetaEstilo}>{etiqueta}</span>
        <span style={valorEstilo}>{vacio ? "—" : `${valor}${sufijo ? ` ${sufijo}` : ""}`}</span>
      </button>
    );
  }
  const comun = {
    ref, value: borrador, onChange: e => setBorrador(e.target.value), onBlur: confirmar,
    onKeyDown: e => { if (e.key === "Enter" && !multilinea) { e.preventDefault(); confirmar(); } if (e.key === "Escape") { e.stopPropagation(); setBorrador(valor ?? ""); setEditando(false); } },
    style: { ...valorEstilo, color: paleta.text, width: "100%", minWidth: 0, background: "transparent", border: "none", padding: 0, margin: 0, fontFamily: "inherit", outline: "none", resize: "none" },
  };
  return (
    <div style={caja}>
      <span style={etiquetaEstilo}>{etiqueta}</span>
      {multilinea ? <textarea rows={3} {...comun} /> : <input type="text" inputMode={tipo === "numero" ? "decimal" : "text"} {...comun} />}
    </div>
  );
}
