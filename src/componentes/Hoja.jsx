/**
 * Hoja que sube desde abajo. Una sola abierta a la vez; agarradera; se cierra
 * deslizando hacia abajo, tocando el velo, con la X o con Escape. 500 ms con la
 * curva de iOS; con movimiento reducido, un fundido. Dos alturas: "media" y "completa".
 *
 * El gesto (27/09, Nati: "fácil de abrir pero difícil de cerrar, cuesta con una sola mano"):
 * antes solo se podía arrastrar desde la agarradera, un blanco de 4 px. Ahora se arrastra
 * desde cualquier parte de la hoja: si el contenido está arriba de todo y el dedo baja, la hoja
 * baja con el dedo (si el contenido tiene para scrollear, scrollea, como siempre). Se cierra con
 * un tirón corto (80 px), rápido (0,45 px/ms) o de un tercio de la hoja, y sigue el movimiento
 * desde donde estaba en vez de saltar. Si no alcanza, vuelve a su lugar con la misma curva.
 */
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSistema } from "../sistema/SistemaProvider.jsx";
import { Icono } from "./Icono.jsx";

const TIRON_PX = 80;         // distancia mínima para cerrar
const TIRON_VELOCIDAD = 0.45; // px por ms
const TIRON_FRACCION = 0.3;   // o un tercio del alto de la hoja

export function Hoja({ abierta, onCerrar, titulo, altura = "media", children, pie }) {
  const { paleta, radios, movimiento, curvas, capas, duracion, reducido, texto } = useSistema();
  const { t } = useTranslation();
  const [visible, setVisible] = useState(abierta);
  const [entrando, setEntrando] = useState(false);
  const [arrastre, setArrastre] = useState(0);
  const [arrastrando, setArrastrando] = useState(false);
  const arrastreRef = useRef(0);
  const hojaRef = useRef(null);
  const contenidoRef = useRef(null);
  const inicio = useRef(null);
  const onCerrarRef = useRef(onCerrar);
  onCerrarRef.current = onCerrar;

  useEffect(() => {
    if (abierta) { setVisible(true); requestAnimationFrame(() => setEntrando(true)); }
    else { setEntrando(false); const id = setTimeout(() => { setVisible(false); setArrastre(0); arrastreRef.current = 0; }, duracion(movimiento.hoja.duracion)); return () => clearTimeout(id); }
  }, [abierta]);

  useEffect(() => {
    if (!abierta) return;
    const onKey = e => { if (e.key === "Escape") onCerrar?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [abierta, onCerrar]);

  const mover = (dy) => { const v = Math.max(0, dy); arrastreRef.current = v; setArrastre(v); };
  const soltar = (dt) => {
    const dy = arrastreRef.current;
    const alto = hojaRef.current?.clientHeight || 600;
    setArrastrando(false);
    if (dy > TIRON_PX || dy / Math.max(1, dt) > TIRON_VELOCIDAD || dy > alto * TIRON_FRACCION) onCerrarRef.current?.(); // la hoja sigue bajando desde donde estaba
    else { arrastreRef.current = 0; setArrastre(0); } // vuelve a su lugar
  };

  // El dedo, en toda la hoja (escuchas nativas: React registra touchmove como pasivo y no deja frenar el scroll)
  useEffect(() => {
    const el = hojaRef.current;
    if (!el || !visible) return;
    let ini = null;
    const start = (e) => { const t0 = e.touches[0]; ini = { x: t0.clientX, y: t0.clientY, t: Date.now(), arriba: (contenidoRef.current?.scrollTop || 0) <= 0, activo: false }; };
    const move = (e) => {
      if (!ini) return;
      const t0 = e.touches[0]; const dy = t0.clientY - ini.y; const dx = t0.clientX - ini.x;
      if (!ini.activo) {
        if (Math.abs(dy) < 6 && Math.abs(dx) < 6) return;
        if (Math.abs(dx) > Math.abs(dy) || dy < 0 || !ini.arriba) { ini = null; return; } // horizontal, hacia arriba o con scroll pendiente: no es nuestro
        ini.activo = true; setArrastrando(true);
      }
      if (e.cancelable) e.preventDefault();
      mover(dy);
    };
    const end = () => { if (!ini) return; const { activo, t: t0 } = ini; ini = null; if (activo) soltar(Date.now() - t0); };
    el.addEventListener("touchstart", start, { passive: true });
    el.addEventListener("touchmove", move, { passive: false });
    el.addEventListener("touchend", end);
    el.addEventListener("touchcancel", end);
    return () => { el.removeEventListener("touchstart", start); el.removeEventListener("touchmove", move); el.removeEventListener("touchend", end); el.removeEventListener("touchcancel", end); };
  }, [visible]);

  if (!visible) return null;

  // El mouse (computadora): desde la agarradera, como antes
  const onDown = e => { if (e.pointerType === "touch") return; inicio.current = { y: e.clientY, t: Date.now() }; setArrastrando(true); };
  const onMove = e => { if (inicio.current) mover(e.clientY - inicio.current.y); };
  const onUp = e => { if (!inicio.current) return; const dt = Date.now() - inicio.current.t; inicio.current = null; soltar(dt); };

  const desplazamiento = entrando ? arrastre : 600 + arrastre;
  const transicion = arrastrando ? "none" : `transform ${duracion(movimiento.hoja.duracion)}ms ${curvas.hoja}, opacity ${duracion(movimiento.hoja.duracion)}ms ${curvas.estandar}`;

  return (
    <div role="presentation" style={{ position: "fixed", inset: 0, zIndex: capas.hoja, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={onCerrar} style={{ position: "absolute", inset: 0, background: paleta.velo, opacity: entrando ? Math.max(0.25, 1 - arrastre / 600) : 0, transition: arrastrando ? "none" : `opacity ${duracion(movimiento.hoja.duracion)}ms ${curvas.estandar}` }} />
      <div
        ref={hojaRef}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        style={{
          position: "relative", width: "100%", maxWidth: 560, maxHeight: altura === "completa" ? "94dvh" : "62dvh",
          background: paleta.card, color: paleta.text, borderRadius: `${radios.grande + 6}px ${radios.grande + 6}px 0 0`,
          boxShadow: "0 -12px 40px -20px rgba(15,23,42,.45)", display: "flex", flexDirection: "column",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
          transform: reducido ? "none" : `translateY(${desplazamiento}px)`, opacity: reducido ? (entrando ? 1 : 0) : 1,
          transition: transicion, touchAction: "pan-y",
        }}
      >
        <div onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} style={{ padding: "10px 16px 6px", cursor: "grab", flexShrink: 0, position: "relative" }} aria-label={t("componentes.hoja.agarradera")}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: paleta.border, margin: "0 auto" }} />
          {titulo && <h2 style={{ ...texto("titulo"), margin: "10px 44px 0 0" }}>{titulo}</h2>}
          {/* La X: cerrar también tiene que ser un toque (Nati, 22/09) */}
          <button type="button" onClick={onCerrar} onPointerDown={e => e.stopPropagation()} aria-label={t("comun.cerrar")} style={{ position: "absolute", top: 12, right: 12, width: 40, height: 40, borderRadius: 20, border: "none", background: paleta.surface, display: "grid", placeItems: "center", cursor: "pointer" }}><Icono nombre="cerrar" tamano={20} color={paleta.muted} /></button>
        </div>
        <div ref={contenidoRef} style={{ overflowY: "auto", padding: "8px 16px 16px", overscrollBehavior: "contain", WebkitOverflowScrolling: "touch" }}>{children}</div>
        {pie && <div style={{ padding: "8px 16px 12px", borderTop: `1px solid ${paleta.border}`, flexShrink: 0 }}>{pie}</div>}
      </div>
    </div>
  );
}
