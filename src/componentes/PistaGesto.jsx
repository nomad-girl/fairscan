/**
 * Pista de gesto (Nati, 28/10: "la app funciona mucho con gestos, ¿cómo lo explicamos?"): la primera vez que un
 * gesto sirve, tres segundos de una flecha que se mueve y tres palabras. Se va sola, al tocarla o al hacer el
 * gesto, y no vuelve (se recuerda por instalación). Como los reels de Instagram: en contexto, nunca en un tutorial.
 * Todo gesto tiene además un botón que hace lo mismo; la pista solo acelera.
 */
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSistema } from "../sistema/SistemaProvider.jsx";
import { MARCA } from "../sistema/tokens.js";

const PREFIJO = "fs_pista_";
const VECES = 5; // se muestra hasta cinco veces (28/10: una sola pasaba desapercibido)
// Con cada versión nueva de la app las pistas vuelven a contar desde cero (en las pruebas de Nati se agotaban sin que las viera)
try {
  const v = typeof __APP_VERSION__ !== "undefined" ? String(__APP_VERSION__) : "dev";
  if (localStorage.getItem("fs_pistas_version") !== v) { ["arriba", "volver", "fotos", "pestanas"].forEach(k => localStorage.removeItem(PREFIJO + k)); localStorage.setItem("fs_pistas_version", v); }
} catch { /* sin almacenamiento */ }
function vista(clave) { try { return (parseInt(localStorage.getItem(PREFIJO + clave) || "0", 10) || 0) >= VECES; } catch { return true; } }
export function marcarPistaVista(clave) { try { localStorage.setItem(PREFIJO + clave, String((parseInt(localStorage.getItem(PREFIJO + clave) || "0", 10) || 0) + 1)); } catch { /* sin almacenamiento */ } }
export function reiniciarPistas() { try { ["arriba", "volver", "fotos", "pestanas"].forEach(k => localStorage.removeItem(PREFIJO + k)); } catch { /* sin almacenamiento */ } }

/**
 * `clave`: arriba (deslizá arriba · catálogo) · volver (deslizá para volver) · fotos (deslizá · más fotos).
 * `cuando`: solo se muestra si es true (p. ej., recién a la segunda foto). `arriba`/`abajo`: dónde apoyarla.
 */
const ACTIVAS = false; // 28/10 (Nati, tras probarlas: "ahora son insoportables, me las muestra todo el tiempo; por ahora sacá las flechas")
export function PistaGesto({ clave, cuando = true, direccion = "arriba", estilo = {}, duracionMs = 5000 }) {
  const { t } = useTranslation();
  const { reducido } = useSistema();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!ACTIVAS || !cuando || vista(clave)) return;
    setVisible(true); marcarPistaVista(clave);
    const id = setTimeout(() => setVisible(false), duracionMs);
    return () => clearTimeout(id);
  }, [cuando, clave]);
  if (!visible) return null;
  const giro = { arriba: "rotate(-90deg)", derecha: "rotate(0deg)", izquierda: "rotate(180deg)", abajo: "rotate(90deg)" }[direccion] || "none";
  const anim = { arriba: "fairscanPistaY", abajo: "fairscanPistaY", derecha: "fairscanPistaX", izquierda: "fairscanPistaX" }[direccion];
  return (
    <div role="note" onClick={() => setVisible(false)} style={{ position: "absolute", left: 0, right: 0, display: "flex", justifyContent: "center", zIndex: 40, pointerEvents: "none", ...estilo }}>
      <style>{`@keyframes fairscanPistaY { 0%,100% { transform: translateY(6px) } 50% { transform: translateY(-6px) } }
        @keyframes fairscanPistaX { 0%,100% { transform: translateX(-6px) } 50% { transform: translateX(6px) } }
        @keyframes fairscanPistaEntra { from { opacity: 0 } to { opacity: 1 } }`}</style>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 10, minHeight: 44, padding: "0 16px 0 12px", borderRadius: 999, background: "rgba(43,18,6,0.86)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", color: "#FFF3EA", fontSize: 15, fontWeight: 600, pointerEvents: "auto", animation: reducido ? "none" : "fairscanPistaEntra 220ms ease-out both" }}>
        <span aria-hidden style={{ display: "inline-grid", placeItems: "center", width: 24, height: 24, animation: reducido ? "none" : `${anim} 1.1s ease-in-out infinite` }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={MARCA.sello} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: giro }}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </span>
        {t(`gestos.${clave}`)}
      </span>
    </div>
  );
}
