/**
 * Hoja que sube desde abajo. Una sola abierta a la vez; agarradera; se cierra
 * deslizando hacia abajo (por velocidad o por distancia), tocando el velo o con
 * Escape. 500 ms con la curva de iOS; con movimiento reducido, un fundido.
 * Dos alturas: "media" y "completa".
 */
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSistema } from "../sistema/SistemaProvider.jsx";
import { Icono } from "./Icono.jsx";

export function Hoja({ abierta, onCerrar, titulo, altura = "media", children, pie }) {
  const { paleta, radios, movimiento, curvas, capas, duracion, reducido, texto } = useSistema();
  const { t } = useTranslation();
  const [visible, setVisible] = useState(abierta);
  const [entrando, setEntrando] = useState(false);
  const [arrastre, setArrastre] = useState(0);
  const inicio = useRef(null);

  useEffect(() => {
    if (abierta) { setVisible(true); requestAnimationFrame(() => setEntrando(true)); }
    else { setEntrando(false); const id = setTimeout(() => setVisible(false), duracion(movimiento.hoja.duracion)); return () => clearTimeout(id); }
  }, [abierta]);

  useEffect(() => {
    if (!abierta) return;
    const onKey = e => { if (e.key === "Escape") onCerrar?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [abierta, onCerrar]);

  if (!visible) return null;

  const onDown = e => { inicio.current = { y: e.clientY, t: Date.now() }; };
  const onMove = e => { if (inicio.current) setArrastre(Math.max(0, e.clientY - inicio.current.y)); };
  const onUp = e => {
    if (!inicio.current) return;
    const dy = e.clientY - inicio.current.y;
    const dt = Math.max(1, Date.now() - inicio.current.t);
    const velocidad = dy / dt; // px por ms
    inicio.current = null;
    setArrastre(0);
    if (dy > 120 || velocidad > 0.6) onCerrar?.();
  };

  const desplazamiento = entrando ? arrastre : 600;
  const transicion = arrastre ? "none" : `transform ${duracion(movimiento.hoja.duracion)}ms ${curvas.hoja}, opacity ${duracion(movimiento.hoja.duracion)}ms ${curvas.estandar}`;

  return (
    <div role="presentation" style={{ position: "fixed", inset: 0, zIndex: capas.hoja, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={onCerrar} style={{ position: "absolute", inset: 0, background: paleta.velo, opacity: entrando ? 1 : 0, transition: `opacity ${duracion(movimiento.hoja.duracion)}ms ${curvas.estandar}` }} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        style={{
          position: "relative", width: "100%", maxWidth: 560, maxHeight: altura === "completa" ? "94dvh" : "62dvh",
          background: paleta.card, color: paleta.text, borderRadius: `${radios.grande + 6}px ${radios.grande + 6}px 0 0`,
          boxShadow: "0 -12px 40px -20px rgba(15,23,42,.45)", display: "flex", flexDirection: "column",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
          transform: reducido ? "none" : `translateY(${desplazamiento}px)`, opacity: reducido ? (entrando ? 1 : 0) : 1,
          transition: transicion, touchAction: "none",
        }}
      >
        <div onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} style={{ padding: "10px 16px 6px", cursor: "grab", flexShrink: 0, position: "relative" }} aria-label={t("componentes.hoja.agarradera")}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: paleta.border, margin: "0 auto" }} />
          {titulo && <h2 style={{ ...texto("titulo"), margin: "10px 44px 0 0" }}>{titulo}</h2>}
          {/* La X: el gesto de arrastrar cuesta (Nati, 22/09); cerrar tiene que ser un toque */}
          <button type="button" onClick={onCerrar} onPointerDown={e => e.stopPropagation()} aria-label={t("comun.cerrar")} style={{ position: "absolute", top: 12, right: 12, width: 40, height: 40, borderRadius: 20, border: "none", background: paleta.surface, display: "grid", placeItems: "center", cursor: "pointer" }}><Icono nombre="cerrar" tamano={20} color={paleta.muted} /></button>
        </div>
        <div style={{ overflowY: "auto", padding: "8px 16px 16px", overscrollBehavior: "contain", WebkitOverflowScrolling: "touch" }}>{children}</div>
        {pie && <div style={{ padding: "8px 16px 12px", borderTop: `1px solid ${paleta.border}`, flexShrink: 0 }}>{pie}</div>}
      </div>
    </div>
  );
}
