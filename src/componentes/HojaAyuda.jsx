// Ayuda (26/10/2026, buzón: Nati aprobó el plan; preguntas de Clau, verificadas contra la app de hoy).
// Una sola hoja que se abre desde el "?" de la cámara y desde Ajustes: ver la guía de nuevo, seis preguntas
// frecuentes y "Escribinos", que abre un mail a hola@fairscan.app con plataforma, versión e instalación ya cargadas
// (sin datos personales). Con Chatwoot configurado (26/10), "Chatear con soporte" abre el chat y el mail queda segundo.
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Capacitor } from "@capacitor/core";
import { Hoja } from "./Hoja.jsx";
import { Boton } from "./Boton.jsx";
import { Icono } from "./Icono.jsx";
import { useSistema } from "../sistema/SistemaProvider.jsx";
import { instalacion, anotar } from "../lib/primerUso.js";
import { abrirChat } from "../lib/chatSoporte.js";

export const PREGUNTAS_AYUDA = ["feria", "sinInternet", "gratis", "pedido", "cuenta", "china"];
export const MAIL_SOPORTE = "hola@fairscan.app";
const GESTOS = ["arriba", "derecha", "fotos", "obturador", "hojas", "pestanas", "proveedor"];

/** El mail de soporte, armado (exportado para los tests). */
export function mailDeAyuda(t, { plataforma, version, instalacion: inst, mensaje } = {}) {
  const asunto = t("ayuda.mailAsunto");
  const datos = { plataforma: plataforma || "-", version: version || "-", instalacion: inst || "-" };
  // Con mensaje (29/10): lo que escribió la usuaria va primero, tal cual, y abajo la firma técnica
  const cuerpo = mensaje ? `${mensaje.trim()}\n\n—\n${t("ayuda.mailFirma", datos)}` : t("ayuda.mailCuerpo", datos);
  return `mailto:${MAIL_SOPORTE}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
}

/** Cuántas letras tiene que tener el mensaje para poder mandarlo (29/10: llegó un mail de ayuda vacío). */
export const MINIMO_MENSAJE = 3;

export function HojaAyuda({ abierta, onCerrar, onVerGuia, chat = null, cuenta = null, abrirMail = (url) => { window.location.href = url; } }) {
  const { t } = useTranslation();
  const { paleta, texto } = useSistema();
  const [abiertaN, setAbiertaN] = useState(null);
  const contexto = () => {
    let plataforma = "web"; try { plataforma = Capacitor.getPlatform(); } catch { /* web */ }
    return { plataforma, version: typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev", instalacion: instalacion() };
  };
  // "Escribinos" ya no abre el correo en blanco (29/10, buzón: el primer mail de ayuda llegó vacío): primero se
  // escribe acá qué pasó, con un ejemplo, y el botón de enviar se habilita recién con texto.
  const [escribiendo, setEscribiendo] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const puedeEnviar = mensaje.trim().length >= MINIMO_MENSAJE;
  const escribir = () => { anotar("ayuda_escribir_abre"); setEscribiendo(true); };
  const enviar = () => {
    if (!puedeEnviar) return;
    anotar("ayuda_escribir", { largo: mensaje.trim().length });
    abrirMail(mailDeAyuda(t, { ...contexto(), mensaje }));
  };
  // Chat de Chatwoot (26/10): se carga recién acá; si no carga (sin señal, red bloqueada), cae al mail de siempre
  const [abriendo, setAbriendo] = useState(false);
  const chatear = async () => {
    anotar("ayuda_chat");
    setAbriendo(true);
    const c = contexto();
    const ok = await abrirChat(chat, { atributos: c, instalacion: c.instalacion, email: cuenta?.email || null });
    setAbriendo(false);
    if (ok) onCerrar?.(); else { anotar("ayuda_chat_fallo"); escribir(); }
  };
  if (escribiendo) {
    return (
      <Hoja abierta={abierta} onCerrar={onCerrar} titulo={t("ayuda.quePaso")} altura="alta" sobreCamara
        pie={<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Boton variante="principal" ancho="total" icono="correo" deshabilitado={!puedeEnviar} onClick={enviar}>{t("ayuda.mailEnviar")}</Boton>
          <Boton variante="secundario" ancho="total" onClick={() => setEscribiendo(false)}>{t("ayuda.mailVolver")}</Boton>
        </div>}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <textarea autoFocus rows={5} value={mensaje} onChange={e => setMensaje(e.target.value)} placeholder={t("ayuda.mailEjemplo")} aria-label={t("ayuda.quePaso")}
            style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: 16, border: `1px solid ${paleta.border}`, background: paleta.card, color: paleta.text, fontFamily: "inherit", fontSize: 16, lineHeight: 1.4, resize: "none", outline: "none" }} />
          <p style={{ ...texto("pie"), color: paleta.dim, margin: 0 }}>{t("ayuda.mailPista", { mail: MAIL_SOPORTE })}</p>
        </div>
      </Hoja>
    );
  }
  return (
    <Hoja abierta={abierta} onCerrar={onCerrar} titulo={t("ayuda.titulo")} altura="alta" sobreCamara
      pie={chat
        ? <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Boton variante="principal" ancho="total" icono="mensaje" cargando={abriendo} onClick={chatear}>{t("ayuda.chatear")}</Boton>
            <Boton variante="secundario" ancho="total" icono="correo" onClick={escribir}>{t("ayuda.escribinosMail")}</Boton>
          </div>
        : <Boton variante="principal" ancho="total" icono="correo" onClick={escribir}>{t("ayuda.escribinos")}</Boton>}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {onVerGuia && <Boton variante="secundario" ancho="total" icono="camara" onClick={() => { anotar("ayuda_guia"); onVerGuia(); }}>{t("visor.guia.verDeNuevo")}</Boton>}
        {/* Gestos (Nati, 28/10): los siete, para quien quiere saber todo */}
        <div style={{ background: paleta.card, borderRadius: 16, padding: "12px 14px", boxShadow: paleta.sombraTarjeta }}>
          <p style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 700 }}>{t("ayuda.gestosTitulo")}</p>
          <ul style={{ margin: 0, padding: "0 0 0 18px", display: "flex", flexDirection: "column", gap: 4 }}>
            {GESTOS.map(g => <li key={g} style={{ fontSize: 14, lineHeight: 1.4, color: paleta.muted }}>{t(`ayuda.gestos.${g}`)}</li>)}
          </ul>
        </div>
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
        <p style={{ ...texto("pie"), color: paleta.dim, margin: "6px 0 0" }}>{chat ? t("ayuda.chatearPista", { mail: MAIL_SOPORTE }) : t("ayuda.escribinosPista", { mail: MAIL_SOPORTE })}</p>
      </div>
    </Hoja>
  );
}
