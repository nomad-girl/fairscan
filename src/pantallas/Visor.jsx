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
  onEscribirDato, onListoDato, modoAngulo = false, avisoGuardado = null, campoGuardado = null,
  onAgregarFotoA, onPrecioDe, onListoStand, onCambiarPrecioDe, // la hoja "Este stand": por producto, otra foto, precio, borrar; y cerrar el stand // la barra del pulgar y el modo "otra foto del mismo producto"
  standAbierto = null, onStand, onTarjeta, // el stand: { nombre, fotos, tieneTarjeta, leyendo }; la pastilla lo abre, Cerrar stand también
  consejoVisible = false, onConsejoVisto,
  avisoRetomado = null, // "Seguís en el stand de …" cuando la app retomó sola un stand abierto (22/10)
  onTouchStart, onTouchEnd,
}) {
  const { t } = useTranslation();
  const { alturas, movimiento, curvas, duracion, reducido } = useSistema();
  const [presionado, setPresionado] = useState(false);
  const [videoListo, setVideoListo] = useState(false);
  // 22/10 (Nati): la miniatura vuelve a abrir "Este stand" (los últimos productos con precio rápido, otra foto, borrar),
  // y desde ahí se va al catálogo. Sin fotos en el stand, la miniatura abre el catálogo directo.
  const [ultimasAbiertas, setUltimasAbiertas] = useState(false);
  const [precioEditando, setPrecioEditando] = useState(null);
  const [precioGuardado, setPrecioGuardado] = useState(null);
  const precioGuardadoTimer = useRef(null);
  const [miniaturaVuela, setMiniaturaVuela] = useState(false);
  const consejoTimer = useRef(null);

  // La miniatura "vuela" al contador en cada disparo (movimiento 2).
  useEffect(() => {
    if (!ultimaCaptura) return;
    setMiniaturaVuela(true);
    const id = setTimeout(() => setMiniaturaVuela(false), duracion(movimiento.obturador.miniatura));
    return () => clearTimeout(id);
  }, [ultimaCaptura]);

  // La guía de la primera vez (28/09, Nati: "¿se entiende que el obturador saca un producto y que la tarjeta es otra
  // acción?"): dos frases sobre la cámara, sin imponer orden (cada una hace como prefiere). Se va con el primer disparo,
  // al ir a la tarjeta o al tocarla, y no vuelve.
  const [guiaVisible, setGuiaVisible] = useState(() => { try { return !localStorage.getItem("fairscan.guiaCamaraVista"); } catch { return false; } });
  const marcarGuiaVista = () => { if (!guiaVisible) return; setGuiaVisible(false); try { localStorage.setItem("fairscan.guiaCamaraVista", "1"); } catch { /* modo privado */ } };

  // El consejo se va solo y no vuelve.
  useEffect(() => {
    if (!consejoVisible) return;
    consejoTimer.current = setTimeout(() => onConsejoVisto?.(), 6000);
    return () => clearTimeout(consejoTimer.current);
  }, [consejoVisible]);

  const esTarjeta = modo === "card";
  const barraX = useRef(null);
  const cambiarModo = (m) => { marcarGuiaVista(); if (m === "card" && !esTarjeta) onTarjeta?.(); if (m === "product" && esTarjeta) onVolverAProductos?.(); };
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
    <div className="pantalla-fija" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} onClick={() => { if (datos && !esTarjeta) { inputDatoRef.current?.blur(); onConfirmarPrecio?.(); } }} style={{ position: "fixed", inset: 0, zIndex: 100, background: "#2B1206", display: "flex", flexDirection: "column", color: BLANCO, fontFamily: "inherit", userSelect: "none" }}>
      {/* 22/10 (Android): el WebView de Samsung dibuja un ícono de "play" gris sobre un <video> sin señal; hasta que
          la cámara realmente emite, el video queda invisible sobre el fondo oscuro. */}
      <video ref={videoRef} autoPlay playsInline muted disablePictureInPicture controls={false} onPlaying={() => setVideoListo(true)} onEmptied={() => setVideoListo(false)}
        style={{ flex: 1, objectFit: "cover", width: "100%", opacity: videoListo ? 1 : 0, transition: "opacity 160ms" }} />

      {/* Velo blanco del obturador (80 ms) */}
      <style>{`@keyframes fairscanGuardado { 0% { transform: scale(0.4); opacity: 0 } 35% { transform: scale(1.15); opacity: 1 } 55% { transform: scale(1) } 100% { transform: scale(1); opacity: 1 } }`}</style>
      <div aria-hidden style={{ position: "absolute", inset: 0, background: "#fff", opacity: flash ? 0.75 : 0, pointerEvents: "none", zIndex: 2, transition: `opacity ${duracion(movimiento.obturador.velo)}ms linear` }} />
      {guiaVisible && !esTarjeta && !modoAngulo && (
        <div role="note" aria-label={t("visor.guiaTitulo")} onClick={marcarGuiaVista} style={{ position: "absolute", inset: 0, zIndex: 4 }}>
          {/* Una sola guía, arriba de la pastilla y del obturador (los dos quedaron abajo, al alcance del pulgar) */}
          <div style={{ position: "absolute", bottom: "calc(env(safe-area-inset-bottom, 0px) + 216px)", left: 24, right: 24, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, pointerEvents: "none" }}>
            <span style={{ background: "rgba(255,255,255,0.96)", color: "#0F172A", borderRadius: 14, padding: "10px 14px", fontSize: 14, fontWeight: 600, textAlign: "center", lineHeight: 1.35, maxWidth: 300, boxShadow: "0 10px 30px -12px rgba(0,0,0,0.5)" }}>{t("visor.guiaUnica")}</span>
            <span style={{ fontSize: 22, color: BLANCO, lineHeight: 1 }}>↓</span>
          </div>
        </div>
      )}

      {/* Arriba: saldo y estado. Nada más. */}
      <div style={{ position: "absolute", top: "calc(env(safe-area-inset-top, 0px) + 12px)", left: 14, right: 14, zIndex: 3, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center", minWidth: 0 }}>
          {feria && <button type="button" onClick={() => { marcarGuiaVista(); onCatalogo?.(); }} aria-label={t("visor.irAlCatalogo")} style={{ maxWidth: "46vw", minHeight: 32, padding: "0 12px", borderRadius: 999, border: "none", background: VIDRIO, backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", color: BLANCO, fontSize: 12, fontWeight: 600, fontFamily: "inherit", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "pointer" }}>{feria}</button>}
          {/* El saldo solo cuando está por acabarse; la nube no se muestra: en la cámara distrae (Nati, 22/09) */}
          {textoSaldo && saldoBajo && !esTarjeta && <Pastilla tono="alerta">{textoSaldo}</Pastilla>}
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {/* Opción C (Nati, 22/10): el stand abierto vive arriba a la derecha; tocarlo abre la hoja del stand.
              La tarjeta ya no es una pastilla sobre el obturador: es un modo del obturador. */}
          {standAbierto && !modoAngulo && (standAbierto.fotos > 0 || standAbierto.tieneTarjeta || standAbierto.leyendo) && (() => {
            const n = standAbierto.fotos || 0; const conNombre = !!standAbierto.nombre;
            const texto = standAbierto.leyendo ? t("visor.leyendoTarjeta")
              : conNombre ? t("visor.standConNombre", { nombre: standAbierto.nombre, count: n })
              : standAbierto.tieneTarjeta ? (n === 0 ? t("visor.standTarjetaSinLeer_zero") : t("visor.standTarjetaSinLeer", { count: n }))
              : t("visor.standSinTarjeta", { count: n });
            return (
              <button type="button" onClick={() => onStand?.()} aria-label={t("visor.abrirStand")} style={{ maxWidth: "56vw", minHeight: 32, padding: "0 12px 0 10px", borderRadius: 999, border: "none", background: VIDRIO, backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", color: BLANCO, fontSize: 12, fontWeight: 600, fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                <Icono nombre={conNombre ? "proveedor" : "camara"} tamano={14} color={MARCA.sello} /><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{texto}</span>
              </button>
            );
          })()}
          {estadoSync === "falla" && <Pastilla><span aria-hidden style={{ width: 8, height: 8, borderRadius: 4, background: colorPunto, display: "inline-block" }} /><span style={{ fontSize: 12, fontWeight: 500, color: BLANCO_SUAVE }}>{textoSync}</span></Pastilla>}
          {/* 27/09: el botón de Catálogo pasó abajo, junto al obturador, grande y con nombre */}
          {false && <button type="button" onClick={onCatalogo} aria-label={t("visor.irAlCatalogo")} style={{ minHeight: 40, padding: "0 14px 0 12px", borderRadius: 999, border: "none", background: "rgba(43,18,6,0.55)", color: BLANCO, fontSize: 14, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", fontFamily: "inherit", backdropFilter: "blur(8px)" }}><Icono nombre="foto" tamano={18} color={BLANCO} />{t("visor.catalogo")}</button>}
        </div>
      </div>

      {/* Stand abierto: la pastilla dice qué hacer ahora. Sin tarjeta invita a escanearla (eso empieza el
          stand); con tarjeta dice la empresa y abre el stand. Nati, 21/09: "la tarjeta es sinónimo de nuevo stand". */}
      {modoAngulo && !esTarjeta && (
        <div style={{ position: "absolute", top: "calc(env(safe-area-inset-top, 0px) + 68px)", left: 14, right: 14, zIndex: 3, display: "flex", justifyContent: "center" }}>
          <span style={{ background: "rgba(43,18,6,0.7)", color: "#fff", borderRadius: 999, padding: "12px 18px", fontSize: 15, fontWeight: 600, textAlign: "center", backdropFilter: "blur(8px)" }}>{t("visor.otraFotoMismo")}</span>
        </div>
      )}

      {/* Modo tarjeta: guía */}
      {esTarjeta && (
        <>
          <div style={{ position: "absolute", top: "calc(env(safe-area-inset-top, 0px) + 64px)", left: 24, right: 24, zIndex: 3, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, textAlign: "center" }}>
            <span style={{ fontFamily: "'Bricolage Grotesque', inherit", fontWeight: 800, fontSize: 22, letterSpacing: "-0.02em", color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>{t("visor.encuadraTitulo")}</span>
            <span style={{ fontSize: 13, color: BLANCO_SUAVE, textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}>{t("visor.encuadraSub")}</span>
          </div>
          <div aria-hidden style={{ position: "absolute", left: "8%", right: "8%", top: "30%", aspectRatio: "1.75", border: `2px dashed ${MARCA.sello}`, borderRadius: 14, zIndex: 3, pointerEvents: "none" }} />
          <div style={{ position: "absolute", left: 14, right: 14, top: "calc(30% + 48vw + 18px)", zIndex: 3, display: "flex", justifyContent: "center" }}>
            <Pastilla><Icono nombre="camara" tamano={14} color={BLANCO} />{t("visor.seguisDespues")}</Pastilla>
          </div>
        </>
      )}

      {avisoRetomado && !esTarjeta && (
        <div style={{ position: "absolute", top: "calc(env(safe-area-inset-top, 0px) + 60px)", left: 14, right: 14, zIndex: 3, display: "flex", justifyContent: "center" }}>
          <button type="button" onClick={() => onStand?.()} style={{ display: "inline-flex", alignItems: "center", gap: 8, minHeight: 36, padding: "0 14px", borderRadius: 999, border: "none", background: MARCA.sello, color: MARCA.cacao, fontSize: 13, fontWeight: 700, fontFamily: "inherit", cursor: "pointer" }}>
            {avisoRetomado}<span style={{ fontWeight: 600, textDecoration: "underline", textUnderlineOffset: 3 }}>{t("visor.empezarOtro")}</span>
          </button>
        </div>
      )}

      {/* Consejo en contexto (una vez en la vida) */}
      {consejoVisible && !esTarjeta && (
        <div role="status" onClick={onConsejoVisto} style={{ position: "absolute", left: 14, right: 14, bottom: 216, zIndex: 4, background: "rgba(43,18,6,0.86)", backdropFilter: "blur(10px)", borderRadius: 14, padding: "12px 14px", textAlign: "center", fontSize: 14, lineHeight: 1.4, color: BLANCO, cursor: "pointer" }}>
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
        const abajo = alturaTeclado > 0 ? `calc(${alturaTeclado + 10}px)` : `calc(196px + env(safe-area-inset-bottom, 0px))`;
        const cerrarBarra = () => { inputDatoRef.current?.blur(); onConfirmarPrecio?.(); };
        let y0 = null;
        const alTocar = e => { y0 = e.touches?.[0]?.clientY ?? null; };
        const alSoltar = e => { const y1 = e.changedTouches?.[0]?.clientY; if (y0 !== null && y1 !== undefined && y1 - y0 > 40) cerrarBarra(); y0 = null; };
        return (
          <div onClick={e => e.stopPropagation()} onTouchStart={alTocar} onTouchEnd={alSoltar} role="dialog" aria-label={t("visor.datosDelUltimo")} style={{ position: "absolute", left: 12, right: 12, bottom: abajo, zIndex: 5, background: "rgba(43,18,6,0.88)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", color: BLANCO, borderRadius: 16, padding: "8px 10px", display: "flex", flexDirection: "column", gap: 6, boxShadow: "0 10px 30px -12px rgba(0,0,0,0.45)" }}>
            <div aria-label={t("visor.agarradera")} style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,243,234,0.35)", margin: "-2px auto 0" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <label style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 8, minHeight: 44, background: campoGuardado === campo ? "rgba(34,197,94,0.25)" : "rgba(255,243,234,0.12)", borderRadius: 12, padding: "0 12px", transition: "background 250ms ease" }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: BLANCO_SUAVE, whiteSpace: "nowrap" }}>{campo === "price" ? moneda : etiquetaDe[campo]}</span>
                <input ref={inputDatoRef} type="text" inputMode="decimal" enterKeyHint="done" value={valor} placeholder={campo === "price" ? t("visor.aCuanto") : ""} aria-label={campo === "price" ? t("visor.aCuantoEstaba") : etiquetaDe[campo]}
                  onChange={e => onEscribirDato?.(campo, e.target.value.replace(/,/g, ".").replace(/[^0-9.]/g, "").slice(0, 8))}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); } }}
                  style={{ flex: 1, minWidth: 0, border: "none", background: "transparent", fontSize: 18, fontWeight: 700, color: "#fff", fontFamily: "inherit", outline: "none", fontVariantNumeric: "tabular-nums" }} />
                {campo === "cbmPorCaja" && <span style={{ fontSize: 12, color: BLANCO_SUAVE }}>CBM</span>}
                {campoGuardado === campo && <span role="status" aria-label={t("visor.guardado")} style={{ display: "grid", placeItems: "center", width: 22, height: 22, borderRadius: 11, background: "#86EFAC", animation: "fairscanGuardado 1.2s ease-out both" }}><Icono nombre="listo" tamano={14} color="#fff" /></span>}
              </label>
              <button type="button" onClick={cerrarBarra} aria-label={t("visor.cerrarBarra")} style={{ width: 36, height: 44, border: "none", background: "transparent", display: "grid", placeItems: "center", cursor: "pointer", padding: 0, order: 3 }}><Icono nombre="cerrar" tamano={20} color="#94A3B8" /></button>
              {(
                <button type="button" onClick={onFavorito} aria-pressed={!!datos.favorito} aria-label={datos.favorito ? t("visor.quitarFavorito") : t("visor.marcarFavorito")} style={{ width: 44, height: 44, borderRadius: 12, border: `1px solid ${datos.favorito ? MARCA.sello : "rgba(255,243,234,0.35)"}`, background: datos.favorito ? "rgba(255,197,61,0.22)" : "rgba(255,243,234,0.12)", display: "grid", placeItems: "center", cursor: "pointer" }}>
                  <Icono nombre="favorito" tamano={20} color={datos.favorito ? MARCA.cacao : BLANCO_SUAVE} relleno={datos.favorito ? MARCA.sello : undefined} />
                </button>
              )}
            </div>
            {campo === "moq" && (
              <div role="radiogroup" aria-label={t("visor.campoMoq")} style={{ display: "flex", gap: 2, padding: 3, borderRadius: 10, background: "rgba(255,243,234,0.12)" }}>
                {[["producto", t("visor.basePorProducto")], ["caja", t("visor.basePorCaja")], ["pedido", t("visor.basePorPedido")]].map(([b, etiqueta]) => (
                  <button key={b} type="button" role="radio" aria-checked={datos.moqBase === b} onClick={() => onMoqBase?.(b)} style={{ flex: 1, minHeight: 30, borderRadius: 8, border: "none", background: datos.moqBase === b ? MARCA.sello : "transparent", boxShadow: "none", color: datos.moqBase === b ? MARCA.cacao : BLANCO_SUAVE, fontSize: 12, fontWeight: datos.moqBase === b ? 700 : 500, cursor: "pointer", fontFamily: "inherit" }}>{etiqueta}</button>
                ))}
              </div>
            )}
            {mostrarChips && (
              <div role="tablist" aria-label={t("visor.otrosDatos")} style={{ display: "flex", gap: 14, flexWrap: "wrap", padding: "0 4px" }}>
                {/* Texto plano, tipo pestañas (Nati, 23/09: "que no sea todo formato pastilla, eso genera ruido"):
                    la activa en negrita con una raya naranja; un puntito verde en las que ya tienen dato */}
                {campos.map(([k, etiqueta]) => {
                  const activo = k === campo; const ok = hecho(k);
                  return <button key={k} type="button" role="tab" aria-selected={activo} onClick={() => elegir(k)} style={{ minHeight: 32, padding: "0 4px 4px", border: "none", borderBottom: `2px solid ${activo ? MARCA.sello : "transparent"}`, background: "transparent", color: activo ? "#fff" : BLANCO_SUAVE, fontSize: 13, fontWeight: activo ? 700 : 500, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 5 }}>{etiqueta}{ok && !activo && <span aria-hidden style={{ display: "inline-block", width: 6, height: 6, borderRadius: 3, background: "#86EFAC" }} />}</button>;
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* Abajo (opción C, Nati 22/10): Catálogo con la última foto adentro · un solo obturador con el selector
          PRODUCTO · TARJETA arriba y una frase abajo que dice qué hace ahora · nada a la derecha. Deslizar sobre la
          barra también cambia de modo, como en la cámara del teléfono. */}
      <div onTouchStart={e => { barraX.current = e.touches?.[0]?.clientX ?? null; }} onTouchEnd={e => { const x1 = e.changedTouches?.[0]?.clientX; if (barraX.current === null || x1 === undefined) return; const dx = x1 - barraX.current; barraX.current = null; if (Math.abs(dx) < 50) return; e.stopPropagation(); if (dx < 0 && !esTarjeta) cambiarModo("card"); if (dx > 0 && esTarjeta) cambiarModo("product"); }}
        style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 3, padding: "18px 18px calc(20px + env(safe-area-inset-bottom, 0px))", display: "flex", alignItems: "flex-end", justifyContent: "space-between", background: "linear-gradient(180deg, rgba(43,18,6,0) 0%, rgba(43,18,6,0.55) 100%)" }}>
        <div style={{ width: 88, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, position: "relative" }}>
          <div style={{ position: "relative", width: alturas.miniatura, height: alturas.miniatura }}>
            <button type="button" onClick={() => { marcarGuiaVista(); if (itemsCount > 0 && ultimas.length) setUltimasAbiertas(true); else onCatalogo?.(); }} aria-label={itemsCount > 0 && ultimas.length ? t("visor.ultimasFotos") : t("visor.irAlCatalogo")} style={{ width: alturas.miniatura, height: alturas.miniatura, borderRadius: 14, border: "2px solid rgba(255,255,255,0.8)", background: "rgba(241,245,249,0.14)", padding: 0, overflow: "hidden", cursor: "pointer", display: "block", position: "relative" }}>
              {(ultimaCaptura || ultimas[0]?.foto)
                ? <img src={ultimaCaptura || ultimas[0]?.foto} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block", transform: miniaturaVuela && !reducido ? "scale(0.9)" : "none", transition: `transform ${duracion(movimiento.obturador.miniatura)}ms ${curvas.salida}` }} />
                : <span style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}><Icono nombre="foto" tamano={22} color={BLANCO} /></span>}
            </button>
            {itemsCount > 0 && <span aria-label={t("visor.enEsteStand", { count: itemsCount })} style={{ position: "absolute", right: -9, top: -9, minWidth: 24, height: 24, padding: "0 7px", borderRadius: 12, background: MARCA.sello, color: MARCA.cacao, fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", fontVariantNumeric: "tabular-nums", boxShadow: "0 1px 3px rgba(0,0,0,0.35)", pointerEvents: "none" }}>{itemsCount}</span>}
          </div>
          <span aria-hidden style={{ fontSize: 11, fontWeight: 700, color: BLANCO, letterSpacing: "0.05em", textShadow: "0 1px 3px rgba(0,0,0,0.6)", whiteSpace: "nowrap" }}>{(itemsCount > 0 && ultimas.length ? t("visor.ultimasFotos") : t("visor.catalogo")).toUpperCase()}</span>
          {puedeAgregarAngulo && !esTarjeta && !modoAngulo && (
            <button type="button" onClick={onAgregarAngulo} aria-label={t("visor.agregarAngulo")} style={{ position: "absolute", top: -34, left: "50%", transform: "translateX(-50%)", minHeight: 24, padding: "0 8px", borderRadius: 12, border: "none", background: MARCA.sello, color: MARCA.cacao, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap", cursor: "pointer", fontFamily: "inherit" }}>{t("visor.masAngulo")}</button>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <div role="tablist" aria-label={t("visor.queEscanear")} style={{ display: "flex", gap: 22, visibility: datos && !esTarjeta ? "hidden" : "visible" }}>
            {[["product", t("visor.modoProducto")], ["card", t("visor.modoTarjeta")]].map(([m, etiqueta]) => { const activo = (m === "card") === esTarjeta; return (
              <button key={m} type="button" role="tab" aria-selected={activo} onClick={() => cambiarModo(m)} style={{ minHeight: 28, padding: "0 2px 4px", border: "none", borderBottom: `2px solid ${activo ? MARCA.sello : "transparent"}`, background: "transparent", color: activo ? MARCA.sello : BLANCO_SUAVE, fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", fontFamily: "inherit", cursor: "pointer", textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}>{etiqueta}</button>
            ); })}
          </div>
          <button
            type="button"
            onClick={() => { marcarGuiaVista(); onDisparar?.(); }}
            onPointerDown={() => setPresionado(true)}
            onPointerUp={() => setPresionado(false)}
            onPointerLeave={() => setPresionado(false)}
            aria-label={esTarjeta ? t("visor.escaneaTarjeta") : t("visor.disparar")}
            style={{ position: "relative", width: alturas.obturador, height: alturas.obturador, borderRadius: "50%", border: "5px solid #fff", background: esTarjeta ? MARCA.sello : MARCA.naranja, boxShadow: "0 0 0 3px rgba(43,18,6,0.35)", cursor: "pointer", transform: presionado && !reducido ? "scale(0.92)" : "scale(1)", transition: `transform ${duracion(movimiento.obturador.presion)}ms ${curvas.salida}, background 200ms` }}
          />
          <span aria-hidden style={{ fontSize: 12, fontWeight: 600, color: BLANCO, textShadow: "0 1px 3px rgba(0,0,0,0.6)", whiteSpace: "nowrap" }}>{esTarjeta ? t("visor.escaneaTarjeta") : t("visor.escaneaProducto")}</span>
        </div>

        <div style={{ width: 88 }} />
      </div>

      {/* Este stand (Nati, 23/09): los últimos productos, y por cada uno otra foto, precio o borrar; abajo, cerrar el stand */}
      <Hoja abierta={ultimasAbiertas} onCerrar={() => setUltimasAbiertas(false)} titulo={standAbierto?.nombre ? `${standAbierto.nombre} · ${t("cantidades.fotos", { count: itemsCount })}` : t("visor.ultimasFotos")} altura="completa">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {ultimas.map((u, i) => (
            <div key={u.id ?? i} style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <img src={u.foto} alt="" style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 12, display: "block", flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                {precioEditando === u.id ? (
                  <label style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 40, background: precioGuardado === u.id ? "#DCFCE7" : "#F1F5F9", borderRadius: 10, padding: "0 10px", transition: "background 250ms ease" }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#64748B" }}>{moneda}</span>
                    <input autoFocus type="text" inputMode="decimal" enterKeyHint="done" defaultValue={u.precio || ""} aria-label={t("visor.aCuantoEstaba")}
                      onChange={e => { const v = e.target.value.replace(/,/g, ".").replace(/[^0-9.]/g, "").slice(0, 8); e.target.value = v; onCambiarPrecioDe?.(u.id, v); clearTimeout(precioGuardadoTimer.current); precioGuardadoTimer.current = setTimeout(() => { setPrecioGuardado(u.id); setTimeout(() => setPrecioGuardado(null), 1200); }, 450); }}
                      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); setPrecioEditando(null); } }}
                      onBlur={() => setPrecioEditando(null)}
                      style={{ flex: 1, minWidth: 0, border: "none", background: "transparent", fontSize: 17, fontWeight: 700, color: "#0F172A", fontFamily: "inherit", outline: "none" }} />
                    {precioGuardado === u.id && <Icono nombre="listo" tamano={16} color="#15803D" />}
                  </label>
                ) : (
                  <span style={{ fontSize: 14, fontWeight: 600, color: u.precio ? "#0F172A" : "#64748B" }}>{u.precio ? `${moneda} ${u.precio}` : t("visor.sinPrecioCorto")}{u.fotos > 1 ? <span style={{ fontWeight: 400, color: "#64748B" }}> · {t("cantidades.fotos", { count: u.fotos })}</span> : null}</span>
                )}
                <div style={{ display: "flex", gap: 6 }}>
                  <Boton variante="secundario" icono="camara" onClick={() => { setUltimasAbiertas(false); onAgregarFotoA?.(u.id); }}>{t("visor.masFoto")}</Boton>
                  <Boton variante="secundario" onClick={() => setPrecioEditando(u.id)}>{t("visor.precio")}</Boton>
                  <Boton variante="fantasma" icono="borrar" etiqueta={t("visor.borrarFoto")} onClick={() => { onBorrarFoto?.(u.id); if (ultimas.length <= 1) setUltimasAbiertas(false); }} />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
          {onListoStand && <Boton variante="principal" ancho="total" icono="listo" onClick={() => { setUltimasAbiertas(false); onListoStand(); }}>{t("visor.listoStand")}</Boton>}
          <div style={{ display: "flex", gap: 8 }}>
            <Boton variante="secundario" ancho="total" icono="proveedor" onClick={() => { setUltimasAbiertas(false); onStand?.(); }} estilo={{ flex: 1 }}>{t("visor.verProveedor")}</Boton>
            <Boton variante="secundario" ancho="total" icono="foto" onClick={() => { setUltimasAbiertas(false); onCatalogo?.(); }} estilo={{ flex: 1 }}>{t("visor.irAlCatalogo")}</Boton>
          </div>
        </div>
      </Hoja>
    </div>
  );
}
