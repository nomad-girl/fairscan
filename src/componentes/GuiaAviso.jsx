/**
 * Un aviso de la guía de la primera vez (23/10/2026, opción B): oscurece la pantalla menos el control que señala
 * (con un borde amarillo que late suave) y muestra una tarjeta crema arriba de él, con una flechita.
 * No bloquea nada: el velo deja pasar los toques, así se puede sacar la foto sin cerrar el aviso.
 * `objetivo` es la referencia al control real; se mide en cada cambio de tamaño.
 */
import React, { useEffect, useLayoutEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSistema } from "../sistema/SistemaProvider.jsx";
import { MARCA, FUENTES } from "../sistema/tokens.js";

export function GuiaAviso({ abierto, objetivo, forma = "circulo", titulo, texto, paso, total = 4, accion = null, onSaltar = null }) {
  const { t } = useTranslation();
  const { reducido } = useSistema();
  const [caja, setCaja] = useState(null);

  useLayoutEffect(() => {
    if (!abierto) return;
    const medir = () => { const r = objetivo?.current?.getBoundingClientRect?.(); if (r && r.width) setCaja({ x: r.left, y: r.top, w: r.width, h: r.height }); };
    medir();
    const id = requestAnimationFrame(medir);
    window.addEventListener("resize", medir);
    return () => { cancelAnimationFrame(id); window.removeEventListener("resize", medir); };
  }, [abierto, objetivo]);
  useEffect(() => { if (!abierto) setCaja(null); }, [abierto]);
  if (!abierto || !caja) return null;

  const margen = 6; // ajustado al control (Nati, 23/10: el aro grande "se ve medio mal")
  const hueco = { left: caja.x - margen, top: caja.y - margen, width: caja.w + margen * 2, height: caja.h + margen * 2 };
  const alto = typeof window !== "undefined" ? window.innerHeight : 800;
  const ancho = typeof window !== "undefined" ? window.innerWidth : 390;
  const abajoTarjeta = alto - hueco.top + 14;
  const centroX = caja.x + caja.w / 2;
  const flechaX = Math.min(Math.max(centroX, 30), ancho - 30);
  const radio = forma === "circulo" ? "50%" : 18;

  return (
    <div role="dialog" aria-live="polite" aria-label={titulo} style={{ position: "absolute", inset: 0, zIndex: 6, pointerEvents: "none" }}>
      <style>{`@keyframes fairscanGuiaAro { 50% { opacity: 0.35 } }`}</style>
      {/* El velo es un hueco con sombra enorme; el aro amarillo va aparte, fino y limpio, y solo él late (sin halo) */}
      <div aria-hidden style={{ position: "absolute", ...hueco, borderRadius: radio, boxShadow: "0 0 0 2000px rgba(20,8,3,0.74)" }} />
      <div aria-hidden style={{ position: "absolute", ...hueco, borderRadius: radio, border: `2.5px solid ${MARCA.sello}`, boxSizing: "border-box", animation: reducido ? "none" : "fairscanGuiaAro 1.6s ease-in-out infinite" }} />
      <div style={{ position: "absolute", left: "max(14px, env(safe-area-inset-left, 0px))", right: "max(14px, env(safe-area-inset-right, 0px))", bottom: abajoTarjeta, maxWidth: 420, margin: "0 auto", background: MARCA.crema, color: MARCA.cacao, borderRadius: 18, padding: "16px 16px 14px", display: "flex", flexDirection: "column", gap: 8, boxShadow: "0 18px 40px -16px rgba(0,0,0,0.6)", pointerEvents: "auto" }}>
        <b style={{ fontFamily: FUENTES.marca, fontWeight: 800, fontSize: 21, letterSpacing: "-0.02em", lineHeight: 1.15 }}>{titulo}</b>
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.45, color: "#5A3522" }}>{texto}</p>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 2, gap: 12 }}>
          <div aria-label={t("visor.guia.pasoDe", { n: paso, total })} style={{ display: "flex", gap: 5 }}>
            {Array.from({ length: total }).map((_, i) => <i key={i} style={{ display: "block", height: 7, width: i + 1 === paso ? 20 : 7, borderRadius: 4, background: i + 1 === paso ? MARCA.cacao : "#EAD9CC" }} />)}
          </div>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            {onSaltar && <button type="button" onClick={onSaltar} style={{ minHeight: 40, border: "none", background: "transparent", color: "#8A4B2A", fontFamily: "inherit", fontSize: 14, textDecoration: "underline", textUnderlineOffset: 3, cursor: "pointer", padding: 0 }}>{t("visor.guia.saltar")}</button>}
            {accion && <button type="button" onClick={accion.onClick} style={{ minHeight: 40, border: "none", borderRadius: 999, background: MARCA.cacao, color: MARCA.crema, fontFamily: "inherit", fontSize: 14, fontWeight: 700, padding: "0 18px", cursor: "pointer" }}>{accion.texto}</button>}
          </div>
        </div>
      </div>
      <div aria-hidden style={{ position: "absolute", left: flechaX - 9, bottom: abajoTarjeta - 9, width: 0, height: 0, borderLeft: "9px solid transparent", borderRight: "9px solid transparent", borderTop: `10px solid ${MARCA.crema}` }} />
    </div>
  );
}
