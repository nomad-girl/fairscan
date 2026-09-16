/**
 * Chip de filtro o de opción. 40 de alto, píldora, ancho según el texto.
 * Activo = naranja suave con borde naranja (acción); inactivo = neutro.
 * `Segmentado` es la fila de chips excluyentes (2 a 5 opciones): interés del
 * proveedor, base del MOQ, pestañas del catálogo.
 */
import React from "react";
import { useSistema } from "../sistema/SistemaProvider.jsx";
import { vibrarSeleccion } from "../sistema/vibrar.js";

export function Chip({ children, activo = false, onClick, etiqueta, estilo }) {
  const { paleta, alturas, radios, texto } = useSistema();
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      aria-label={etiqueta}
      style={{
        ...texto("pie", { fontWeight: 500 }),
        minHeight: alturas.chip, padding: "0 16px", borderRadius: radios.pildora,
        border: `1px solid ${activo ? paleta.accent : paleta.border}`,
        background: activo ? paleta.accentSoft : paleta.surface,
        color: activo ? paleta.accentTexto : paleta.dim,
        whiteSpace: "nowrap", cursor: "pointer", fontFamily: "inherit", WebkitTapHighlightColor: "transparent",
        display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0,
        ...estilo,
      }}
    >
      {children}
    </button>
  );
}

/** Fila de chips que se desliza horizontal si no entran. */
export function FilaDeChips({ children, estilo }) {
  const { espacios } = useSistema();
  return (
    <div style={{ display: "flex", gap: espacios.entreChips, overflowX: "auto", overflowY: "hidden", scrollbarWidth: "none", WebkitOverflowScrolling: "touch", paddingBottom: 2, ...estilo }}>
      {children}
    </div>
  );
}

/**
 * Opciones excluyentes con palabras, no con colores. `opciones` = [{ valor, texto }].
 * Ocupa todo el ancho; cada opción tolera dos líneas.
 */
export function Segmentado({ opciones, valor, onChange, etiqueta, estilo }) {
  const { paleta, alturas, radios, texto } = useSistema();
  return (
    <div role="radiogroup" aria-label={etiqueta} style={{ display: "flex", gap: 6, ...estilo }}>
      {opciones.map(o => {
        const activo = o.valor === valor;
        return (
          <button
            key={o.valor}
            type="button"
            role="radio"
            aria-checked={activo}
            onClick={() => { if (!activo) { vibrarSeleccion(); onChange?.(o.valor); } }}
            style={{
              ...texto("pie", { fontWeight: activo ? 600 : 500 }),
              flex: 1, minHeight: alturas.chip, padding: "6px 10px", borderRadius: radios.pildora,
              border: `1px solid ${activo ? paleta.accent : paleta.border}`,
              background: activo ? paleta.accentSoft : paleta.surface,
              color: activo ? paleta.accentTexto : paleta.dim,
              cursor: "pointer", fontFamily: "inherit", WebkitTapHighlightColor: "transparent",
              lineHeight: 1.2, whiteSpace: "normal", overflowWrap: "anywhere", textAlign: "center",
            }}
          >
            {o.texto}
          </button>
        );
      })}
    </div>
  );
}
