/**
 * Ayudas del escritorio (la versión de computadora, decisión de Nati del 23/09).
 * El escritorio aparece cuando la ventana tiene 900 px o más y nunca en la app
 * instalada: en el teléfono no cambia nada.
 */
import React, { useEffect, useState } from "react";
import { elegirMiniatura, respaldoDe } from "../lib/miniaturas.js";
import { Icono } from "../componentes/index.js";

export const ANCHO_ESCRITORIO = 900;

export function esNativa() {
  return typeof window !== "undefined" && (/^(capacitor|ionic):$/.test(window.location.protocol) || !!window.Capacitor?.isNativePlatform?.());
}

/** true cuando la ventana es de computadora (y no es la app instalada). Se vuelve a medir al cambiar el tamaño. */
export function useEsEscritorio(minimo = ANCHO_ESCRITORIO) {
  const medir = () => typeof window !== "undefined" && window.innerWidth >= minimo && !esNativa();
  const [ok, setOk] = useState(medir);
  useEffect(() => {
    const f = () => setOk(medir());
    window.addEventListener("resize", f);
    return () => window.removeEventListener("resize", f);
  }, [minimo]);
  return ok;
}

/** La miniatura de un producto: la copia local o la dirección de la nube; sin foto, el ícono. */
export function Miniatura({ p, i = 0, Foto, tLegacy, paleta, estilo }) {
  const src = i === 0 ? (elegirMiniatura(p) || respaldoDe(p)) : (p.photos?.[i] || respaldoDe(p, i));
  if (!src) return <div style={{ width: "100%", height: "100%", background: paleta.surface, display: "grid", placeItems: "center", ...estilo }}><Icono nombre="foto" tamano={20} color={paleta.dim} /></div>;
  return Foto
    ? <Foto src={src} respaldo={respaldoDe(p, i)} t={tLegacy} estilo={{ width: "100%", height: "100%", objectFit: "cover", display: "block", ...estilo }} />
    : <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", ...estilo }} />;
}
