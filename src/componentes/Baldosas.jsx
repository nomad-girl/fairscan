/**
 * Una sección de baldosas de datos (27/09, Nati: "muchos campos que quedan vacíos generando ruido").
 * Muestra solo las baldosas que tienen dato; las vacías quedan detrás de una baldosa "+ Agregar dato"
 * que las despliega. Así la hoja se lee de un vistazo y lo que falta sigue estando a un toque.
 */
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSistema } from "../sistema/SistemaProvider.jsx";

export function SeccionDeDatos({ titulo, conDato = [], sinDato = [], extra = null }) {
  const { paleta, radios } = useSistema();
  const { t } = useTranslation();
  const [mostrarVacios, setMostrarVacios] = useState(false);
  if (conDato.length === 0 && sinDato.length === 0 && !extra) return null;
  return (
    <section aria-label={titulo} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <h3 style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: paleta.dim }}>{titulo}</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
        {conDato}
        {mostrarVacios ? sinDato : (sinDato.length > 0 && (
          <button type="button" onClick={() => setMostrarVacios(true)} style={{ minHeight: 62, borderRadius: radios.medio, border: `1.5px dashed ${paleta.border}`, background: "transparent", color: paleta.accentTexto, fontFamily: "inherit", fontSize: 14, fontWeight: 600, cursor: "pointer", textAlign: "left", padding: "10px 12px", gridColumn: conDato.length % 2 === 0 ? "1 / -1" : undefined }}>
            {t("componentes.baldosas.agregar", { count: sinDato.length })}
          </button>
        ))}
        {extra}
      </div>
    </section>
  );
}
