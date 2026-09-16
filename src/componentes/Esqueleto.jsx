/**
 * Esqueleto: el hueco gris donde va a aparecer un texto que la IA todavía no
 * devolvió. Se usa en listas y fichas en lugar de un spinner (NN/g, LogRocket):
 * la foto real ya se ve, y el nombre "llega". Con movimiento reducido, no late.
 */
import React from "react";
import { useTranslation } from "react-i18next";
import { useSistema } from "../sistema/SistemaProvider.jsx";

export function Esqueleto({ ancho = 120, alto = 12, radio = 6, estilo }) {
  const { paleta, reducido } = useSistema();
  const { t } = useTranslation();
  return (
    <span
      role="img"
      aria-label={t("componentes.esqueleto.cargando")}
      style={{
        display: "inline-block", width: ancho, maxWidth: "100%", height: alto, borderRadius: radio,
        background: paleta.border, verticalAlign: "middle",
        animation: reducido ? "none" : "fsLatido 1.4s ease-in-out infinite",
        ...estilo,
      }}
    />
  );
}

/** Los estilos globales que necesita (se inyectan una vez). */
export const CSS_ESQUELETO = `@keyframes fsLatido { 0%, 100% { opacity: 1; } 50% { opacity: 0.55; } }`;
