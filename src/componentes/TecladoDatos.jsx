/**
 * El teclado propio de después de la foto (Nati, 28/10/2026; wireframe A aprobado:
 * https://claude.ai/artifact/4TvXSaLv8QhZVjWn2V8YJU).
 *
 * Por qué existe: con la barra del 23/09 se escribía con el teclado del teléfono, y para salir había que cerrar
 * dos cosas (el teclado y la barra). Mucha gente no sabía cómo, y la barra tapaba lo que venía después.
 * Acá no se abre nunca el teclado del sistema: el número grande arriba, teclas grandes, y un solo Listo que
 * guarda y cierra. Estilo Buddy, pero la cámara sigue viva arriba y el obturador queda a la vista.
 *
 * Lo comparten el visor (la cámara real) y el ensayo de feria (el paso del precio, con las teclas que se
 * iluminan en orden). Es solo la capa visible: los valores y qué hacer con cada tecla vienen de afuera.
 */
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSistema } from "../sistema/SistemaProvider.jsx";
import { MARCA, FUENTES } from "../sistema/tokens.js";
import { vibrarSeleccion } from "../sistema/vibrar.js";
import { Icono } from "./Icono.jsx";

const BLANCO = "#F1F5F9";
const BLANCO_SUAVE = "rgba(241, 245, 249, 0.72)";
const TECLA = "rgba(255,243,234,0.18)";

/** Las teclas, 3 columnas como el teléfono (v2, Nati 28/10: la cuarta columna rompía el teclado y el Listo no se veía).
 *  El confirmar es la tilde redonda a la derecha del número, como en Buddy: fuera de la grilla, al alcance del pulgar. */
const FILAS = [["1", "2", "3"], ["4", "5", "6"], ["7", "8", "9"], [".", "0", "⌫"]];

export function TecladoDatos({
  campos = [], // [["price", "Precio"], ...] en el orden de las pestañas
  campo = "price", valores = {}, moneda = "USD", moqBase = null, favorito = false,
  campoGuardado = null, // el campo que acaba de guardarse: se pone verde con una tilde un instante
  hecho = () => false, // k → true si ese dato ya está cargado (puntito verde en la pestaña)
  proveedor = null, // null: sin pestaña Proveedor · { nombre, tieneTarjeta, leyendo }: la pestaña dice de quién es
  onTecla, onListo, onCampo, onMoqBase, onFavorito,
  onEscanearTarjeta, onElegirProveedor, onEscribirProveedor,
  guia = null, // ensayo: { teclas: ["3", ".", "8", "listo"], indice } ilumina una tecla por vez, con su número
  estilo = {},
}) {
  const { t } = useTranslation();
  const { reducido } = useSistema();
  const valor = valores[campo] || "";
  const etiquetaDe = Object.fromEntries(campos);
  const esProveedor = campo === "proveedor";
  // El número crece apenas al cambiar (1,04): se nota que la tecla entró
  const [late, setLate] = useState(false);
  const primera = useRef(true);
  useEffect(() => {
    if (primera.current) { primera.current = false; return; }
    if (reducido) return;
    setLate(true);
    const id = setTimeout(() => setLate(false), 160);
    return () => clearTimeout(id);
  }, [valor]);

  const tocar = (tecla) => { vibrarSeleccion(); onTecla?.(tecla); };
  // Deslizar el panel hacia abajo también lo cierra (como la barra de antes)
  let y0 = null;
  const alTocar = e => { y0 = e.touches?.[0]?.clientY ?? null; };
  const alSoltar = e => { const y1 = e.changedTouches?.[0]?.clientY; if (y0 !== null && y1 !== undefined && y1 - y0 > 40) onListo?.(); y0 = null; };

  const guiaDe = (tecla) => (guia && guia.teclas?.[guia.indice] === tecla ? guia.indice + 1 : null);
  const estiloTecla = (tecla, extra = {}) => {
    const n = guiaDe(tecla);
    return { position: "relative", minHeight: 46, borderRadius: 12, border: "none", background: TECLA, color: "#fff", fontFamily: FUENTES.marca, fontSize: 22, fontWeight: 600, cursor: "pointer", padding: 0, outline: n ? `3px solid ${MARCA.sello}` : "none", outlineOffset: -3, ...extra };
  };
  // La tilde redonda que guarda y cierra (48 px, crema con cacao: se ve sobre el panel oscuro y no parece error)
  const Tilde = () => (
    <button type="button" onClick={() => { vibrarSeleccion(); onListo?.(); }} aria-label={t("visor.confirmar")} style={{ position: "relative", marginLeft: "auto", alignSelf: "center", width: 48, height: 48, borderRadius: 24, border: "none", background: MARCA.crema, color: MARCA.cacao, display: "grid", placeItems: "center", cursor: "pointer", padding: 0, flexShrink: 0, outline: guiaDe("ok") ? `3px solid ${MARCA.sello}` : "none", outlineOffset: 2 }}>
      <Icono nombre="listo" tamano={26} color={MARCA.cacao} grosor={2.5} /><Numerito tecla="ok" />
    </button>
  );
  const Numerito = ({ tecla }) => { const n = guiaDe(tecla); return n ? <span aria-hidden style={{ position: "absolute", top: -8, right: -8, width: 22, height: 22, borderRadius: 11, background: MARCA.sello, color: MARCA.cacao, fontFamily: FUENTES.interfaz, fontSize: 12, fontWeight: 700, display: "grid", placeItems: "center" }}>{n}</span> : null; };

  const placeholder = campo === "price" ? t("visor.aCuantoEstaba") : campo === "moq" ? t("visor.pistaMoq") : campo === "piezasPorCaja" ? t("visor.pistaPiezas") : campo === "cbmPorCaja" ? t("visor.pistaCbm") : etiquetaDe[campo] || "";

  return (
    <div onClick={e => e.stopPropagation()} onTouchStart={alTocar} onTouchEnd={alSoltar} role="dialog" aria-label={t("visor.datosDelUltimo")}
      style={{ background: "rgba(43,18,6,0.92)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", color: BLANCO, borderRadius: 18, padding: "8px 10px 10px", display: "flex", flexDirection: "column", gap: 8, boxShadow: "0 10px 30px -12px rgba(0,0,0,0.6)", ...estilo }}>
      <style>{`@keyframes fairscanTeclaEntra { 0% { transform: scale(1) } 40% { transform: scale(1.04) } 100% { transform: scale(1) } }`}</style>
      <div aria-label={t("visor.agarradera")} style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,243,234,0.35)", margin: "-2px auto 0" }} />

      {/* Las pestañas (texto plano, Nati 23/09) y la estrella a la derecha */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "0 4px" }}>
        <div role="tablist" aria-label={t("visor.otrosDatos")} style={{ display: "flex", gap: 10, flex: 1, minWidth: 0, overflowX: "auto", scrollbarWidth: "none" }}>
          {campos.map(([k, etiqueta]) => {
            const activo = k === campo; const ok = k === "proveedor" ? !!proveedor?.nombre : hecho(k);
            return <button key={k} type="button" role="tab" aria-selected={activo} onClick={() => { vibrarSeleccion(); onCampo?.(k); }} style={{ minHeight: 32, padding: "0 2px 4px", border: "none", borderBottom: `2px solid ${activo ? MARCA.sello : "transparent"}`, background: "transparent", color: activo ? "#fff" : BLANCO_SUAVE, fontSize: 12.5, fontWeight: activo ? 700 : 500, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 5, flexShrink: 0 }}>{etiqueta}{ok && !activo && <span aria-hidden style={{ display: "inline-block", width: 6, height: 6, borderRadius: 3, background: "#86EFAC" }} />}</button>;
          })}
        </div>
        {onFavorito && <button type="button" onClick={() => { vibrarSeleccion(); onFavorito(); }} aria-pressed={!!favorito} aria-label={favorito ? t("visor.quitarFavorito") : t("visor.marcarFavorito")} style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${favorito ? MARCA.sello : "rgba(255,243,234,0.35)"}`, background: favorito ? "rgba(255,197,61,0.22)" : "transparent", display: "grid", placeItems: "center", cursor: "pointer", flexShrink: 0, padding: 0 }}>
          <Icono nombre="favorito" tamano={18} color={favorito ? MARCA.sello : BLANCO_SUAVE} relleno={favorito ? MARCA.sello : undefined} />
        </button>}
      </div>

      {esProveedor ? (
        // ¿De quién es este producto? (Nati, 28/10): la pregunta vive en el mismo lugar que "¿a cuánto?"
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {proveedor?.nombre ? (
            <div role="status" style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 52, padding: "8px 12px", borderRadius: 12, background: "rgba(34,197,94,0.18)" }}>
              <span style={{ width: 28, height: 28, borderRadius: 14, background: "#86EFAC", display: "grid", placeItems: "center", flexShrink: 0 }}><Icono nombre="listo" tamano={16} color={MARCA.cacao} /></span>
              <div style={{ minWidth: 0 }}><div style={{ fontSize: 17, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{proveedor.nombre}</div><div style={{ fontSize: 12, color: BLANCO_SUAVE }}>{t("visor.proveedorListo")}</div></div>
            </div>
          ) : proveedor?.leyendo ? (
            <div role="status" style={{ minHeight: 52, display: "flex", alignItems: "center", padding: "0 12px", borderRadius: 12, background: TECLA, fontSize: 15, fontWeight: 600 }}>{t("visor.leyendoTitulo")}…</div>
          ) : (
            <>
              {/* 28/10 (Nati: "no me ofrece escanear tarjeta ni nada"): con tarjeta sacada pero sin nombre (falló o no terminó) también se ofrece volver a escanear, elegir o escribir */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}><p style={{ margin: "2px 4px 0", fontSize: 15, fontWeight: 700, flex: 1 }}>{proveedor?.tieneTarjeta ? t("visor.tarjetaSinLeerAun") : t("visor.proveedorPregunta")}</p><Tilde /></div>
              <button type="button" onClick={() => { vibrarSeleccion(); onEscanearTarjeta?.(); }} style={{ minHeight: 52, borderRadius: 14, border: "none", background: MARCA.sello, color: MARCA.cacao, fontFamily: "inherit", fontSize: 15, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}><Icono nombre="tarjeta" tamano={18} color={MARCA.cacao} />{proveedor?.tieneTarjeta ? t("visor.escanearDeNuevo") : t("visor.escanearTarjetaCorto")}</button>
              <div style={{ display: "flex", gap: 6 }}>
                <button type="button" onClick={() => { vibrarSeleccion(); onElegirProveedor?.(); }} style={{ flex: 1, minHeight: 44, borderRadius: 12, border: "none", background: TECLA, color: "#fff", fontFamily: "inherit", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>{t("visor.elegirCargado")}</button>
                <button type="button" onClick={() => { vibrarSeleccion(); onEscribirProveedor?.(); }} style={{ flex: 1, minHeight: 44, borderRadius: 12, border: "none", background: TECLA, color: "#fff", fontFamily: "inherit", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>{t("visor.escribirNombre")}</button>
              </div>
            </>
          )}
          {(proveedor?.nombre || proveedor?.leyendo) && <div style={{ display: "flex", justifyContent: "flex-end" }}><Tilde /></div>}
        </div>
      ) : (
        <>
          {/* El número grande */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 60, padding: "6px 6px 6px 12px", borderRadius: 14, background: campoGuardado === campo ? "#22C55E" : "rgba(255,243,234,0.10)", transition: "background 200ms ease" }}>
            {campo === "price" && <span style={{ fontSize: 14, fontWeight: 600, color: BLANCO_SUAVE, whiteSpace: "nowrap" }}>{moneda}</span>}
            {valor
              ? <span role="status" aria-label={`${campo === "price" ? moneda : etiquetaDe[campo]} ${valor}`} style={{ fontFamily: FUENTES.marca, fontWeight: 800, fontSize: 34, letterSpacing: "-0.03em", color: "#fff", fontVariantNumeric: "tabular-nums", lineHeight: 1.2, display: "inline-block", animation: late ? "fairscanTeclaEntra 160ms ease-out" : "none" }}>{valor}</span>
              : <span style={{ fontSize: 18, fontWeight: 500, color: "rgba(255,243,234,0.45)" }}>{placeholder}</span>}
            {campo === "cbmPorCaja" && valor && <span style={{ fontSize: 13, fontWeight: 600, color: BLANCO_SUAVE }}>CBM</span>}
            {campoGuardado === campo && <span role="status" aria-label={t("visor.guardado")} style={{ alignSelf: "center", display: "grid", placeItems: "center", width: 22, height: 22, borderRadius: 11, background: "#86EFAC" }}><Icono nombre="listo" tamano={14} color="#fff" /></span>}
            <Tilde />
          </div>
          {campo === "moq" && (
            <div role="radiogroup" aria-label={t("visor.campoMoq")} style={{ display: "flex", gap: 2, padding: 3, borderRadius: 10, background: TECLA }}>
              {[["producto", t("visor.basePorProducto")], ["caja", t("visor.basePorCaja")], ["pedido", t("visor.basePorPedido")]].map(([b, etiqueta]) => (
                <button key={b} type="button" role="radio" aria-checked={moqBase === b} onClick={() => { vibrarSeleccion(); onMoqBase?.(b); }} style={{ flex: 1, minHeight: 30, borderRadius: 8, border: "none", background: moqBase === b ? MARCA.sello : "transparent", color: moqBase === b ? MARCA.cacao : BLANCO_SUAVE, fontSize: 12, fontWeight: moqBase === b ? 700 : 500, cursor: "pointer", fontFamily: "inherit" }}>{etiqueta}</button>
              ))}
            </div>
          )}
          {/* Las teclas: 4 columnas; a la derecha ⌫ y, debajo, Listo alto (el pulgar derecho lo tiene al lado del 6, 9 y 0) */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gridAutoRows: "46px", gap: 6 }}>
            {FILAS.flat().map(tecla => tecla === "⌫"
              ? <button key="borrar" type="button" onClick={() => tocar("⌫")} aria-label={t("visor.borrarTecla")} style={estiloTecla("⌫", { fontSize: 18, color: BLANCO_SUAVE })}>⌫</button>
              : <button key={tecla} type="button" onClick={() => tocar(tecla)} aria-label={tecla} style={estiloTecla(tecla)}>{tecla}<Numerito tecla={tecla} /></button>)}
          </div>
        </>
      )}
    </div>
  );
}
