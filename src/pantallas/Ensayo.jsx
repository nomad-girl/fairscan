/**
 * Ensayo de feria: el primer uso (opción A elegida por Nati el 27/10/2026; wireframes aprobados
 * https://claude.ai/artifact/8uLJYQFmbQkvBVWNeFyjeF, pantallas 1 a 6). Ver lib/ensayo.js.
 *
 *   bienvenida → producto → precio (el teclado propio) → tarjeta → resultado (la ficha del proveedor real) → permiso
 *
 * 28/10 (Nati): un solo producto ("el segundo ya confunde") y el paso del precio con el mismo teclado de la cámara,
 * con las teclas 3 · . · 8 · Listo iluminándose en orden: así lo aprenden antes de encontrárselo en serio.
 *
 * Todo pasa sin cámara, sin IA y sin gastar escaneos: las "fotos" son las del stand de ejemplo de Nancy Ceramic
 * (public/ejemplo). Cada pantalla tiene una sola cosa para tocar, y late. "Saltar" lleva directo al permiso.
 * Al tocar "Activar la cámara", App abre la cámara de verdad y el teléfono pide el permiso.
 */
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Capacitor } from "@capacitor/core";
import { useSistema } from "../sistema/SistemaProvider.jsx";
import { Boton, Icono, Marca, TecladoDatos } from "../componentes/index.js";
import { MARCA, FUENTES } from "../sistema/tokens.js";
import { vibrarObturador, vibrarExito } from "../sistema/vibrar.js";
import { anotar } from "../lib/primerUso.js";
import { TARJETA_EJEMPLO, PRODUCTOS_ENSAYO } from "../lib/ensayo.js";
import { FichaProveedor } from "./FichaProveedor.jsx";

const PASOS = ["bienvenida", "p1", "precio", "tarjeta", "resultado", "permiso"];
const TECLAS_GUIA = ["3", ".", "8", "ok"];
const ID_EJEMPLO = "ensayo-nancy";

/** El proveedor y los productos del ensayo, con la forma que espera la ficha. No se guardan en ningún lado. */
export function standDelEnsayo(precio = null) {
  const supplier = { id: ID_EJEMPLO, company: TARJETA_EJEMPLO.company, contact: TARJETA_EJEMPLO.contact, phone: TARJETA_EJEMPLO.phone, wechat: TARJETA_EJEMPLO.wechat, cardPhoto: TARJETA_EJEMPLO.foto, cardData: { ejemplo: true } };
  const products = PRODUCTOS_ENSAYO.map((p, i) => ({ id: `ensayo-${i}`, photos: [p.foto], price: (i === 0 && precio) || p.precio, supplierId: ID_EJEMPLO, createdAt: i }));
  return { supplier, products };
}

/** El obturador del ensayo: el mismo del visor (72 px, borde blanco), latiendo para que se sepa qué tocar. */
function Obturador({ amarillo = false, quieto = false, onClick, etiqueta }) {
  const { alturas, reducido } = useSistema();
  const [presionado, setPresionado] = useState(false);
  const halo = amarillo ? "255,197,61" : "255,79,42";
  return (
    <button type="button" onClick={onClick} aria-label={etiqueta} onPointerDown={() => setPresionado(true)} onPointerUp={() => setPresionado(false)} onPointerLeave={() => setPresionado(false)}
      style={{ width: alturas.obturador, height: alturas.obturador, borderRadius: "50%", border: "5px solid #fff", background: amarillo ? MARCA.sello : MARCA.naranja, cursor: "pointer", padding: 0,
        boxShadow: quieto ? "0 0 0 3px rgba(43,18,6,0.35)" : `0 0 0 10px rgba(${halo},0.28), 0 0 0 22px rgba(${halo},0.12)`, animation: reducido || quieto ? "none" : "ensayoLate 1.6s ease-in-out infinite",
        transform: presionado && !reducido ? "scale(0.92)" : undefined }} />
  );
}

/** El globo blanco con la indicación, apoyado arriba del obturador. */
function Globo({ titulo, texto, children }) {
  return (
    <div role="status" style={{ position: "absolute", left: 14, right: 14, bottom: "calc(env(safe-area-inset-bottom, 0px) + 170px)", zIndex: 4, background: "#fff", color: MARCA.cacao, borderRadius: 18, padding: "14px 16px", boxShadow: "0 8px 24px -10px rgba(0,0,0,0.5)" }}>
      <p style={{ margin: 0, fontSize: 20, fontWeight: 700, lineHeight: 1.25 }}>{titulo}</p>
      {texto && <p style={{ margin: "4px 0 0", fontSize: 15, lineHeight: 1.45, color: "#5A3522" }}>{texto}</p>}
      {children}
      <span aria-hidden style={{ position: "absolute", left: "50%", bottom: -8, width: 16, height: 16, background: "#fff", transform: "translateX(-50%) rotate(45deg)", borderRadius: 3 }} />
    </div>
  );
}

export function Ensayo({ inicio = "bienvenida", onYaTengoCuenta, onActivarCamara, moneda = "USD", Foto, tLegacy }) {
  const { t } = useTranslation();
  const { paleta, reducido } = useSistema();
  const [paso, setPaso] = useState(PASOS.includes(inicio) ? inicio : "bienvenida");
  const [disparando, setDisparando] = useState(false); // el destello y el visor que se endereza
  const [leyendo, setLeyendo] = useState(false);       // la línea de luz que recorre la tarjeta
  const [precio, setPrecio] = useState("");             // lo que escribe en el paso del precio (cualquier número vale)
  const [precioListo, setPrecioListo] = useState(false);
  const indiceGuia = Math.min(TECLAS_GUIA.length - 1, precio === "3.8" ? 3 : precio === "3." ? 2 : precio === "3" ? 1 : 0);
  const tocarTecla = (tecla) => setPrecio(v => {
    if (tecla === "⌫") return v.slice(0, -1);
    if (tecla === ".") return v.includes(".") ? v : (v || "0") + ".";
    return v.replace(".", "").length < 7 ? v + tecla : v;
  });
  const listoPrecio = () => {
    if (precioListo) return;
    vibrarExito(); setPrecioListo(true);
    anotar("ensayo_paso", { paso: "precio", conPrecio: !!precio }, { unaVez: false });
    despues(700, () => { setPrecioListo(false); setPaso("tarjeta"); });
  };
  const temporizadores = useRef([]);
  const despues = (ms, fn) => { temporizadores.current.push(setTimeout(fn, ms)); };
  useEffect(() => () => temporizadores.current.forEach(clearTimeout), []);

  useEffect(() => {
    if (paso === "bienvenida") anotar("bienvenida_vista", {}, { unaVez: true });
    if (paso === "resultado") anotar("ensayo_fin", {}, { unaVez: true });
    if (paso === "permiso") anotar("pre_permiso_visto", {}, { unaVez: true });
  }, [paso]);

  const saltar = () => { anotar("ensayo_saltado", { paso }, { unaVez: true }); setPaso("permiso"); };
  const disparar = (siguiente, { tarjeta = false } = {}) => {
    if (disparando) return;
    vibrarObturador();
    setDisparando(true);
    anotar("ensayo_paso", { paso }, { unaVez: false });
    if (tarjeta) { setLeyendo(true); despues(1100, () => { setLeyendo(false); setDisparando(false); setPaso(siguiente); }); return; }
    despues(420, () => { setDisparando(false); setPaso(siguiente); });
  };

  const css = `
    @keyframes ensayoLate { 0%,100% { transform: scale(1) } 50% { transform: scale(1.06) } }
    @keyframes ensayoEntra { from { transform: rotate(-4deg) scale(1.06) } to { transform: none } }
    @keyframes ensayoLee { from { top: 30% } to { top: 62% } }
    @keyframes ensayoEscribe { from { clip-path: inset(0 100% 0 0) } to { clip-path: inset(0 0 0 0) } }
    @media (prefers-reduced-motion: reduce) { [data-ensayo] * { animation: none !important } }`;

  // ── 1 · Bienvenida ─────────────────────────────────────────────
  if (paso === "bienvenida") return (
    <div data-ensayo className="pantalla-fija" style={{ position: "fixed", inset: 0, zIndex: 100, background: MARCA.crema, color: MARCA.cacao, display: "flex", flexDirection: "column", padding: "calc(env(safe-area-inset-top, 0px) + 28px) 22px calc(env(safe-area-inset-bottom, 0px) + 22px)", fontFamily: "inherit", overflowY: "auto" }}>
      <style>{css}</style>
      <Marca tamano={26} color={MARCA.cacao} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 16, minHeight: 0, padding: "18px 0" }}>
        {/* El gesto de la marca: la foto entra girada, con el encuadre amarillo */}
        <div aria-hidden style={{ alignSelf: "center", width: "min(54vw, 220px)", aspectRatio: "3 / 4", borderRadius: 18, overflow: "hidden", border: "6px solid #fff", transform: "rotate(-7deg)", boxShadow: "0 18px 40px -16px rgba(43,18,6,0.55)", position: "relative", flexShrink: 1, minHeight: 120 }}>
          <img src={PRODUCTOS_ENSAYO[0].foto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          <span style={{ position: "absolute", inset: 12, border: `3px dashed ${MARCA.sello}`, borderRadius: 10 }} />
        </div>
        <h1 style={{ fontFamily: FUENTES.marca, fontWeight: 800, fontSize: 34, lineHeight: 1.02, letterSpacing: "-0.035em", margin: "10px 0 0", textWrap: "balance" }}>{t("ensayo.bienvenidaTitulo")}</h1>
        <p style={{ margin: 0, fontSize: 16, lineHeight: 1.45, color: "#5A3522" }}>{t("ensayo.bienvenidaTexto")}</p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <Boton variante="principal" ancho="total" onClick={() => { anotar("ensayo_inicio", {}, { unaVez: true }); setPaso("p1"); }}>{t("ensayo.probar")}</Boton>
        <p style={{ margin: "2px 0 4px", fontSize: 13, color: "#8A4B2A", textAlign: "center" }}>{t("ensayo.dura")}</p>
        {onYaTengoCuenta && <button type="button" onClick={() => { anotar("cuenta_abierta", { modo: "login", desde: "bienvenida" }); onYaTengoCuenta(); }} style={{ minHeight: 44, border: "none", background: "none", color: "#5A3522", fontFamily: "inherit", fontSize: 15, fontWeight: 500, cursor: "pointer" }}>{t("entrar.yaTengoCuenta")}</button>}
      </div>
    </div>
  );

  // ── 5 · Así queda: la ficha del proveedor de verdad, con el stand de ejemplo ─────────
  if (paso === "resultado") {
    const { supplier, products } = standDelEnsayo(precio.replace(/\.$/, ""));
    return (
      <FichaProveedor supplier={supplier} allSuppliers={[supplier]} products={products} moneda={moneda} Foto={Foto} tLegacy={tLegacy}
        onBack={() => setPaso("permiso")} soloVer festejo={{ titulo: t("ensayo.resultadoTitulo"), texto: t("ensayo.resultadoTexto"), fijo: true }}
        accionUnica={{ texto: t("ensayo.probarConMiCamara"), onClick: () => setPaso("permiso") }} />
    );
  }

  // ── 6 · Antes del permiso ─────────────────────────────────────
  if (paso === "permiso") {
    const android = Capacitor.getPlatform() === "android";
    return (
      <div data-ensayo className="pantalla-fija" style={{ position: "fixed", inset: 0, zIndex: 100, background: paleta.bg, color: paleta.text, display: "flex", flexDirection: "column", padding: "calc(env(safe-area-inset-top, 0px) + 28px) 22px calc(env(safe-area-inset-bottom, 0px) + 22px)", fontFamily: "inherit" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 14, textAlign: "center" }}>
          <span style={{ width: 76, height: 76, borderRadius: 38, background: paleta.accentSoft, display: "grid", placeItems: "center" }}><Icono nombre="camara" tamano={36} color={paleta.accent} /></span>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, lineHeight: 1.25 }}>{t("ensayo.permisoTitulo")}</h1>
          <p style={{ margin: 0, fontSize: 16, lineHeight: 1.45, color: paleta.muted, maxWidth: 330 }}>{t("ensayo.permisoTexto")}</p>
          {/* Qué elegir en el cartel que viene, como texto: un dibujo del cartel parecía un botón (Nati, 27/10) */}
          <p style={{ margin: "8px 0 0", fontSize: 15, lineHeight: 1.45, background: paleta.card, borderRadius: 14, padding: "12px 14px", maxWidth: 340, boxShadow: paleta.sombraTarjeta }}>
            {t(android ? "ensayo.permisoAndroid" : "ensayo.permisoIos")}<b style={{ display: "block", marginTop: 2 }}>{t(android ? "ensayo.permisoAndroidOpcion" : "ensayo.permisoIosOpcion")}</b>
          </p>
        </div>
        {/* Un solo botón (Nati, 27/10: "¿por qué damos la opción de que no?"): si no quiere, lo dice en el cartel del teléfono */}
        <Boton variante="principal" ancho="total" icono="camara" onClick={() => onActivarCamara?.()}>{t("ensayo.activarCamara")}</Boton>
      </div>
    );
  }

  // ── 2 a 4 · El visor de ensayo ───────────────────────────────────
  const esTarjeta = paso === "tarjeta";
  const esPrecio = paso === "precio";
  const indice = { p1: 0, precio: 1, tarjeta: 2 }[paso];
  const foto = esTarjeta ? TARJETA_EJEMPLO.fotoVisor : PRODUCTOS_ENSAYO[0].foto;
  const enStand = paso === "p1" ? 0 : 1; // fotos ya sacadas en este stand
  const ultima = PRODUCTOS_ENSAYO[0].foto;
  const BLANCO = "#FFF3EA";
  return (
    <div data-ensayo className="pantalla-fija" style={{ position: "fixed", inset: 0, zIndex: 100, background: MARCA.cacao, color: BLANCO, fontFamily: "inherit", overflow: "hidden", userSelect: "none" }}>
      <style>{css}</style>
      {/* El "visor": la foto entra apenas girada y se endereza (el gesto de la marca) */}
      <img key={foto} src={foto} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", animation: reducido ? "none" : "ensayoEntra 420ms cubic-bezier(0.2, 0.8, 0.2, 1) both" }} />
      <div aria-hidden style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(28,13,6,0.55) 0, rgba(28,13,6,0) 22%, rgba(28,13,6,0) 52%, rgba(28,13,6,0.82) 100%)" }} />
      <div aria-hidden style={{ position: "absolute", inset: 0, background: "#fff", opacity: disparando && !esTarjeta ? 0.7 : 0, transition: "opacity 120ms linear", pointerEvents: "none", zIndex: 6 }} />

      {/* Arriba: cuánto falta y Saltar */}
      <div style={{ position: "absolute", top: "calc(env(safe-area-inset-top, 0px) + 12px)", left: 14, right: 14, display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 5 }}>
        <div aria-label={`${indice + 1} / 3`} style={{ display: "flex", gap: 6 }}>
          {[0, 1, 2].map(i => <span key={i} style={{ width: 26, height: 6, borderRadius: 3, background: i < indice ? MARCA.sello : i === indice ? BLANCO : "rgba(255,243,234,0.35)" }} />)}
        </div>
        <button type="button" onClick={saltar} style={{ minHeight: 44, padding: "0 6px", border: "none", background: "none", color: BLANCO, fontFamily: "inherit", fontSize: 15, fontWeight: 500, cursor: "pointer" }}>{t("ensayo.saltar")}</button>
      </div>

      {/* La pastilla de qué es esto, o el aviso de lo que leyó la "IA" del producto anterior */}
      {esPrecio ? (
        <div style={{ position: "absolute", top: "calc(env(safe-area-inset-top, 0px) + 66px)", left: 14, right: 14, zIndex: 5, background: "#fff", color: MARCA.cacao, borderRadius: 16, padding: 12, display: "flex", gap: 12, alignItems: "center", boxShadow: "0 8px 24px -10px rgba(0,0,0,0.5)" }}>
          <img src={PRODUCTOS_ENSAYO[0].foto} alt="" style={{ width: 52, height: 52, borderRadius: 10, objectFit: "cover", flexShrink: 0 }} />
          <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 2, alignItems: "flex-start" }}>
            <span style={{ fontSize: 12, fontWeight: 700, background: "#FFE7A8", borderRadius: 999, padding: "2px 9px" }}>{t("ensayo.iaReconocio")}</span>
            <span style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.25, backgroundImage: `linear-gradient(${MARCA.sello}, ${MARCA.sello})`, backgroundRepeat: "no-repeat", backgroundSize: "100% 0.32em", backgroundPosition: "0 92%", animation: reducido ? "none" : "ensayoEscribe 900ms steps(24) 200ms both" }}>{t(`catalogo.ejemplo.productos.${PRODUCTOS_ENSAYO[0].clave}`)}</span>
            <span style={{ fontSize: 13, color: "#5A3522" }}>{t("ensayo.detalleFlores")}</span>
          </div>
        </div>
      ) : (
        <div style={{ position: "absolute", top: "calc(env(safe-area-inset-top, 0px) + 66px)", left: 0, right: 0, display: "flex", justifyContent: "center", zIndex: 5 }}>
          <span style={{ display: "inline-flex", alignItems: "center", minHeight: 36, padding: "0 14px", borderRadius: 999, background: esTarjeta ? MARCA.sello : "rgba(28,13,6,0.62)", color: esTarjeta ? MARCA.cacao : BLANCO, fontSize: 13, fontWeight: esTarjeta ? 700 : 500 }}>{esTarjeta ? t("ensayo.tarjetaPastilla") : t("ensayo.standEjemplo")}</span>
        </div>
      )}

      {esTarjeta && <div aria-hidden style={{ position: "absolute", left: "8%", right: "8%", top: "36%", aspectRatio: "1.75", border: `3px dashed ${MARCA.sello}`, borderRadius: 14, zIndex: 3, pointerEvents: "none" }} />}
      {leyendo && <div aria-hidden style={{ position: "absolute", left: "8%", right: "8%", height: 3, background: MARCA.sello, boxShadow: `0 0 18px 4px rgba(255,197,61,0.7)`, zIndex: 4, animation: "ensayoLee 1s ease-in-out both" }} />}

      {leyendo
        ? <Globo titulo={t("ensayo.leyendo")} />
        : paso === "p1" ? <Globo titulo={t("ensayo.p1Titulo")} texto={t("ensayo.p1Texto")} />
        : esPrecio ? null
        : <Globo titulo={t("ensayo.tarjetaTitulo")} texto={t("ensayo.tarjetaTexto")} />}

      {/* El paso del precio: la pastilla dice qué hacer y el teclado de la app ya está abierto, vacío */}
      {esPrecio && (
        <>
          <div style={{ position: "absolute", top: "calc(env(safe-area-inset-top, 0px) + 166px)", left: 14, right: 14, zIndex: 5, display: "flex", justifyContent: "center" }}>
            <span role="status" style={{ display: "inline-flex", alignItems: "center", minHeight: 40, padding: "8px 14px", borderRadius: 999, background: MARCA.sello, color: MARCA.cacao, fontSize: 14, fontWeight: 700, textAlign: "center", lineHeight: 1.3 }}>{t("ensayo.precioPastilla")}</span>
          </div>
          <TecladoDatos campos={[["price", t("visor.campoPrecio")], ["moq", t("visor.campoMoq")], ["piezasPorCaja", t("visor.campoPiezasCorto")], ["cbmPorCaja", t("visor.campoCbmCorto")]]}
            campo="price" valores={{ price: precio }} moneda={moneda} campoGuardado={precioListo ? "price" : null} favorito={false}
            onTecla={tocarTecla} onListo={listoPrecio} onCampo={() => {}} onFavorito={() => {}}
            guia={precioListo ? null : { teclas: TECLAS_GUIA, indice: indiceGuia }}
            estilo={{ position: "absolute", left: 12, right: 12, bottom: "calc(196px + env(safe-area-inset-bottom, 0px))", zIndex: 5 }} />
        </>
      )}

      {/* Abajo: el contador del stand, el obturador y qué hace */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 5, padding: "18px 18px calc(20px + env(safe-area-inset-bottom, 0px))", display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div style={{ width: 88, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          {enStand > 0 && (
            <>
              <span style={{ position: "relative", width: 52, height: 52, borderRadius: 14, border: "2px solid rgba(255,255,255,0.8)", overflow: "visible" }}>
                <img src={ultima} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 12, display: "block" }} />
                <span style={{ position: "absolute", right: -9, top: -9, minWidth: 24, height: 24, padding: "0 7px", borderRadius: 12, background: MARCA.sello, color: MARCA.cacao, fontSize: 12, fontWeight: 700, display: "grid", placeItems: "center" }}>{enStand}</span>
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.05em" }}>{t("ensayo.esteStand").toUpperCase()}</span>
            </>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <Obturador amarillo={esTarjeta} quieto={esPrecio} etiqueta={esTarjeta ? t("ensayo.escanearTarjeta") : t("ensayo.sacarFoto")}
            onClick={() => (esPrecio ? listoPrecio() : disparar(paso === "p1" ? "precio" : "resultado", { tarjeta: esTarjeta }))} />
          <span style={{ fontSize: 13, fontWeight: 600, textShadow: "0 1px 3px rgba(0,0,0,0.6)", visibility: esPrecio ? "hidden" : "visible" }}>{esTarjeta ? t("ensayo.escanearTarjeta") : t("ensayo.sacarFoto")}</span>
        </div>
        <div style={{ width: 88 }} />
      </div>
    </div>
  );
}
