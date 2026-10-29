/**
 * Ensayo de feria: el primer uso (opción A elegida por Nati el 27/10/2026; wireframes aprobados
 * https://claude.ai/artifact/8uLJYQFmbQkvBVWNeFyjeF). Ver lib/ensayo.js.
 *
 *   bienvenida → producto (un toque) → resultado (la ficha del proveedor real, "así queda") → la cámara
 *
 * 29/10 (Nati, buzón (26)): **un solo paso**. Con tres pasos (producto, precio con el teclado, tarjeta) de 32 que
 * empezaban la prueba solo 12 llegaban al pedido de cámara: la gente viene a probar con su cámara y la frenábamos
 * con tareas de mentira. El precio y la tarjeta se enseñan después, con la primera foto real y el primer stand.
 *
 * Todo pasa sin cámara, sin IA y sin gastar escaneos: la "foto" es la del stand de ejemplo de Nancy Ceramic
 * (public/ejemplo). Una sola cosa para tocar, y late. "Saltar" lleva directo a la cámara.
 * 29/10 (Nati, hipótesis de Cantón): ya no hay pantalla "Ahora con tu cámara": al tocar "Probar con mi cámara" (o
 * Saltar) App abre la cámara de verdad y el teléfono pide el permiso en ese momento. Si dice que no, la pantalla
 * de permiso denegado (App, PermisoAviso) lleva a los ajustes del teléfono en un toque o deja usar una foto de la galería.
 * Los eventos quedan para seguir midiendo: ensayo_inicio, ensayo_paso p1, ensayo_fin, pre_permiso_visto (ahora
 * significa "pidió la cámara"), camara_ok.
 */
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSistema } from "../sistema/SistemaProvider.jsx";
import { Boton, Marca } from "../componentes/index.js";
import { MARCA, FUENTES } from "../sistema/tokens.js";
import { vibrarObturador } from "../sistema/vibrar.js";
import { anotar } from "../lib/primerUso.js";
import { TARJETA_EJEMPLO, PRODUCTOS_ENSAYO } from "../lib/ensayo.js";
import { FichaProveedor } from "./FichaProveedor.jsx";

const PASOS = ["bienvenida", "p1", "resultado"];
const ID_EJEMPLO = "ensayo-nancy";

/** El proveedor y los productos del ensayo, con la forma que espera la ficha. No se guardan en ningún lado. */
export function standDelEnsayo(precio = null) {
  const supplier = { id: ID_EJEMPLO, company: TARJETA_EJEMPLO.company, contact: TARJETA_EJEMPLO.contact, phone: TARJETA_EJEMPLO.phone, wechat: TARJETA_EJEMPLO.wechat, cardPhoto: TARJETA_EJEMPLO.foto, cardData: { ejemplo: true } };
  const products = PRODUCTOS_ENSAYO.map((p, i) => ({ id: `ensayo-${i}`, photos: [p.foto], price: (i === 0 && precio) || p.precio, supplierId: ID_EJEMPLO, createdAt: i }));
  return { supplier, products };
}

/** El obturador del ensayo: el mismo del visor (72 px, borde blanco), latiendo para que se sepa qué tocar. */
function Obturador({ onClick, etiqueta }) {
  const { alturas, reducido } = useSistema();
  const [presionado, setPresionado] = useState(false);
  return (
    <button type="button" onClick={onClick} aria-label={etiqueta} onPointerDown={() => setPresionado(true)} onPointerUp={() => setPresionado(false)} onPointerLeave={() => setPresionado(false)}
      style={{ width: alturas.obturador, height: alturas.obturador, borderRadius: "50%", border: "5px solid #fff", background: MARCA.naranja, cursor: "pointer", padding: 0,
        boxShadow: "0 0 0 10px rgba(255,79,42,0.28), 0 0 0 22px rgba(255,79,42,0.12)", animation: reducido ? "none" : "ensayoLate 1.6s ease-in-out infinite",
        transform: presionado && !reducido ? "scale(0.92)" : undefined }} />
  );
}

/** El globo blanco con la indicación, apoyado arriba del obturador. */
function Globo({ titulo, texto }) {
  return (
    <div role="status" style={{ position: "absolute", left: 14, right: 14, bottom: "calc(env(safe-area-inset-bottom, 0px) + 170px)", zIndex: 4, background: "#fff", color: MARCA.cacao, borderRadius: 18, padding: "14px 16px", boxShadow: "0 8px 24px -10px rgba(0,0,0,0.5)" }}>
      <p style={{ margin: 0, fontSize: 20, fontWeight: 700, lineHeight: 1.25 }}>{titulo}</p>
      {texto && <p style={{ margin: "4px 0 0", fontSize: 15, lineHeight: 1.45, color: "#5A3522" }}>{texto}</p>}
      <span aria-hidden style={{ position: "absolute", left: "50%", bottom: -8, width: 16, height: 16, background: "#fff", transform: "translateX(-50%) rotate(45deg)", borderRadius: 3 }} />
    </div>
  );
}

export function Ensayo({ inicio = "bienvenida", onYaTengoCuenta, onActivarCamara, moneda = "USD", Foto, tLegacy }) {
  const { t } = useTranslation();
  const { reducido } = useSistema();
  const [paso, setPaso] = useState(PASOS.includes(inicio) ? inicio : "bienvenida");
  const [disparando, setDisparando] = useState(false); // el destello y el visor que se endereza
  const temporizadores = useRef([]);
  const despues = (ms, fn) => { temporizadores.current.push(setTimeout(fn, ms)); };
  useEffect(() => () => temporizadores.current.forEach(clearTimeout), []);

  useEffect(() => {
    if (paso === "bienvenida") anotar("bienvenida_vista", {}, { unaVez: true });
    if (paso === "resultado") anotar("ensayo_fin", {}, { unaVez: true });
  }, [paso]);

  // A la cámara de verdad: el teléfono pide el permiso ahí mismo
  const pedirCamara = () => { anotar("pre_permiso_visto", {}, { unaVez: true }); onActivarCamara?.(); };
  const saltar = () => { anotar("ensayo_saltado", { paso }, { unaVez: true }); pedirCamara(); };
  const disparar = () => {
    if (disparando) return;
    vibrarObturador();
    setDisparando(true);
    anotar("ensayo_paso", { paso }, { unaVez: false });
    despues(420, () => { setDisparando(false); setPaso("resultado"); });
  };

  const css = `
    @keyframes ensayoLate { 0%,100% { transform: scale(1) } 50% { transform: scale(1.06) } }
    @keyframes ensayoEntra { from { transform: rotate(-4deg) scale(1.06) } to { transform: none } }
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
        <p style={{ margin: "2px 0 4px", fontSize: 13, color: "#8A4B2A", textAlign: "center" }}>{t("ensayo.duraUnToque")}</p>
        {onYaTengoCuenta && <button type="button" onClick={() => { anotar("cuenta_abierta", { modo: "login", desde: "bienvenida" }); onYaTengoCuenta(); }} style={{ minHeight: 44, border: "none", background: "none", color: "#5A3522", fontFamily: "inherit", fontSize: 15, fontWeight: 500, cursor: "pointer" }}>{t("entrar.yaTengoCuenta")}</button>}
      </div>
    </div>
  );

  // ── 3 · Así queda: la ficha del proveedor de verdad, con el stand de ejemplo ─────────
  if (paso === "resultado") {
    const { supplier, products } = standDelEnsayo();
    return (
      <FichaProveedor supplier={supplier} allSuppliers={[supplier]} products={products} moneda={moneda} Foto={Foto} tLegacy={tLegacy}
        onBack={pedirCamara} soloVer festejo={{ titulo: t("ensayo.resultadoTitulo"), texto: t("ensayo.resultadoTexto"), fijo: true }}
        accionUnica={{ texto: t("ensayo.probarConMiCamara"), onClick: pedirCamara }} />
    );
  }

  // ── 2 · El visor de ensayo: una sola foto, un solo toque ───────────────────
  const foto = PRODUCTOS_ENSAYO[0].foto;
  const BLANCO = "#FFF3EA";
  return (
    <div data-ensayo className="pantalla-fija" style={{ position: "fixed", inset: 0, zIndex: 100, background: MARCA.cacao, color: BLANCO, fontFamily: "inherit", overflow: "hidden", userSelect: "none" }}>
      <style>{css}</style>
      {/* El "visor": la foto entra apenas girada y se endereza (el gesto de la marca) */}
      <img src={foto} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", animation: reducido ? "none" : "ensayoEntra 420ms cubic-bezier(0.2, 0.8, 0.2, 1) both" }} />
      <div aria-hidden style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(28,13,6,0.55) 0, rgba(28,13,6,0) 22%, rgba(28,13,6,0) 52%, rgba(28,13,6,0.82) 100%)" }} />
      <div aria-hidden style={{ position: "absolute", inset: 0, background: "#fff", opacity: disparando ? 0.7 : 0, transition: "opacity 120ms linear", pointerEvents: "none", zIndex: 6 }} />

      {/* Arriba: qué es esto y Saltar */}
      <div style={{ position: "absolute", top: "calc(env(safe-area-inset-top, 0px) + 12px)", left: 14, right: 14, display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 5 }}>
        <span style={{ display: "inline-flex", alignItems: "center", minHeight: 36, padding: "0 14px", borderRadius: 999, background: "rgba(28,13,6,0.62)", color: BLANCO, fontSize: 13, fontWeight: 500 }}>{t("ensayo.standEjemplo")}</span>
        <button type="button" onClick={saltar} style={{ minHeight: 44, padding: "0 6px", border: "none", background: "none", color: BLANCO, fontFamily: "inherit", fontSize: 15, fontWeight: 500, cursor: "pointer" }}>{t("ensayo.saltar")}</button>
      </div>

      <Globo titulo={t("ensayo.p1Titulo")} texto={t("ensayo.p1Texto")} />

      {/* Abajo: el obturador y qué hace */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 5, padding: "18px 18px calc(20px + env(safe-area-inset-bottom, 0px))", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
        <Obturador etiqueta={t("ensayo.sacarFoto")} onClick={disparar} />
        <span style={{ fontSize: 13, fontWeight: 600, textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}>{t("ensayo.sacarFoto")}</span>
      </div>
    </div>
  );
}
