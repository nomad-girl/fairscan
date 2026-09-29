/**
 * El nombre de la marca (`Identidad/guia-identidad.md`, 28/09/2026): "FairScan" en Bricolage Grotesque 800,
 * espaciado −0,035 em, "Scan" con la franja amarilla debajo (alto 14 % del tamaño, apoyada en la base).
 * Con `conIcono`, el ícono a la izquierda (alto ≈ 1,35 × el tamaño de letra, separación ≈ 0,3 × ese alto).
 * Se usa donde "FairScan" aparece como marca: entrar, bienvenida, encabezado del escritorio.
 */
import React from "react";
import { FUENTES, MARCA } from "../sistema/tokens.js";

export function Marca({ tamano = 28, color = "currentColor", conIcono = false, estilo }) {
  const franja = Math.max(2, Math.round(tamano * 0.14));
  const alto = Math.round(tamano * 1.35);
  return (
    <span aria-label="FairScan" role="img" style={{ display: "inline-flex", alignItems: "center", gap: Math.round(alto * 0.3), color, ...estilo }}>
      {conIcono && <img src="/favicon.svg" alt="" width={alto} height={alto} style={{ display: "block", borderRadius: Math.round(alto * 0.22) }} />}
      <span aria-hidden style={{ fontFamily: FUENTES.marca, fontWeight: 800, fontSize: tamano, letterSpacing: "-0.035em", lineHeight: 1, whiteSpace: "nowrap" }}>
        Fair<span style={{ position: "relative", display: "inline-block" }}>
          <span aria-hidden style={{ position: "absolute", left: 0, right: 0, bottom: Math.round(tamano * 0.04), height: franja, background: MARCA.sello, borderRadius: franja / 2, zIndex: 0 }} />
          <span style={{ position: "relative", zIndex: 1 }}>Scan</span>
        </span>
      </span>
    </span>
  );
}
