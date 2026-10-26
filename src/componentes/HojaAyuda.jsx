// Ayuda (26/10/2026, buzón: Nati aprobó el plan; preguntas de Clau, verificadas contra la app de hoy).
// Una sola hoja que se abre desde el "?" de la cámara y desde Ajustes: ver la guía de nuevo, seis preguntas
// frecuentes y "Escribinos", que abre un mail a hola@fairscan.app con plataforma, versión e instalación ya cargadas
// (sin datos personales). Cuando Nati tenga el WhatsApp de soporte, se suma como segundo botón.
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Capacitor } from "@capacitor/core";
import { Hoja } from "./Hoja.jsx";
import { Boton } from "./Boton.jsx";
import { Icono } from "./Icono.jsx";
import { useSistema } from "../sistema/SistemaProvider.jsx";
import { instalacion, anotar } from "../lib/primerUso.js";

export const PREGUNTAS_AYUDA = ["feria", "sinInternet", "gratis", "pedido", "cuenta", "china"];
export const MAIL_SOPORTE = "hola@fairscan.app";

/** El WhatsApp de soporte con el mensaje empezado (exportado para los tests). */
export function whatsappDeAyuda(t, numero, { plataforma, version, instalacion: inst } = {}) {
  const texto = t("ayuda.whatsappTexto", { plataforma: plataforma || "-", version: version || "-", instalacion: inst || "-" });
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}

/** El mail de soporte, armado (exportado para los tests). */
export function mailDeAyuda(t, { plataforma, version, instalacion: inst } = {}) {
  const asunto = t("ayuda.mailAsunto");
  const cuerpo = t("ayuda.mailCuerpo", { plataforma: plataforma || "-", version: version || "-", instalacion: inst || "-" });
  return `mailto:${MAIL_SOPORTE}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
}

export function HojaAyuda({ abierta, onCerrar, onVerGuia, whatsapp = "" }) {
  const { t } = useTranslation();
  const { paleta, texto } = useSistema();
  const [abiertaN, setAbiertaN] = useState(null);
  const contexto = () => {
    let plataforma = "web"; try { plataforma = Capacitor.getPlatform(); } catch { /* web */ }
    return { plataforma, version: typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev", instalacion: instalacion() };
  };
  const escribir = () => { anotar("ayuda_escribir"); window.location.href = mailDeAyuda(t, contexto()); };
  // WhatsApp (26/10): en la app instalada el enlace sale del webview y lo abre WhatsApp; en la web, en otra pestaña
  const chatear = () => {
    anotar("ayuda_whatsapp");
    const url = whatsappDeAyuda(t, whatsapp, contexto());
    let nativa = false; try { nativa = Capacitor.isNativePlatform(); } catch { /* web */ }
    if (nativa) window.location.href = url; else window.open(url, "_blank", "noopener");
  };
  return (
    <Hoja abierta={abierta} onCerrar={onCerrar} titulo={t("ayuda.titulo")} altura="alta"
      pie={whatsapp
        ? <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Boton variante="principal" ancho="total" icono="mensaje" onClick={chatear}>{t("ayuda.chatear")}</Boton>
            <Boton variante="secundario" ancho="total" icono="correo" onClick={escribir}>{t("ayuda.escribinosMail")}</Boton>
          </div>
        : <Boton variante="principal" ancho="total" icono="correo" onClick={escribir}>{t("ayuda.escribinos")}</Boton>}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {onVerGuia && <Boton variante="secundario" ancho="total" icono="camara" onClick={() => { anotar("ayuda_guia"); onVerGuia(); }}>{t("visor.guia.verDeNuevo")}</Boton>}
        <div role="list" style={{ display: "flex", flexDirection: "column", marginTop: 6 }}>
          {PREGUNTAS_AYUDA.map((clave, i) => {
            const abierto = abiertaN === i;
            return (
              <div role="listitem" key={clave} style={{ borderBottom: `1px solid ${paleta.border}` }}>
                <button type="button" aria-expanded={abierto} onClick={() => setAbiertaN(abierto ? null : i)}
                  style={{ width: "100%", minHeight: 52, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 2px", border: "none", background: "transparent", color: paleta.text, fontFamily: "inherit", fontSize: 15, fontWeight: 600, textAlign: "left", cursor: "pointer" }}>
                  <span>{t(`ayuda.preguntas.${clave}.p`)}</span>
                  <span aria-hidden style={{ transform: abierto ? "rotate(90deg)" : "none", transition: "transform .2s", display: "grid", placeItems: "center" }}><Icono nombre="siguiente" tamano={16} color={paleta.dim} /></span>
                </button>
                {abierto && <p style={{ ...texto("cuerpo"), color: paleta.muted, margin: "0 2px 14px", lineHeight: 1.5 }}>{t(`ayuda.preguntas.${clave}.r`)}</p>}
              </div>
            );
          })}
        </div>
        <p style={{ ...texto("pie"), color: paleta.dim, margin: "6px 0 0" }}>{whatsapp ? t("ayuda.chatearPista", { mail: MAIL_SOPORTE }) : t("ayuda.escribinosPista", { mail: MAIL_SOPORTE })}</p>
      </div>
    </Hoja>
  );
}
