/**
 * Botón. Cuatro variantes y nada más: principal (naranja, una por pantalla),
 * secundario (tarjeta con borde), peligro (rojo, solo irreversible) y fantasma (texto).
 * Mide 56 el principal y 44 los demás; el ancho lo define el texto (o `ancho="total"`).
 * Tolera textos largos: baja a dos líneas sin romper la altura mínima.
 */
import React, { useState } from "react";
import { useSistema } from "../sistema/SistemaProvider.jsx";
import { Icono } from "./Icono.jsx";

export function Boton({ children, variante = "secundario", icono, ancho = "auto", deshabilitado = false, cargando = false, onClick, tipo = "button", etiqueta, estilo }) {
  const { paleta, alturas, radios, movimiento, curvas, texto, duracion } = useSistema();
  const [presionado, setPresionado] = useState(false);

  const base = {
    principal: { background: `linear-gradient(135deg, ${paleta.botonPrincipal.desde}, ${paleta.botonPrincipal.hasta})`, color: paleta.botonPrincipal.texto, border: "none", minHeight: alturas.botonPrincipal, boxShadow: paleta.sombraTarjeta },
    secundario: { background: paleta.card, color: paleta.text, border: `1px solid ${paleta.border}`, minHeight: alturas.botonSecundario, boxShadow: paleta.sombraTarjeta },
    peligro: { background: "transparent", color: paleta.red, border: `1px solid ${paleta.red}`, minHeight: alturas.botonSecundario },
    fantasma: { background: "transparent", color: paleta.muted, border: "none", minHeight: alturas.botonSecundario },
  }[variante] || {};

  const t = texto("cuerpo", { fontWeight: variante === "principal" ? 700 : 600 });

  return (
    <button
      type={tipo}
      onClick={onClick}
      disabled={deshabilitado || cargando}
      aria-label={etiqueta}
      aria-busy={cargando || undefined}
      onPointerDown={() => setPresionado(true)}
      onPointerUp={() => setPresionado(false)}
      onPointerLeave={() => setPresionado(false)}
      onPointerCancel={() => setPresionado(false)}
      style={{
        ...t, ...base,
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
        width: ancho === "total" ? "100%" : "auto", minWidth: alturas.tocable,
        padding: "0 16px", borderRadius: radios.grande, cursor: deshabilitado ? "default" : "pointer",
        opacity: deshabilitado ? 0.5 : 1, textAlign: "center", lineHeight: 1.25, whiteSpace: "normal", overflowWrap: "anywhere",
        transform: presionado && !deshabilitado ? `scale(${movimiento.toque.escala})` : "scale(1)",
        transition: `transform ${duracion(presionado ? movimiento.toque.bajada : movimiento.toque.vuelta)}ms ${curvas.estandar}`,
        WebkitTapHighlightColor: "transparent", userSelect: "none", fontFamily: "inherit",
        ...estilo,
      }}
    >
      {icono && <Icono nombre={icono} tamano={18} color={base.color} />}
      <span>{cargando ? "…" : children}</span>
    </button>
  );
}
