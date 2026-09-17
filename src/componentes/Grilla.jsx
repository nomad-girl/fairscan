/**
 * La grilla de fotos y el carrusel, literal Instagram (Nati, 17/09: "estudiá ese diseño"):
 * - Grilla: tres columnas al ras de los bordes, 2 px entre fotos, cuadradas, sin bordes redondeados
 *   ni textos encima. Solo dos señales chicas: el ícono de "varias fotos" arriba a la derecha y la
 *   estrella abajo a la izquierda si es favorito.
 * - Carrusel: una foto por pantalla, se desliza, puntos abajo y "1/3" arriba a la derecha.
 * Componentes de módulo: no se desmontan al redibujar (las fotos no titilan).
 */
import React, { useRef, useState } from "react";
import { useSistema } from "../sistema/SistemaProvider.jsx";
import { Icono } from "./Icono.jsx";

export function GrillaDeFotos({ children, columnas = 3, alAncho = true, estilo }) {
  const { espacios } = useSistema();
  return <div style={{ display: "grid", gridTemplateColumns: `repeat(${columnas}, 1fr)`, gap: 2, margin: alAncho ? `0 -${espacios.margenLateral}px` : 0, ...estilo }}>{children}</div>;
}

export function CeldaDeFoto({ onClick, etiqueta, children, favorito = false, fotos = 1, insignia = null, estilo }) {
  const { paleta } = useSistema();
  const sombra = { filter: "drop-shadow(0 1px 2px rgba(0,0,0,.65))", display: "grid", placeItems: "center" };
  return (
    <button type="button" onClick={onClick} aria-label={etiqueta} style={{ position: "relative", aspectRatio: "1", width: "100%", display: "block", border: "none", padding: 0, background: paleta.surface, overflow: "hidden", cursor: "pointer", WebkitTapHighlightColor: "transparent", ...estilo }}>
      {children}
      {fotos > 1 && <span style={{ position: "absolute", top: 6, right: 6, ...sombra }}><Icono nombre="copiar" tamano={16} color="#fff" /></span>}
      {favorito && <span style={{ position: "absolute", bottom: 6, left: 6, ...sombra }}><Icono nombre="favorito" tamano={16} color="#fff" /></span>}
      {insignia && <span style={{ position: "absolute", top: 6, left: 6 }}>{insignia}</span>}
    </button>
  );
}

export function CarruselDeFotos({ fotos = [], respaldos = [], Foto, tLegacy, onTocar, etiqueta, relacion = "1" }) {
  const { paleta } = useSistema();
  const [i, setI] = useState(0);
  const ref = useRef(null);
  const onScroll = e => { const n = Math.round(e.target.scrollLeft / e.target.offsetWidth); if (n !== i) setI(n); };
  const dibujar = (src, k) => Foto
    ? <Foto src={src} respaldo={respaldos[k] || respaldos[0] || (typeof src === "string" && src.startsWith("http") ? src : null)} t={tLegacy} estilo={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
    : <img src={src || respaldos[k]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />;
  return (
    <div style={{ position: "relative", aspectRatio: relacion, width: "100%", background: paleta.surface }}>
      {/* La proporción va en el marco y la fila deslizable lo llena: en Safari, aspect-ratio en los hijos de la fila se aplastaba */}
      <div ref={ref} onScroll={onScroll} style={{ position: "absolute", inset: 0, display: "flex", overflowX: "auto", scrollSnapType: "x mandatory", scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>
        {(fotos.length ? fotos : respaldos.length ? respaldos : [null]).map((f, k) => (
          <button key={k} type="button" onClick={onTocar} aria-label={etiqueta} style={{ width: "100%", height: "100%", flexShrink: 0, scrollSnapAlign: "start", border: "none", padding: 0, background: paleta.surface, cursor: onTocar ? "pointer" : "default", WebkitTapHighlightColor: "transparent" }}>
            {f || respaldos[k] ? dibujar(f || respaldos[k], k) : <span style={{ display: "grid", placeItems: "center", width: "100%", height: "100%" }}><Icono nombre="foto" tamano={28} color={paleta.dim} /></span>}
          </button>
        ))}
      </div>
      {fotos.length > 1 && (
        <>
          <span style={{ position: "absolute", top: 10, right: 10, background: "rgba(10,14,23,0.7)", color: "#fff", borderRadius: 999, padding: "3px 9px", fontSize: 12, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{i + 1}/{fotos.length}</span>
          <div aria-hidden style={{ position: "absolute", bottom: 8, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 4 }}>
            {fotos.map((_, k) => <span key={k} style={{ width: 6, height: 6, borderRadius: 3, background: k === i ? "#fff" : "rgba(255,255,255,0.5)", boxShadow: "0 0 2px rgba(0,0,0,.5)" }} />)}
          </div>
        </>
      )}
    </div>
  );
}
