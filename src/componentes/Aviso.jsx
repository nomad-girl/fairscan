/**
 * Aviso (toast). Abajo, nunca arriba compitiendo con la hora. Entra en 250 ms,
 * vive 4 s, se descarta deslizando o tocando. Tres tonos con significado fijo:
 * neutro (informa), éxito (verde solo en la tilde) y error (rojo). Un aviso de
 * tipo "proceso" pasa de "en curso" a "listo" sin desaparecer entre medio.
 */
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSistema } from "../sistema/SistemaProvider.jsx";
import { Icono } from "./Icono.jsx";
import { vibrarExito, vibrarError } from "../sistema/vibrar.js";

export function Aviso({ mensaje, tono = "neutro", accion, onAccion, onCerrar, permanente = false }) {
  const { paleta, radios, movimiento, curvas, capas, duracion, texto, alturas } = useSistema();
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    if (!mensaje) { setVisible(false); return; }
    requestAnimationFrame(() => setVisible(true));
    if (tono === "exito") vibrarExito();
    if (tono === "error") vibrarError();
    clearTimeout(timer.current);
    if (!permanente && tono !== "proceso") timer.current = setTimeout(() => { setVisible(false); setTimeout(() => onCerrar?.(), duracion(movimiento.aviso.entra)); }, movimiento.aviso.vive);
    return () => clearTimeout(timer.current);
  }, [mensaje, tono, permanente]);

  if (!mensaje) return null;

  const icono = tono === "exito" ? "listo" : tono === "error" ? "error" : tono === "proceso" ? "reintentar" : null;
  const colorIcono = tono === "exito" ? paleta.green : tono === "error" ? paleta.red : paleta.accent;

  return (
    <div role="status" aria-live="polite" style={{ position: "fixed", left: 0, right: 0, bottom: `calc(20px + env(safe-area-inset-bottom, 0px))`, display: "flex", justifyContent: "center", zIndex: capas.aviso, pointerEvents: "none", padding: "0 16px" }}>
      <div
        onClick={() => { setVisible(false); onCerrar?.(); }}
        style={{
          pointerEvents: "auto", display: "flex", alignItems: "center", gap: 10, maxWidth: 520, width: "100%",
          minHeight: alturas.tocable, padding: "10px 14px", borderRadius: radios.grande,
          background: paleta.text, color: paleta.bg, boxShadow: "0 10px 30px -12px rgba(15,23,42,.5)",
          transform: visible ? "translateY(0)" : "translateY(16px)", opacity: visible ? 1 : 0,
          transition: `transform ${duracion(movimiento.aviso.entra)}ms ${curvas.entra}, opacity ${duracion(movimiento.aviso.entra)}ms ${curvas.estandar}`,
          cursor: "pointer",
        }}
      >
        {icono && <Icono nombre={icono} tamano={18} color={colorIcono} />}
        <span style={{ ...texto("cuerpo", { fontWeight: 500 }), flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>{mensaje}</span>
        {accion && (
          <button type="button" onClick={e => { e.stopPropagation(); onAccion?.(); }} style={{ ...texto("cuerpo", { fontWeight: 700 }), background: "transparent", border: "none", color: paleta.accent, padding: "8px 6px", minHeight: alturas.tocable, cursor: "pointer", fontFamily: "inherit" }}>
            {accion}
          </button>
        )}
        <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>{t("componentes.aviso.cerrar")}</span>
      </div>
    </div>
  );
}
