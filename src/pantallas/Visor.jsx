/**
 * El visor: la casa de la app (propuesta-experiencia.md, pantallas 2 a 5 del recorrido).
 *
 * Es solo la capa visible. La lógica (cámara, guardado, cola de IA, borrador)
 * sigue en QuickCapture; esto recibe lo que hay que mostrar y avisa lo que se tocó.
 *
 *  · Obturador de 72 abajo-centro; miniatura de la última captura a la izquierda
 *    (tocar: últimas tres, para ver o borrar); "Cerrar stand" a la derecha.
 *  · Arriba: saldo de escaneos y el punto de estado. Nada más.
 *  · "+ ángulo" unos segundos después de cada disparo: la próxima foto se suma al último.
 *  · Consejo en contexto tras la tercera foto, una vez en la vida.
 *  · Teclado de precio un segundo y medio después del disparo (4.8), rediseñado.
 */
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSistema } from "../sistema/SistemaProvider.jsx";
import { Icono, Hoja, Boton } from "../componentes/index.js";
import { MARCA } from "../sistema/tokens.js";

const VIDRIO = "rgba(10, 14, 23, 0.55)";
const BLANCO = "#F1F5F9";
const BLANCO_SUAVE = "rgba(241, 245, 249, 0.72)";

function Pastilla({ children, tono = "vidrio", estilo }) {
  const fondo = tono === "alerta" ? MARCA.naranja : VIDRIO;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, minHeight: 32, padding: "0 12px", borderRadius: 999, background: fondo, backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", color: BLANCO, fontSize: 13, fontWeight: 600, letterSpacing: "0.01em", whiteSpace: "nowrap", ...estilo }}>
      {children}
    </span>
  );
}

export function Visor({
  videoRef, modo = "product", feria, itemsCount = 0, saldo = null, trial = 15, esperando = 0, estadoSync = "guardado", pendientesSync = 0,
  flash = false, ultimaCaptura = null, ultimas = [], puedeAgregarAngulo = false,
  precioRapido = null, moneda = "USD", onTeclaPrecio, onConfirmarPrecio,
  onDisparar, onCerrarStand, onCatalogo, onCancelar, onAgregarAngulo, onBorrarFoto,
  consejoVisible = false, onConsejoVisto,
  onTouchStart, onTouchEnd,
}) {
  const { t } = useTranslation();
  const { alturas, movimiento, curvas, duracion, reducido } = useSistema();
  const [presionado, setPresionado] = useState(false);
  const [ultimasAbiertas, setUltimasAbiertas] = useState(false);
  const [miniaturaVuela, setMiniaturaVuela] = useState(false);
  const consejoTimer = useRef(null);

  // La miniatura "vuela" al contador en cada disparo (movimiento 2).
  useEffect(() => {
    if (!ultimaCaptura) return;
    setMiniaturaVuela(true);
    const id = setTimeout(() => setMiniaturaVuela(false), duracion(movimiento.obturador.miniatura));
    return () => clearTimeout(id);
  }, [ultimaCaptura]);

  // El consejo se va solo y no vuelve.
  useEffect(() => {
    if (!consejoVisible) return;
    consejoTimer.current = setTimeout(() => onConsejoVisto?.(), 6000);
    return () => clearTimeout(consejoTimer.current);
  }, [consejoVisible]);

  const esTarjeta = modo === "card";
  const textoSaldo = saldo === null ? null
    : saldo <= 0 ? t("visor.sinEscaneos", { count: esperando })
    : saldo <= trial ? t("visor.escaneosDePrueba", { count: saldo, total: trial })
    : t("visor.escaneos", { count: saldo });
  const saldoBajo = saldo !== null && saldo <= 3;
  const textoSync = estadoSync === "sincronizando" ? t("visor.sincronizando", { count: pendientesSync }) : estadoSync === "nube" ? t("visor.enLaNube") : t("visor.guardado");
  const colorPunto = estadoSync === "falla" ? "#EF4444" : estadoSync === "nube" ? "#22C55E" : estadoSync === "sincronizando" ? MARCA.naranja : BLANCO_SUAVE;

  const teclas = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"];

  return (
    <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} style={{ position: "fixed", inset: 0, zIndex: 100, background: "#000", display: "flex", flexDirection: "column", color: BLANCO, fontFamily: "inherit", userSelect: "none" }}>
      <video ref={videoRef} autoPlay playsInline muted style={{ flex: 1, objectFit: "cover", width: "100%" }} />

      {/* Velo blanco del obturador (80 ms) */}
      <div aria-hidden style={{ position: "absolute", inset: 0, background: "#fff", opacity: flash ? 0.75 : 0, pointerEvents: "none", zIndex: 2, transition: `opacity ${duracion(movimiento.obturador.velo)}ms linear` }} />

      {/* Arriba: saldo y estado. Nada más. */}
      <div style={{ position: "absolute", top: "calc(env(safe-area-inset-top, 0px) + 12px)", left: 14, right: 14, zIndex: 3, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center", minWidth: 0 }}>
          {feria && <Pastilla estilo={{ maxWidth: "46vw", overflow: "hidden", textOverflow: "ellipsis", display: "block", lineHeight: "32px" }}>{feria}</Pastilla>}
          {textoSaldo && !esTarjeta && <Pastilla tono={saldoBajo ? "alerta" : "vidrio"}>{textoSaldo}</Pastilla>}
        </div>
        <Pastilla><span aria-hidden style={{ width: 8, height: 8, borderRadius: 4, background: colorPunto, display: "inline-block" }} /><span style={{ fontSize: 12, fontWeight: 500, color: BLANCO_SUAVE }}>{textoSync}</span></Pastilla>
      </div>

      {/* Modo tarjeta: guía */}
      {esTarjeta && (
        <>
          <div style={{ position: "absolute", top: "calc(env(safe-area-inset-top, 0px) + 60px)", left: 0, right: 0, zIndex: 3, display: "flex", justifyContent: "center" }}>
            <Pastilla><Icono nombre="proveedor" tamano={16} color={BLANCO} />{t("visor.tarjetaDelProveedor")}</Pastilla>
          </div>
          <div aria-hidden style={{ position: "absolute", left: "8%", right: "8%", top: "30%", aspectRatio: "1.75", border: "2px dashed rgba(241,245,249,0.7)", borderRadius: 14, zIndex: 3, pointerEvents: "none" }} />
          <div style={{ position: "absolute", left: 14, right: 14, top: "calc(30% + 46vw + 14px)", zIndex: 3, textAlign: "center" }}>
            <span style={{ fontSize: 13, color: BLANCO_SUAVE }}>{t("visor.encuadraLaTarjeta")}</span>
          </div>
        </>
      )}

      {/* Consejo en contexto (una vez en la vida) */}
      {consejoVisible && !esTarjeta && (
        <div role="status" onClick={onConsejoVisto} style={{ position: "absolute", left: 14, right: 14, bottom: 148, zIndex: 4, background: "rgba(10,14,23,0.86)", backdropFilter: "blur(10px)", borderRadius: 14, padding: "12px 14px", textAlign: "center", fontSize: 14, lineHeight: 1.4, color: BLANCO, cursor: "pointer" }}>
          {t("visor.consejoTarjeta")}
        </div>
      )}

      {/* Precio al toque (4.8) */}
      {precioRapido && !esTarjeta && (
        <div onClick={e => e.stopPropagation()} style={{ position: "absolute", left: 14, right: 14, bottom: 148, zIndex: 5, background: "rgba(10,14,23,0.88)", backdropFilter: "blur(12px)", borderRadius: 20, padding: "12px 12px 10px", maxWidth: 360, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "0 4px 8px" }}>
            <div><div style={{ fontSize: 13, fontWeight: 600, color: BLANCO }}>{t("visor.precioDelUltimo")}</div><div style={{ fontSize: 12, color: BLANCO_SUAVE }}>{t("visor.seVaSolo")}</div></div>
            <div style={{ fontSize: 24, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: precioRapido.valor ? "#22C55E" : BLANCO_SUAVE }}>{moneda} {precioRapido.valor || "0"}</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
            {teclas.map(k => (
              <button key={k} type="button" onClick={() => onTeclaPrecio?.(k)} aria-label={k === "⌫" ? t("comun.borrar") : k} style={{ minHeight: alturas.tocable, borderRadius: 12, border: "none", background: "rgba(241,245,249,0.12)", color: BLANCO, fontSize: 20, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", WebkitTapHighlightColor: "transparent" }}>{k}</button>
            ))}
          </div>
          <button type="button" onClick={onConfirmarPrecio} style={{ width: "100%", marginTop: 6, minHeight: alturas.tocable, borderRadius: 12, border: "none", background: precioRapido.valor ? "#15803D" : "rgba(241,245,249,0.12)", color: BLANCO, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{t("visor.ok")}</button>
        </div>
      )}

      {/* Abajo: miniatura · obturador · cerrar stand */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 3, padding: "24px 22px calc(22px + env(safe-area-inset-bottom, 0px))", display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(transparent, rgba(0,0,0,0.7))" }}>
        {/* Izquierda: última captura + "+ ángulo" (o Catálogo si no hay captura) */}
        <div style={{ width: 84, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          {ultimaCaptura || ultimas.length ? (
            <>
              <button type="button" onClick={() => setUltimasAbiertas(true)} aria-label={t("visor.ultimasFotos")} style={{ width: alturas.miniatura, height: alturas.miniatura, borderRadius: 12, border: "2px solid #fff", padding: 0, overflow: "hidden", background: "#111", cursor: "pointer", transform: miniaturaVuela && !reducido ? "scale(1.12)" : "scale(1)", transition: `transform ${duracion(movimiento.obturador.miniatura)}ms ${curvas.entra}` }}>
                <img src={ultimaCaptura || ultimas[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </button>
              {puedeAgregarAngulo && !esTarjeta && (
                <button type="button" onClick={onAgregarAngulo} style={{ minHeight: 28, padding: "0 10px", borderRadius: 999, border: "none", background: "rgba(241,245,249,0.16)", color: BLANCO, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{t("visor.masAngulo")}</button>
              )}
            </>
          ) : (
            <button type="button" onClick={onCatalogo} aria-label={t("visor.catalogo")} style={{ width: alturas.miniatura, height: alturas.miniatura, borderRadius: 14, border: "none", background: "rgba(241,245,249,0.14)", color: BLANCO, display: "grid", placeItems: "center", cursor: "pointer" }}>
              <Icono nombre="foto" tamano={22} color={BLANCO} />
            </button>
          )}
        </div>

        {/* Obturador */}
        <button
          type="button"
          onClick={onDisparar}
          onPointerDown={() => setPresionado(true)}
          onPointerUp={() => setPresionado(false)}
          onPointerLeave={() => setPresionado(false)}
          aria-label={t("visor.disparar")}
          style={{ position: "relative", width: alturas.obturador, height: alturas.obturador, borderRadius: "50%", border: "5px solid #fff", background: "rgba(255,255,255,0.25)", cursor: "pointer", padding: 0, transform: presionado ? `scale(${movimiento.toque.escala})` : "scale(1)", transition: `transform ${duracion(presionado ? movimiento.toque.bajada : movimiento.toque.vuelta)}ms ${curvas.estandar}`, WebkitTapHighlightColor: "transparent" }}
        >
          {!esTarjeta && itemsCount > 0 && (
            <span aria-label={t("visor.enEsteStand", { count: itemsCount })} style={{ position: "absolute", right: -10, top: -10, minWidth: 26, height: 26, padding: "0 8px", borderRadius: 13, background: MARCA.naranja, color: "#fff", fontSize: 13, fontWeight: 700, display: "grid", placeItems: "center", boxShadow: "0 0 0 3px rgba(0,0,0,0.35)", fontVariantNumeric: "tabular-nums" }}>{itemsCount}</span>
          )}
        </button>

        {/* Derecha: Cerrar stand (o Cancelar en modo tarjeta) */}
        <div style={{ width: 84, display: "flex", justifyContent: "flex-end" }}>
          {esTarjeta ? (
            <button type="button" onClick={onCancelar} style={{ minWidth: alturas.miniatura, height: alturas.miniatura, padding: "0 12px", borderRadius: 14, border: "none", background: "rgba(241,245,249,0.14)", color: BLANCO, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{t("visor.cancelar")}</button>
          ) : (
            <button type="button" onClick={onCerrarStand} style={{ width: 84, height: alturas.miniatura, borderRadius: 14, border: "none", background: itemsCount > 0 ? MARCA.naranja : "rgba(241,245,249,0.14)", color: "#fff", fontSize: 12, fontWeight: 700, lineHeight: 1.15, cursor: "pointer", fontFamily: "inherit", textAlign: "center", padding: "0 6px", whiteSpace: "normal" }}>{t("visor.cerrarStand")}</button>
          )}
        </div>
      </div>

      {/* Últimas fotos: ver o borrar sin salir del visor */}
      <Hoja abierta={ultimasAbiertas} onCerrar={() => setUltimasAbiertas(false)} titulo={t("visor.ultimasFotos")}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {ultimas.slice(0, 3).map((u, i) => (
            <div key={u.id ?? i} style={{ width: "calc(33.33% - 7px)", display: "flex", flexDirection: "column", gap: 6 }}>
              <img src={u.foto} alt="" style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 12, display: "block" }} />
              <Boton variante="peligro" icono="borrar" onClick={() => { onBorrarFoto?.(u.id); if (ultimas.length <= 1) setUltimasAbiertas(false); }}>{t("visor.borrarFoto")}</Boton>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 14 }}><Boton variante="secundario" ancho="total" icono="foto" onClick={() => { setUltimasAbiertas(false); onCatalogo?.(); }}>{t("visor.catalogo")}</Boton></div>
      </Hoja>
    </div>
  );
}
