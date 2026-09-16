/**
 * Fila de lista (producto, proveedor, ajuste). 72 de alto mínimo, miniatura de 52,
 * texto que corta con puntos suspensivos, y un espacio a la derecha para lo que
 * mande (precio, más y menos, flecha). Toda la fila es tocable.
 */
import React from "react";
import { useSistema } from "../sistema/SistemaProvider.jsx";
import { Icono } from "./Icono.jsx";

export function Fila({ miniatura, titulo, subtitulo, derecha, onClick, seleccionada = false, flecha = false, etiqueta, estilo }) {
  const { paleta, alturas, radios, texto, espacios } = useSistema();
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      aria-label={etiqueta}
      style={{
        display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "left",
        minHeight: alturas.fila, padding: `12px ${espacios.margenLateral}px`,
        background: seleccionada ? paleta.accentSoft : paleta.card,
        border: `1px solid ${seleccionada ? paleta.accent : paleta.border}`,
        borderRadius: radios.grande, boxShadow: paleta.sombraTarjeta,
        cursor: onClick ? "pointer" : "default", fontFamily: "inherit", color: paleta.text,
        WebkitTapHighlightColor: "transparent",
        ...estilo,
      }}
    >
      {miniatura !== undefined && (
        <div style={{ width: alturas.miniatura, height: alturas.miniatura, borderRadius: radios.chico, overflow: "hidden", flexShrink: 0, background: paleta.surface, border: `1px solid ${paleta.border}`, display: "grid", placeItems: "center" }}>
          {miniatura}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ ...texto("cuerpo"), margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.25 }}>{titulo}</p>
        {subtitulo && <p style={{ ...texto("pie"), color: paleta.muted, margin: "2px 0 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{subtitulo}</p>}
      </div>
      {derecha && <div style={{ flexShrink: 0, textAlign: "right" }}>{derecha}</div>}
      {flecha && <Icono nombre="siguiente" tamano={18} color={paleta.dim} />}
    </Tag>
  );
}

/** El precio a la derecha de una fila: verde, destacado. */
export function Precio({ children, detalle }) {
  const { paleta, texto } = useSistema();
  return (
    <div style={{ textAlign: "right" }}>
      <span style={{ ...texto("destacado"), color: paleta.green, display: "block", fontVariantNumeric: "tabular-nums" }}>{children}</span>
      {detalle && <span style={{ ...texto("pie"), color: paleta.muted }}>{detalle}</span>}
    </div>
  );
}
