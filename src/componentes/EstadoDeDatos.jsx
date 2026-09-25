/**
 * La línea de estado de los datos (protocolo de datos sagrados, 24/09, medida 1): una frase
 * siempre visible que dice la verdad sobre dónde están los datos. Nunca "vacío" cuando la app
 * todavía no sabe; nunca silencio cuando algo falla.
 *
 *   estado = { clave, count?, hechos?, total?, equipo? }
 *   clave: sinCuenta · sinSenal · conectando · bajando · subiendo · falla · sinEquipo · nube
 */
import React from "react";
import { useTranslation } from "react-i18next";
import { useSistema } from "../sistema/SistemaProvider.jsx";
import { Icono } from "./Icono.jsx";

/** Mientras la app no comprobó la nube, el catálogo no debe decir "no tenés productos". */
export const esperandoNube = (estado) => !!estado && (estado.clave === "conectando" || estado.clave === "bajando");

export function EstadoDeDatos({ estado, onReintentar, onEntrar, compacto = false, soloPunto = false, estilo }) {
  const { t } = useTranslation();
  const { paleta, texto } = useSistema();
  if (!estado) return null;
  const { clave } = estado;
  const color = clave === "falla" ? paleta.red : clave === "nube" ? paleta.green : clave === "sinCuenta" || clave === "sinEquipo" ? paleta.accentTexto : paleta.muted;
  const icono = clave === "falla" ? "error" : clave === "nube" ? "nube" : clave === "sinSenal" ? "sinNube" : clave === "sinCuenta" ? "equipo" : clave === "sinEquipo" ? "equipo" : "reintentar";
  const frase = clave === "sinSenal" && !estado.count ? t("datos.sinSenalSolo") : t(`datos.${clave}`, { count: estado.count ?? 0, hechos: estado.hechos ?? 0, total: estado.total ?? 0, equipo: estado.equipo || "" });
  const accion = clave === "falla" && onReintentar ? { texto: t("datos.reintentar"), onClick: onReintentar }
    : clave === "sinCuenta" && onEntrar ? { texto: t("datos.entrar"), onClick: onEntrar }
    : null;
  // La cabecera de la compu (escritorio en calma, 25/09): un punto de color con la frase al pasar el mouse; clic reintenta si falla.
  if (soloPunto) {
    const girando = clave === "bajando" || clave === "conectando" || clave === "subiendo";
    return (
      <button type="button" role="status" aria-live="polite" aria-label={frase} title={accion ? `${frase} · ${accion.texto}` : frase} onClick={accion?.onClick}
        style={{ display: "inline-grid", placeItems: "center", width: 28, height: 28, borderRadius: 14, border: "none", background: "transparent", cursor: accion ? "pointer" : "default", padding: 0, ...estilo }}>
        <span aria-hidden style={{ display: "inline-flex", animation: girando ? "fairscanGirar 1.4s linear infinite" : "none" }}><Icono nombre={icono} tamano={16} color={color} /></span>
        <style>{`@keyframes fairscanGirar { to { transform: rotate(360deg); } }`}</style>
      </button>
    );
  }
  return (
    <div role="status" aria-live="polite" style={{ display: "flex", alignItems: "center", gap: 6, minHeight: compacto ? 20 : 28, ...estilo }}>
      <span aria-hidden style={{ display: "inline-flex", animation: clave === "bajando" || clave === "conectando" || clave === "subiendo" ? "fairscanGirar 1.4s linear infinite" : "none" }}>
        <Icono nombre={icono} tamano={compacto ? 13 : 15} color={color} />
      </span>
      <span style={{ ...texto("pie"), color, fontVariantNumeric: "tabular-nums", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{frase}</span>
      {accion && (
        <button type="button" onClick={accion.onClick} style={{ ...texto("pie", { fontWeight: 700 }), color: paleta.accentTexto, background: "none", border: "none", padding: "2px 4px", cursor: "pointer", fontFamily: "inherit", textDecoration: "underline" }}>{accion.texto}</button>
      )}
      <style>{`@keyframes fairscanGirar { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
