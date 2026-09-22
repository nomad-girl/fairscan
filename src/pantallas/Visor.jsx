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
 *  · Teclado ampliado tras el disparo (4.8 + decisión 2 del 16/09): precio, MOQ con base, piezas y CBM por caja, favorito.
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
  datosActivos = null, // { moq, piezasPorCaja, cbmPorCaja }: false apaga la pestaña (Configuración, 17/09)
  videoRef, modo = "product", feria, itemsCount = 0, saldo = null, trial = 15, esperando = 0, estadoSync = "guardado", pendientesSync = 0,
  flash = false, ultimaCaptura = null, ultimas = [], puedeAgregarAngulo = false,
  datos = null, moneda = "USD", onTeclaPrecio, onConfirmarPrecio, onCampo, onMoqBase, onFavorito,
  onDisparar, onCerrarStand, onCatalogo, onCancelar, onSinTarjeta, onVolverAProductos, onAgregarAngulo, onBorrarFoto,
  standAbierto = null, onStand, onTarjeta, // stand abierto (21/09): { nombre, fotos, tieneTarjeta, leyendo }; la tarjeta abre el stand, Cerrar stand lo cierra
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
          {/* El saldo solo cuando está por acabarse; la nube no se muestra: en la cámara distrae (Nati, 22/09) */}
          {textoSaldo && saldoBajo && !esTarjeta && <Pastilla tono="alerta">{textoSaldo}</Pastilla>}
        </div>
        {estadoSync === "falla" && <Pastilla><span aria-hidden style={{ width: 8, height: 8, borderRadius: 4, background: colorPunto, display: "inline-block" }} /><span style={{ fontSize: 12, fontWeight: 500, color: BLANCO_SUAVE }}>{textoSync}</span></Pastilla>}
      </div>

      {/* Stand abierto: la pastilla dice qué hacer ahora. Sin tarjeta invita a escanearla (eso empieza el
          stand); con tarjeta dice la empresa y abre el stand. Nati, 21/09: "la tarjeta es sinónimo de nuevo stand". */}
      {standAbierto && !esTarjeta && (() => {
        const n = standAbierto.fotos || 0;
        const conNombre = standAbierto.tieneTarjeta && !!standAbierto.nombre;
        const sinTarjeta = !standAbierto.tieneTarjeta && !standAbierto.leyendo;
        const texto = standAbierto.leyendo ? `${t("visor.leyendoTarjeta")}${n ? ` · ${t("cantidades.fotos", { count: n })}` : ""}`
          : conNombre ? t("visor.standConNombre", { nombre: standAbierto.nombre, count: n })
          : standAbierto.tieneTarjeta ? (n === 0 ? t("visor.standTarjetaSinLeer_zero") : t("visor.standTarjetaSinLeer", { count: n }))
          : n === 0 ? t("visor.escanearTarjeta")
          : t("visor.escanearTarjetaConFotos", { count: n });
        return (
          <div style={{ position: "absolute", top: "calc(env(safe-area-inset-top, 0px) + 56px)", left: 14, right: 14, zIndex: 3, display: "flex", justifyContent: "center" }}>
            <button type="button" onClick={sinTarjeta ? onTarjeta : onStand} aria-label={sinTarjeta ? t("visor.escanearTarjeta") : t("visor.abrirStand")} style={{ maxWidth: "100%", minHeight: 44, padding: "0 16px", borderRadius: 999, border: sinTarjeta ? "1.5px solid rgba(255,255,255,0.55)" : "none", background: conNombre ? MARCA.naranja : "rgba(10,14,23,0.7)", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 8, whiteSpace: "nowrap", overflow: "hidden", backdropFilter: "blur(8px)" }}>
              <Icono nombre={conNombre ? "proveedor" : sinTarjeta ? "camara" : "tarjeta"} tamano={16} color="#fff" /><span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{texto}</span>{!sinTarjeta && <Icono nombre="siguiente" tamano={14} color="rgba(255,255,255,0.8)" />}
            </button>
          </div>
        );
      })()}

      {/* Modo tarjeta: guía */}
      {esTarjeta && (
        <>
          <div style={{ position: "absolute", top: "calc(env(safe-area-inset-top, 0px) + 60px)", left: 0, right: 0, zIndex: 3, display: "flex", justifyContent: "center" }}>
            <Pastilla><Icono nombre="tarjeta" tamano={16} color={BLANCO} />{t("visor.buscandoTarjeta")}</Pastilla>
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

      {/* Teclado ampliado (decisión 2 del 16/09; rehecho dos veces con Nati probándolo el 16 y el 17/09):
          arriba dice qué pide ("¿A cuánto estaba?") y tiene la estrella con su lugar; después el número grande;
          los cuatro datos como pestañas grandes (44 px) para cambiar de dato sin perder lo cargado; el teclado;
          y ÚLTIMO el botón grande, que dice "Guardar" si hay algo o "Cerrar sin cargar nada" si no. Sin equis
          y sin temporizador: nada se va solo, nada se toca sin querer. */}
      {datos && !esTarjeta && (() => {
        const campos = [["price", t("visor.campoPrecio")], ["moq", t("visor.campoMoq")], ["piezasPorCaja", t("visor.campoPiezasCorto")], ["cbmPorCaja", t("visor.campoCbmCorto")]].filter(([k]) => k === "price" || datosActivos?.[k] !== false);
        const etiquetaDe = Object.fromEntries(campos);
        const valorActual = datos.valores[datos.campo] || "";
        const prefijo = datos.campo === "price" ? `${moneda} ` : "";
        const sufijo = datos.campo === "cbmPorCaja" ? " CBM" : "";
        const enPrecio = datos.campo === "price";
        const hayAlgo = Object.values(datos.valores).some(Boolean) || datos.favorito;
        return (
          <div onClick={e => e.stopPropagation()} role="dialog" aria-label={t("visor.datosDelUltimo")} style={{ position: "absolute", left: 12, right: 12, bottom: 148, zIndex: 5, background: "rgba(10,14,23,0.94)", backdropFilter: "blur(12px)", borderRadius: 20, padding: "12px 12px 12px", maxWidth: 380, margin: "0 auto", display: "flex", flexDirection: "column", gap: 10 }}>
            {/* Qué pide, y la estrella */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 17, fontWeight: 700, color: BLANCO }}>{enPrecio ? t("visor.aCuantoEstaba") : etiquetaDe[datos.campo]}</div>
                <div style={{ fontSize: 13, color: BLANCO_SUAVE }}>{datos.campo === "moq" ? t("visor.moqPista") : t("visor.delUltimoProducto")}</div>
              </div>
              <button type="button" onClick={onFavorito} aria-pressed={!!datos.favorito} aria-label={datos.favorito ? t("visor.quitarFavorito") : t("visor.marcarFavorito")} style={{ minWidth: alturas.tocable, height: alturas.tocable, padding: "0 12px", borderRadius: 12, border: `1px solid ${datos.favorito ? MARCA.naranja : "rgba(241,245,249,0.25)"}`, background: datos.favorito ? MARCA.naranja : "rgba(241,245,249,0.10)", color: BLANCO, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 600, fontFamily: "inherit", flexShrink: 0 }}><Icono nombre="favorito" tamano={18} color={BLANCO} />{t("visor.favorito")}</button>
            </div>
            {/* El número, grande */}
            <div style={{ fontSize: 34, fontWeight: 700, lineHeight: 1.1, fontVariantNumeric: "tabular-nums", color: valorActual ? "#22C55E" : "rgba(241,245,249,0.55)", padding: "0 2px" }}>{prefijo}{valorActual || "0"}{sufijo}</div>
            {/* Los cuatro datos, grandes, como pestañas */}
            <div role="tablist" aria-label={t("visor.otrosDatos")} style={{ display: campos.length > 1 ? "grid" : "none", gridTemplateColumns: `repeat(${campos.length}, 1fr)`, gap: 6 }}>
              {campos.map(([k, etiqueta]) => {
                const activo = k === datos.campo; const lleno = !!datos.valores[k];
                return <button key={k} type="button" role="tab" aria-selected={activo} onClick={() => onCampo?.(k)} style={{ minHeight: alturas.tocable, padding: "0 4px", borderRadius: 12, border: `1px solid ${activo ? MARCA.naranja : "rgba(241,245,249,0.22)"}`, background: activo ? MARCA.naranja : lleno ? "rgba(34,197,94,0.20)" : "rgba(241,245,249,0.08)", color: activo ? "#fff" : lleno ? "#86EFAC" : BLANCO_SUAVE, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", WebkitTapHighlightColor: "transparent" }}>{lleno && !activo ? `✓ ${etiqueta}` : etiqueta}</button>;
              })}
            </div>
            {/* Solo en MOQ: la base */}
            {datos.campo === "moq" && (
              <div role="radiogroup" aria-label={t("visor.campoMoq")} style={{ display: "flex", gap: 6 }}>
                {[["producto", t("visor.basePorProducto")], ["caja", t("visor.basePorCaja")], ["pedido", t("visor.basePorPedido")]].map(([b, etiqueta]) => (
                  <button key={b} type="button" role="radio" aria-checked={datos.moqBase === b} onClick={() => onMoqBase?.(b)} style={{ flex: 1, minHeight: alturas.tocable, borderRadius: 999, border: `1px solid ${datos.moqBase === b ? MARCA.naranja : "rgba(241,245,249,0.25)"}`, background: datos.moqBase === b ? "rgba(234,90,34,0.35)" : "transparent", color: BLANCO, fontSize: 14, fontWeight: datos.moqBase === b ? 700 : 500, cursor: "pointer", fontFamily: "inherit" }}>{etiqueta}</button>
                ))}
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
              {teclas.map(k => (
                <button key={k} type="button" onClick={() => onTeclaPrecio?.(k)} aria-label={k === "⌫" ? t("comun.borrar") : k} style={{ minHeight: 46, borderRadius: 12, border: "none", background: "rgba(241,245,249,0.12)", color: BLANCO, fontSize: 22, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", WebkitTapHighlightColor: "transparent" }}>{k}</button>
              ))}
            </div>
            {/* Último: el botón grande. Guarda lo que haya y cierra; si no hay nada, solo cierra. */}
            <button type="button" onClick={onConfirmarPrecio} style={{ width: "100%", minHeight: alturas.botonPrincipal, borderRadius: 14, border: "none", background: hayAlgo ? "#15803D" : "rgba(241,245,249,0.16)", color: BLANCO, fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{hayAlgo ? t("visor.guardarYSeguir") : t("visor.cerrarSinDatos")}</button>
          </div>
        );
      })()}

      {/* Abajo: miniatura · obturador · cerrar stand */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 3, padding: "24px 22px calc(22px + env(safe-area-inset-bottom, 0px))", display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(transparent, rgba(0,0,0,0.7))" }}>
        {/* Izquierda: última captura + "+ ángulo" (o Catálogo si no hay captura) */}
        <div style={{ width: 84, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          {esTarjeta ? (
            <button type="button" onClick={onVolverAProductos || onCancelar} style={{ minWidth: alturas.miniatura, height: alturas.miniatura, padding: "0 10px", borderRadius: 14, border: "none", background: "rgba(241,245,249,0.14)", color: BLANCO, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 }}><Icono nombre="camara" tamano={16} color={BLANCO} />{t("visor.productos")}</button>
          ) : ultimaCaptura || ultimas.length ? (
            <>
              <button type="button" onClick={() => setUltimasAbiertas(true)} aria-label={t("visor.ultimasFotos")} style={{ width: alturas.miniatura, height: alturas.miniatura, borderRadius: 12, border: "2px solid #fff", padding: 0, overflow: "hidden", background: "#111", cursor: "pointer", transform: miniaturaVuela && !reducido ? "scale(1.12)" : "scale(1)", transition: `transform ${duracion(movimiento.obturador.miniatura)}ms ${curvas.entra}` }}>
                <img src={ultimaCaptura || ultimas[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </button>
              {puedeAgregarAngulo && !esTarjeta && (
                <button type="button" onClick={onAgregarAngulo} style={{ minHeight: 40, padding: "0 14px", borderRadius: 999, border: "none", background: "rgba(10,14,23,0.7)", color: BLANCO, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}><Icono nombre="mas" tamano={16} color={BLANCO} />{t("visor.agregarAngulo")}</button>
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
          {esTarjeta && standAbierto ? null : esTarjeta ? (
            <button type="button" onClick={onSinTarjeta || onCancelar} style={{ minWidth: alturas.miniatura, height: alturas.miniatura, padding: "0 12px", borderRadius: 14, border: "none", background: "rgba(241,245,249,0.14)", color: BLANCO, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", lineHeight: 1.2 }}>{t("visor.sinTarjeta")}</button>
          ) : (
            <button type="button" onClick={standAbierto ? onStand : onCerrarStand} style={{ width: 84, height: alturas.miniatura, borderRadius: 14, border: "none", background: (standAbierto ? (itemsCount > 0 || standAbierto.tieneTarjeta) : itemsCount > 0) ? MARCA.naranja : "rgba(241,245,249,0.14)", color: "#fff", fontSize: 12, fontWeight: 700, lineHeight: 1.15, cursor: "pointer", fontFamily: "inherit", textAlign: "center", padding: "0 6px", whiteSpace: "normal" }}>{t("visor.cerrarStand")}</button>
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
