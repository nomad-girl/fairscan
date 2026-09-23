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
  onDisparar, onCatalogo, onCancelar, onVolverAProductos, onAgregarAngulo, onBorrarFoto,
  onEscribirDato, onListoDato, modoAngulo = false, avisoGuardado = null, campoGuardado = null, // la barra del pulgar y el modo "otra foto del mismo producto"
  standAbierto = null, onStand, onTarjeta, // el stand: { nombre, fotos, tieneTarjeta, leyendo }; la pastilla lo abre, Cerrar stand también
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

  // Cuando sube el teclado del iPhone, la barra se sube con él (el visor es fijo y quedaría tapada)
  const [alturaTeclado, setAlturaTeclado] = useState(0);
  const inputDatoRef = useRef(null);
  useEffect(() => {
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    if (!vv) return;
    const medir = () => setAlturaTeclado(Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)));
    vv.addEventListener("resize", medir); vv.addEventListener("scroll", medir);
    return () => { vv.removeEventListener("resize", medir); vv.removeEventListener("scroll", medir); };
  }, []);

  return (
    <div className="pantalla-fija" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} onClick={() => { if (datos && !esTarjeta) { inputDatoRef.current?.blur(); onConfirmarPrecio?.(); } }} style={{ position: "fixed", inset: 0, zIndex: 100, background: "#000", display: "flex", flexDirection: "column", color: BLANCO, fontFamily: "inherit", userSelect: "none" }}>
      <video ref={videoRef} autoPlay playsInline muted style={{ flex: 1, objectFit: "cover", width: "100%" }} />

      {/* Velo blanco del obturador (80 ms) */}
      <style>{`@keyframes fairscanGuardado { 0% { transform: scale(0.4); opacity: 0 } 35% { transform: scale(1.15); opacity: 1 } 55% { transform: scale(1) } 100% { transform: scale(1); opacity: 1 } }`}</style>
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
      {modoAngulo && !esTarjeta && (
        <div style={{ position: "absolute", top: "calc(env(safe-area-inset-top, 0px) + 56px)", left: 14, right: 14, zIndex: 3, display: "flex", justifyContent: "center" }}>
          <span style={{ background: MARCA.naranja, color: "#fff", borderRadius: 999, padding: "10px 16px", fontSize: 14, fontWeight: 600, textAlign: "center" }}>{t("visor.otraFotoMismo")}</span>
        </div>
      )}
      {standAbierto && !esTarjeta && !modoAngulo && (() => {
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

      {/* La barra del pulgar (wireframe del 23/09, opción A): después de la foto, una fila arriba de la miniatura con
          el dato que se está cargando y la estrella; se escribe con el teclado del iPhone y Listo guarda. Lo cargado
          queda con tilde; lo que falta, como chips, de a uno. Nunca cuatro campos a la vista. */}
      {datos && !esTarjeta && (() => {
        const campos = [["price", t("visor.campoPrecio")], ["moq", t("visor.campoMoq")], ["piezasPorCaja", t("visor.campoPiezasCorto")], ["cbmPorCaja", t("visor.campoCbmCorto")]].filter(([k]) => k === "price" || datosActivos?.[k] !== false);
        const etiquetaDe = Object.fromEntries(campos);
        const campo = datos.campo;
        const valor = datos.valores[campo] || "";
        const listos = datos.listos || {};
        const hecho = (k) => !!listos[k] || (!!datos.valores[k] && k !== campo);
        const mostrarChips = campos.length > 1; // siempre a la vista (boceto de Nati, 23/09): se sabe qué se puede cargar; precio por defecto
        const elegir = (k) => { inputDatoRef.current?.focus(); onCampo?.(k); };
        const abajo = alturaTeclado > 0 ? `calc(${alturaTeclado + 10}px)` : `calc(150px + env(safe-area-inset-bottom, 0px))`;
        const cerrarBarra = () => { inputDatoRef.current?.blur(); onConfirmarPrecio?.(); };
        let y0 = null;
        const alTocar = e => { y0 = e.touches?.[0]?.clientY ?? null; };
        const alSoltar = e => { const y1 = e.changedTouches?.[0]?.clientY; if (y0 !== null && y1 !== undefined && y1 - y0 > 40) cerrarBarra(); y0 = null; };
        return (
          <div onClick={e => e.stopPropagation()} onTouchStart={alTocar} onTouchEnd={alSoltar} role="dialog" aria-label={t("visor.datosDelUltimo")} style={{ position: "absolute", left: 12, right: 12, bottom: abajo, zIndex: 5, background: "rgba(255,255,255,0.97)", color: "#0F172A", borderRadius: 16, padding: "8px 10px", display: "flex", flexDirection: "column", gap: 6, boxShadow: "0 10px 30px -12px rgba(0,0,0,0.45)" }}>
            <div aria-label={t("visor.agarradera")} style={{ width: 36, height: 4, borderRadius: 2, background: "#CBD5E1", margin: "-2px auto 0" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <label style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 8, minHeight: 44, background: campoGuardado === campo ? "#DCFCE7" : "#F1F5F9", borderRadius: 12, padding: "0 12px", transition: "background 250ms ease" }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#64748B", whiteSpace: "nowrap" }}>{campo === "price" ? moneda : etiquetaDe[campo]}</span>
                <input ref={inputDatoRef} type="text" inputMode="decimal" enterKeyHint="done" value={valor} placeholder={campo === "price" ? t("visor.aCuanto") : ""} aria-label={campo === "price" ? t("visor.aCuantoEstaba") : etiquetaDe[campo]}
                  onChange={e => onEscribirDato?.(campo, e.target.value.replace(/,/g, ".").replace(/[^0-9.]/g, "").slice(0, 8))}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); } }}
                  style={{ flex: 1, minWidth: 0, border: "none", background: "transparent", fontSize: 18, fontWeight: 700, color: "#0F172A", fontFamily: "inherit", outline: "none", fontVariantNumeric: "tabular-nums" }} />
                {campo === "cbmPorCaja" && <span style={{ fontSize: 12, color: "#64748B" }}>CBM</span>}
                {campoGuardado === campo && <span role="status" aria-label={t("visor.guardado")} style={{ display: "grid", placeItems: "center", width: 22, height: 22, borderRadius: 11, background: "#15803D", animation: "fairscanGuardado 1.2s ease-out both" }}><Icono nombre="listo" tamano={14} color="#fff" /></span>}
              </label>
              <button type="button" onClick={cerrarBarra} aria-label={t("visor.cerrarBarra")} style={{ width: 36, height: 44, border: "none", background: "transparent", display: "grid", placeItems: "center", cursor: "pointer", padding: 0, order: 3 }}><Icono nombre="cerrar" tamano={20} color="#94A3B8" /></button>
              {(
                <button type="button" onClick={onFavorito} aria-pressed={!!datos.favorito} aria-label={datos.favorito ? t("visor.quitarFavorito") : t("visor.marcarFavorito")} style={{ width: 44, height: 44, borderRadius: 12, border: `1px solid ${datos.favorito ? MARCA.naranja : "#DCE3EC"}`, background: datos.favorito ? "rgba(234,90,34,0.12)" : "#FFFFFF", display: "grid", placeItems: "center", cursor: "pointer" }}>
                  <Icono nombre="favorito" tamano={20} color={datos.favorito ? MARCA.naranja : "#475569"} />
                </button>
              )}
            </div>
            {campo === "moq" && (
              <div role="radiogroup" aria-label={t("visor.campoMoq")} style={{ display: "flex", gap: 2, padding: 3, borderRadius: 10, background: "#E5E7EB" }}>
                {[["producto", t("visor.basePorProducto")], ["caja", t("visor.basePorCaja")], ["pedido", t("visor.basePorPedido")]].map(([b, etiqueta]) => (
                  <button key={b} type="button" role="radio" aria-checked={datos.moqBase === b} onClick={() => onMoqBase?.(b)} style={{ flex: 1, minHeight: 30, borderRadius: 8, border: "none", background: datos.moqBase === b ? "#FFFFFF" : "transparent", boxShadow: datos.moqBase === b ? "0 1px 3px rgba(0,0,0,0.15)" : "none", color: datos.moqBase === b ? "#0F172A" : "#64748B", fontSize: 12, fontWeight: datos.moqBase === b ? 700 : 500, cursor: "pointer", fontFamily: "inherit" }}>{etiqueta}</button>
                ))}
              </div>
            )}
            {mostrarChips && (
              <div role="tablist" aria-label={t("visor.otrosDatos")} style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {campos.filter(([k]) => k !== campo).map(([k, etiqueta]) => {
                  const activo = false; const ok = hecho(k);
                  return <button key={k} type="button" role="tab" aria-selected={activo} onClick={() => elegir(k)} style={{ minHeight: 34, padding: "0 12px", borderRadius: 999, border: `1px solid ${activo ? MARCA.naranja : "#DCE3EC"}`, background: activo ? MARCA.naranja : "#FFFFFF", color: activo ? "#fff" : "#475569", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>{etiqueta}{ok && !activo && <span aria-hidden style={{ display: "inline-block", width: 6, height: 6, borderRadius: 3, background: "#15803D", marginLeft: 6, verticalAlign: "middle" }} />}</button>;
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* Abajo: miniatura · obturador · cerrar stand */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 3, padding: "24px 22px calc(22px + env(safe-area-inset-bottom, 0px))", display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(transparent, rgba(0,0,0,0.7))" }}>
        {/* Izquierda: última captura + "+ ángulo" (o Catálogo si no hay captura) */}
        <div style={{ width: 84, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, position: "relative" }}>
          {esTarjeta ? (
            <button type="button" onClick={onVolverAProductos || onCancelar} style={{ minWidth: alturas.miniatura, height: alturas.miniatura, padding: "0 10px", borderRadius: 14, border: "none", background: "rgba(241,245,249,0.14)", color: BLANCO, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 }}><Icono nombre="camara" tamano={16} color={BLANCO} />{t("visor.productos")}</button>
          ) : ultimaCaptura || ultimas.length ? (
            <>
              <button type="button" onClick={() => setUltimasAbiertas(true)} aria-label={t("visor.ultimasFotos")} style={{ width: alturas.miniatura, height: alturas.miniatura, borderRadius: 12, border: modoAngulo ? `2px solid ${MARCA.naranja}` : "2px solid #fff", padding: 0, overflow: "hidden", background: "#111", cursor: "pointer", transform: miniaturaVuela && !reducido ? "scale(1.12)" : "scale(1)", transition: `transform ${duracion(movimiento.obturador.miniatura)}ms ${curvas.entra}` }}>
                <img src={ultimaCaptura || ultimas[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </button>
              {puedeAgregarAngulo && !esTarjeta && !modoAngulo && (
                <button type="button" onClick={onAgregarAngulo} aria-label={t("visor.agregarAngulo")} style={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)", minHeight: 24, padding: "0 8px", borderRadius: 999, border: "1.5px solid #fff", background: MARCA.naranja, color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit" }}>{t("visor.otraFoto")}</button>
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
          {esTarjeta ? null : (
            <button type="button" onClick={onStand} style={{ width: 84, height: alturas.miniatura, borderRadius: 14, border: "none", background: (itemsCount > 0 || standAbierto?.tieneTarjeta) ? MARCA.naranja : "rgba(241,245,249,0.14)", color: "#fff", fontSize: 12, fontWeight: 700, lineHeight: 1.15, cursor: "pointer", fontFamily: "inherit", textAlign: "center", padding: "0 6px", whiteSpace: "normal" }}>{t("visor.cerrarStand")}</button>
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
