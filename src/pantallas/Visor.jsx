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
import { Icono, Hoja, Boton, TecladoDatos, PistaGesto } from "../componentes/index.js";
import { anotar } from "../lib/primerUso.js";
import { MARCA } from "../sistema/tokens.js";
import { TARJETA_EJEMPLO } from "../lib/ensayo.js";

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

/** El globo blanco del primer uso (wireframes del 27/10): una indicación arriba del obturador, con lo que haga falta adentro. */
function Globo({ titulo, texto, children, pico = true, abajo = 168 }) {
  return (
    <div role="status" onClick={e => e.stopPropagation()} style={{ position: "absolute", left: 14, right: 14, bottom: `calc(env(safe-area-inset-bottom, 0px) + ${abajo}px)`, zIndex: 6, background: "#fff", color: MARCA.cacao, borderRadius: 18, padding: "14px 16px", boxShadow: "0 8px 24px -10px rgba(0,0,0,0.5)" }}>
      <p style={{ margin: 0, fontSize: 20, fontWeight: 700, lineHeight: 1.25 }}>{titulo}</p>
      {texto && <p style={{ margin: "4px 0 0", fontSize: 15, lineHeight: 1.45, color: "#5A3522" }}>{texto}</p>}
      {children}
      {pico && <span aria-hidden style={{ position: "absolute", left: "50%", bottom: -8, width: 16, height: 16, background: "#fff", transform: "translateX(-50%) rotate(45deg)", borderRadius: 3 }} />}
    </div>
  );
}

/** Su primera foto (pantalla 7): qué fotografiar en casa, con tres ejemplos. Se va sola con la primera foto. */
function InstructivoCamara() {
  const { t } = useTranslation();
  useEffect(() => { anotar("instructivo_visto", {}, { unaVez: true }); }, []);
  return (
    <Globo titulo={t("ensayo.primeraFotoTitulo")}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
        {["ejemplo1", "ejemplo2", "ejemplo3"].map(k => <span key={k} style={{ minHeight: 32, display: "inline-flex", alignItems: "center", padding: "0 12px", borderRadius: 999, background: MARCA.crema, border: "1px solid #EAD9CC", fontSize: 14, fontWeight: 500 }}>{t(`ensayo.${k}`)}</span>)}
      </div>
    </Globo>
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
  onAyuda, // el "?" de arriba abre la hoja de Ayuda (26/10)
  onYaTengoCuenta, // sin cuenta y sin productos: "Ya tengo cuenta" arriba (27/10)
  primeraFoto = false, // primer uso (27/10, ensayo de feria): hasta la primera foto, solo el obturador, el "?" y una indicación
  propuestaTarjeta = null, // { onEscanear, onEjemplo }: después de su primera foto, "¿Tenés la tarjeta de alguien?"
  primerStand = false, // su primer stand guiado (27/10): arriba solo el "?", como en los wireframes 7 a 10
  tarjetaEjemplo = false, // en modo tarjeta, la de Nancy Ceramic en vez de la cámara (para quien no tiene ninguna a mano)
  // 28/10 (Nati: "la gente no sabe qué hacer primero"): la tarjeta se sugiere al abrir un stand nuevo, sin bloquear
  propuestaInicio = null, // { onEscanear, onDespues }: "¿Ya tenés la tarjeta del stand?"
  onElegirProveedor, onEscribirProveedor, // la pestaña Proveedor del teclado: elegir uno cargado o escribir el nombre
  barridoTarjeta = null, // la foto de la tarjeta recién sacada: queda quieta y la línea amarilla la recorre (1 s)
  tarjetaAviso = null, // { fase: "guardada" | "fallo" | "sinSenal", onReintentar, onCerrar }
  onSaltarGuia, // primer stand guiado (28/10, Nati: "no se entiende cuándo estás en tutorial y cómo salir"): se ve y se puede saltar
}) {
  const { t } = useTranslation();
  const { alturas, movimiento, curvas, duracion, reducido } = useSistema();
  const [presionado, setPresionado] = useState(false);
  const [videoListo, setVideoListo] = useState(false);
  // 22/10 (Nati): la miniatura vuelve a abrir "Este stand" (los últimos productos con precio rápido, otra foto, borrar),
  // y desde ahí se va al catálogo. Sin fotos en el stand, la miniatura abre el catálogo directo.
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

  // La guía de cuatro carteles (23/10) se fue con el ensayo de feria (27/10): el primer uso se aprende tocando, antes
  // de la cámara. Acá queda solo la indicación de la primera foto y, después, la pregunta por la tarjeta.

  // El consejo se va solo y no vuelve.
  useEffect(() => {
    if (!consejoVisible) return;
    consejoTimer.current = setTimeout(() => onConsejoVisto?.(), 6000);
    return () => clearTimeout(consejoTimer.current);
  }, [consejoVisible]);

  const esTarjeta = modo === "card";
  const barraX = useRef(null);
  const cambiarModo = (m) => { if (m === "card" && !esTarjeta) onTarjeta?.(); if (m === "product" && esTarjeta) onVolverAProductos?.(); };
  const textoSaldo = saldo === null ? null
    : saldo <= 0 ? t("visor.sinEscaneos", { count: esperando })
    : saldo <= trial ? t("visor.escaneosDePrueba", { count: saldo, total: trial })
    : t("visor.escaneos", { count: saldo });
  const saldoBajo = saldo !== null && saldo <= 3;
  const textoSync = estadoSync === "sincronizando" ? t("visor.sincronizando", { count: pendientesSync }) : estadoSync === "nube" ? t("visor.enLaNube") : t("visor.guardado");
  const colorPunto = estadoSync === "falla" ? "#EF4444" : estadoSync === "nube" ? "#22C55E" : estadoSync === "sincronizando" ? MARCA.naranja : BLANCO_SUAVE;

  // La línea de abajo siempre dice el próximo paso (Nati, 28/10: "yo lo guiaría más"): según lo que tiene el stand
  const n = standAbierto?.fotos || 0;
  const conTarjeta = !!(standAbierto?.tieneTarjeta || standAbierto?.nombre);
  // v2 (Nati: "demasiado comprimido, tipografía muy chica"): una sola idea de 3 a 5 palabras, letra de 15, o nada
  const guiaAbajo = esTarjeta ? t("visor.escaneaTarjeta")
    : primeraFoto ? t("ensayo.sacarFoto")
    : modoAngulo ? t("visor.escaneaProducto")
    : n === 0 && !conTarjeta ? t("visor.guiaPrimerProducto")
    : n === 0 && conTarjeta ? t("visor.guiaProductosDelStand")
    : !conTarjeta && !standAbierto?.leyendo ? t("visor.guiaOtraYTarjeta")
    : "";
  const pedirTarjeta = !esTarjeta && !primeraFoto && !primerStand && n > 0 && !conTarjeta && !standAbierto?.leyendo; // la pestaña TARJETA late apenas

  return (
    <div className="pantalla-fija" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} onClick={() => { if (datos && !esTarjeta) onConfirmarPrecio?.(); }} style={{ position: "fixed", inset: 0, zIndex: 100, background: "#2B1206", display: "flex", flexDirection: "column", color: BLANCO, fontFamily: "inherit", userSelect: "none" }}>
      {/* 22/10 (Android): el WebView de Samsung dibuja un ícono de "play" gris sobre un <video> sin señal; hasta que
          la cámara realmente emite, el video queda invisible sobre el fondo oscuro. */}
      <video ref={videoRef} autoPlay playsInline muted disablePictureInPicture controls={false} onPlaying={() => setVideoListo(true)} onEmptied={() => setVideoListo(false)}
        style={{ flex: 1, objectFit: "cover", width: "100%", opacity: videoListo ? 1 : 0, transition: "opacity 160ms" }} />

      {/* Velo blanco del obturador (80 ms) */}
      <style>{`@keyframes fairscanGuardado { 0% { transform: scale(0.4); opacity: 0 } 35% { transform: scale(1.15); opacity: 1 } 55% { transform: scale(1) } 100% { transform: scale(1); opacity: 1 } }
        @keyframes fairscanLate { 0%,100% { opacity: 0.75 } 50% { opacity: 1 } }
        @keyframes fairscanBarrido { from { top: 30% } to { top: calc(30% + 48vw) } }
        @keyframes fairscanRueda { to { transform: rotate(360deg) } }
        @keyframes fairscanCartel { from { opacity: 0; transform: translateY(8px) scale(0.98) } to { opacity: 1; transform: none } }`}</style>
      <div aria-hidden style={{ position: "absolute", inset: 0, background: "#fff", opacity: flash ? 0.75 : 0, pointerEvents: "none", zIndex: 2, transition: `opacity ${duracion(movimiento.obturador.velo)}ms linear` }} />
      {/* La tarjeta de ejemplo tapa la cámara (pantalla 10): se ve como si estuviera adelante */}
      {esTarjeta && tarjetaEjemplo && <img src={TARJETA_EJEMPLO.fotoVisor} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 1 }} />}
      {/* La tarjeta recién sacada queda quieta y la línea amarilla del ensayo la recorre (Nati, 28/10: "me gusta el efecto") */}
      {barridoTarjeta && (
        <div aria-hidden style={{ position: "absolute", inset: 0, zIndex: 3 }}>
          <img src={barridoTarjeta} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
          <div style={{ position: "absolute", left: "8%", right: "8%", top: "30%", aspectRatio: "1.75", border: `2px dashed ${MARCA.sello}`, borderRadius: 14 }} />
          <div style={{ position: "absolute", left: "8%", right: "8%", height: 3, background: MARCA.sello, boxShadow: "0 0 18px 4px rgba(255,197,61,0.7)", animation: reducido ? "none" : "fairscanBarrido 1s ease-in-out both" }} />
          <div style={{ position: "absolute", left: 0, right: 0, top: "calc(30% + 48vw + 14px)", textAlign: "center", fontSize: 15, fontWeight: 700, color: MARCA.sello, textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}>{t("visor.leyendoCorto")}</div>
        </div>
      )}
      {/* La tarjeta, en una franja arriba (v2, Nati 28/10: "se queda leyendo muchísimo tiempo e interrumpe"): se da por
          guardada al segundo y los datos llegan después, en silencio, a la pastilla del stand. Si falló, franja roja
          que se puede ignorar: tocarla vuelve a escanear. Nunca un cartel en el medio. */}
      {tarjetaAviso && !esTarjeta && !barridoTarjeta && (() => {
        const { fase } = tarjetaAviso;
        const rojo = fase === "fallo";
        const fondo = rojo ? "#FDE2DC" : fase === "sinSenal" ? "#FFF3EA" : "#DCEFE3";
        const color = rojo ? "#B8341A" : fase === "sinSenal" ? MARCA.cacao : "#1F7A45";
        const titulo = rojo ? t("visor.falloTitulo") : fase === "sinSenal" ? t("visor.sinSenalCorto") : t("visor.tarjetaGuardadaCorta");
        const texto = rojo ? t("visor.falloTocar") : t("visor.seguiSacando");
        return (
          <button type="button" role="status" aria-live="polite" onClick={e => { e.stopPropagation(); if (rojo) tarjetaAviso.onReintentar?.(); else tarjetaAviso.onCerrar?.(); }} style={{ position: "absolute", left: 14, right: 14, top: "calc(env(safe-area-inset-top, 0px) + 60px)", zIndex: 6, background: fondo, color, border: "none", borderRadius: 14, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, textAlign: "left", fontFamily: "inherit", cursor: "pointer", boxShadow: "0 10px 26px -12px rgba(0,0,0,0.5)", animation: reducido ? "none" : "fairscanCartel 220ms ease-out both" }}>
            <Icono nombre={rojo ? "reintentar" : fase === "sinSenal" ? "sinNube" : "listo"} tamano={20} color={color} />
            <span style={{ minWidth: 0 }}><span style={{ display: "block", fontSize: 15, fontWeight: 700 }}>{titulo}</span><span style={{ display: "block", fontSize: 13, color: MARCA.cacao, opacity: 0.85 }}>{texto}</span></span>
          </button>
        );
      })()}
      {/* Pista de gesto, una vez: a la segunda foto, "deslizá arriba · catálogo" (Nati, 28/10) */}
      {!esTarjeta && !datos && !primeraFoto && !primerStand && <PistaGesto clave="arriba" cuando={n >= 1} direccion="arriba" estilo={{ bottom: "calc(196px + env(safe-area-inset-bottom, 0px))" }} />}
      {/* Stand nuevo (Nati, 28/10): la tarjeta se sugiere al principio, sin bloquear; el obturador vale como "Después" */}
      {propuestaInicio && !esTarjeta && !datos && !ultimasAbiertas && !tarjetaAviso && (
        <Globo titulo={t("visor.inicioTarjetaTitulo")} texto={t("visor.inicioTarjetaTexto")} pico={false} abajo={176}>
          <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
            <button type="button" onClick={propuestaInicio.onEscanear} style={{ flex: 1.4, minHeight: 52, borderRadius: 14, border: "none", background: MARCA.cacao, color: MARCA.crema, fontFamily: "inherit", fontSize: 15, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}><Icono nombre="tarjeta" tamano={18} color={MARCA.crema} />{t("visor.escanearTarjetaCorto")}</button>
            <button type="button" onClick={propuestaInicio.onDespues} style={{ flex: 1, minHeight: 52, borderRadius: 14, border: "none", background: "rgba(43,18,6,0.08)", color: MARCA.cacao, fontFamily: "inherit", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>{t("visor.despues")}</button>
          </div>
        </Globo>
      )}

      {/* Primer uso (27/10): una indicación por momento, nunca más de una */}
      {primeraFoto && !esTarjeta && !datos && <InstructivoCamara />}
      {propuestaTarjeta && !esTarjeta && !datos && !ultimasAbiertas && (
        <Globo titulo={t("ensayo.tarjetaPreguntaTitulo")} texto={t("ensayo.tarjetaPreguntaTexto")} pico={false} abajo={176}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
            <button type="button" onClick={propuestaTarjeta.onEscanear} style={{ minHeight: 52, borderRadius: 14, border: "none", background: MARCA.cacao, color: MARCA.crema, fontFamily: "inherit", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>{t("ensayo.escanearUnaTarjeta")}</button>
            <button type="button" onClick={propuestaTarjeta.onEjemplo} style={{ minHeight: 44, borderRadius: 12, border: "none", background: "rgba(255,79,42,0.10)", color: "#B8341A", fontFamily: "inherit", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>{t("ensayo.usarEjemplo")}</button>
          </div>
        </Globo>
      )}
      {esTarjeta && tarjetaEjemplo && <Globo titulo={t("ensayo.ejemploTitulo")} texto={t("ensayo.ejemploTexto")} />}

      {/* Arriba: saldo y estado. Nada más. */}
      <div style={{ position: "absolute", top: "calc(env(safe-area-inset-top, 0px) + 12px)", left: 14, right: 14, zIndex: 3, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center", minWidth: 0 }}>
          {esTarjeta && <button type="button" onClick={() => cambiarModo("product")} style={{ minHeight: 44, padding: "0 14px 0 8px", borderRadius: 999, border: "none", background: VIDRIO, backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", color: BLANCO, fontSize: 15, fontWeight: 500, fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 4, cursor: "pointer", whiteSpace: "nowrap" }}><Icono nombre="volver" tamano={18} color={BLANCO} />{tarjetaEjemplo ? t("ensayo.volver") : t("ensayo.volverAProductos")}</button>}
          {/* v2 (Nati, 28/10): "‹ Catálogo" grande en vez del nombre de la feria, para que se entienda que vuelve; deslizar a la derecha hace lo mismo */}
          {!esTarjeta && !primeraFoto && !primerStand && <button type="button" onClick={() => { onCatalogo?.(); }} style={{ minHeight: 44, padding: "0 16px 0 10px", borderRadius: 999, border: "none", background: VIDRIO, backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", color: BLANCO, fontSize: 15, fontWeight: 600, fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap", cursor: "pointer" }}><Icono nombre="volver" tamano={20} color={BLANCO} />{t("visor.volverAlCatalogo")}</button>}
          {/* El saldo solo cuando está por acabarse; la nube no se muestra: en la cámara distrae (Nati, 22/09) */}
          {textoSaldo && saldoBajo && !esTarjeta && <Pastilla tono="alerta">{textoSaldo}</Pastilla>}
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {/* Opción C (Nati, 22/10): el stand abierto vive arriba a la derecha; tocarlo abre la hoja del stand.
              La tarjeta ya no es una pastilla sobre el obturador: es un modo del obturador. */}
          {standAbierto && !modoAngulo && !primerStand && (standAbierto.fotos > 0 || standAbierto.tieneTarjeta || standAbierto.leyendo) && (() => {
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
          {/* "Ya tengo cuenta" (27/10): chico, para que nadie se quede sin poder entrar (caso Ganga Home) */}
          {onYaTengoCuenta && !modoAngulo && !primeraFoto && <button type="button" onClick={onYaTengoCuenta} style={{ minHeight: 32, padding: "0 12px", borderRadius: 999, border: "none", background: VIDRIO, backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", color: BLANCO, fontSize: 12, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", whiteSpace: "nowrap" }}>{t("entrar.yaTengoCuenta")}</button>}
          {primerStand && onSaltarGuia && !esTarjeta && <button type="button" onClick={onSaltarGuia} style={{ minHeight: 32, padding: "0 12px", borderRadius: 999, border: "none", background: MARCA.sello, color: MARCA.cacao, fontSize: 12, fontWeight: 700, fontFamily: "inherit", cursor: "pointer", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 6 }}>{t("visor.guiaChip")} · <span style={{ textDecoration: "underline", textUnderlineOffset: 2 }}>{t("visor.saltarGuia")}</span></button>}
          {/* Ayuda (26/10, idea de la mamá de Nati): un "?" chico, en la fila de arriba y no flotando sobre la foto */}
          {onAyuda && !modoAngulo && <button type="button" onClick={onAyuda} aria-label={t("ayuda.abrir")} style={{ width: 32, height: 32, borderRadius: 16, border: "none", background: VIDRIO, backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", display: "grid", placeItems: "center", padding: 0, cursor: "pointer", flexShrink: 0 }}><Icono nombre="ayuda" tamano={18} color={BLANCO} /></button>}
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
      {esTarjeta && tarjetaEjemplo && (
        <div style={{ position: "absolute", top: "calc(env(safe-area-inset-top, 0px) + 68px)", left: 0, right: 0, zIndex: 3, display: "flex", justifyContent: "center" }}>
          <span style={{ display: "inline-flex", alignItems: "center", minHeight: 36, padding: "0 14px", borderRadius: 999, background: MARCA.sello, color: MARCA.cacao, fontSize: 13, fontWeight: 700 }}>{t("ensayo.ejemploPastilla")}</span>
        </div>
      )}
      {esTarjeta && !barridoTarjeta && (
        <>
          {!tarjetaEjemplo && <div style={{ position: "absolute", top: "calc(env(safe-area-inset-top, 0px) + 64px)", left: 24, right: 24, zIndex: 3, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, textAlign: "center" }}>
            <span style={{ fontFamily: "'Bricolage Grotesque', inherit", fontWeight: 800, fontSize: 22, letterSpacing: "-0.02em", color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>{t("visor.encuadraTitulo")}</span>
            <span style={{ fontSize: 13, color: BLANCO_SUAVE, textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}>{t("visor.encuadraSub")}</span>
          </div>}
          <div aria-hidden style={{ position: "absolute", left: "8%", right: "8%", top: "30%", aspectRatio: "1.75", border: `2px dashed ${MARCA.sello}`, borderRadius: 14, zIndex: 3, pointerEvents: "none" }} />
          {!tarjetaEjemplo && <div style={{ position: "absolute", left: 14, right: 14, top: "calc(30% + 48vw + 18px)", zIndex: 3, display: "flex", justifyContent: "center" }}>
            <Pastilla><Icono nombre="camara" tamano={14} color={BLANCO} />{t("visor.seguisDespues")}</Pastilla>
          </div>}
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

      {/* El teclado propio (Nati, 28/10; antes, la barra del pulgar del 23/09 con el teclado del teléfono): después de
          la foto, el número grande y las teclas de la app; Listo guarda y cierra todo de un toque. La pestaña
          Proveedor pregunta de quién es el producto si el stand todavía no tiene tarjeta. */}
      {datos && !esTarjeta && (() => {
        const campos = [["price", t("visor.campoPrecio")], ["moq", t("visor.campoMoq")], ["piezasPorCaja", t("visor.campoPiezasCorto")], ["cbmPorCaja", t("visor.campoCbmCorto")]].filter(([k]) => k === "price" || datosActivos?.[k] !== false);
        if (standAbierto && !modoAngulo) campos.push(["proveedor", t("visor.campoProveedor")]);
        const listos = datos.listos || {};
        const hecho = (k) => !!listos[k] || (!!datos.valores[k] && k !== datos.campo);
        return (
          <TecladoDatos campos={campos} campo={datos.campo} valores={datos.valores} moneda={moneda} moqBase={datos.moqBase} favorito={!!datos.favorito} campoGuardado={campoGuardado} hecho={hecho}
            proveedor={standAbierto && !modoAngulo ? { nombre: standAbierto.nombre, tieneTarjeta: standAbierto.tieneTarjeta, leyendo: standAbierto.leyendo } : null}
            onTecla={onTeclaPrecio} onListo={onConfirmarPrecio} onCampo={onCampo} onMoqBase={onMoqBase} onFavorito={onFavorito}
            onEscanearTarjeta={() => { onConfirmarPrecio?.(); onTarjeta?.(); }} onElegirProveedor={onElegirProveedor} onEscribirProveedor={onEscribirProveedor}
            estilo={{ position: "absolute", left: 12, right: 12, bottom: "calc(196px + env(safe-area-inset-bottom, 0px))", zIndex: 5 }} />
        );
      })()}

      {/* Abajo (opción C, Nati 22/10): Catálogo con la última foto adentro · un solo obturador con el selector
          PRODUCTO · TARJETA arriba y una frase abajo que dice qué hace ahora · nada a la derecha. Deslizar sobre la
          barra también cambia de modo, como en la cámara del teléfono. */}
      <div onTouchStart={e => { barraX.current = e.touches?.[0]?.clientX ?? null; }} onTouchEnd={e => { const x1 = e.changedTouches?.[0]?.clientX; if (barraX.current === null || x1 === undefined) return; const dx = x1 - barraX.current; barraX.current = null; if (Math.abs(dx) < 50) return; e.stopPropagation(); if (dx < 0 && !esTarjeta) cambiarModo("card"); if (dx > 0 && esTarjeta) cambiarModo("product"); }}
        style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 3, padding: "18px 18px calc(20px + env(safe-area-inset-bottom, 0px))", display: "flex", alignItems: "flex-end", justifyContent: "space-between", background: "linear-gradient(180deg, rgba(43,18,6,0) 0%, rgba(43,18,6,0.55) 100%)" }}>
        <div style={{ width: 88, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, position: "relative" }}>
          <div style={{ position: "relative", width: alturas.miniatura, height: alturas.miniatura, visibility: primeraFoto ? "hidden" : "visible" }}>
            <button type="button" onClick={() => { if (itemsCount > 0 && ultimas.length) setUltimasAbiertas(true); else onCatalogo?.(); }} aria-label={itemsCount > 0 && ultimas.length ? t("visor.ultimasFotos") : t("visor.irAlCatalogo")} style={{ width: alturas.miniatura, height: alturas.miniatura, borderRadius: 14, border: "2px solid rgba(255,255,255,0.8)", background: "rgba(241,245,249,0.14)", padding: 0, overflow: "hidden", cursor: "pointer", display: "block", position: "relative" }}>
              {(ultimaCaptura || ultimas[0]?.foto)
                ? <img src={ultimaCaptura || ultimas[0]?.foto} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block", transform: miniaturaVuela && !reducido ? "scale(0.9)" : "none", transition: `transform ${duracion(movimiento.obturador.miniatura)}ms ${curvas.salida}` }} />
                : <span style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}><Icono nombre="foto" tamano={22} color={BLANCO} /></span>}
            </button>
            {itemsCount > 0 && <span aria-label={t("visor.enEsteStand", { count: itemsCount })} style={{ position: "absolute", right: -9, top: -9, minWidth: 24, height: 24, padding: "0 7px", borderRadius: 12, background: MARCA.sello, color: MARCA.cacao, fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", fontVariantNumeric: "tabular-nums", boxShadow: "0 1px 3px rgba(0,0,0,0.35)", pointerEvents: "none" }}>{itemsCount}</span>}
          </div>
          <span aria-hidden style={{ fontSize: 11, fontWeight: 700, color: BLANCO, letterSpacing: "0.05em", textShadow: "0 1px 3px rgba(0,0,0,0.6)", whiteSpace: "nowrap", visibility: primeraFoto ? "hidden" : "visible" }}>{(itemsCount > 0 && ultimas.length ? t("visor.ultimasFotos") : t("visor.catalogo")).toUpperCase()}</span>
          {puedeAgregarAngulo && !esTarjeta && !modoAngulo && (
            <button type="button" onClick={onAgregarAngulo} aria-label={t("visor.agregarAngulo")} style={{ position: "absolute", top: -34, left: "50%", transform: "translateX(-50%)", minHeight: 24, padding: "0 8px", borderRadius: 12, border: "none", background: MARCA.sello, color: MARCA.cacao, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap", cursor: "pointer", fontFamily: "inherit" }}>{t("visor.masAngulo")}</button>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <div role="tablist" aria-label={t("visor.queEscanear")} style={{ display: "flex", gap: 22, visibility: (datos && !esTarjeta) || primeraFoto || tarjetaEjemplo ? "hidden" : "visible" }}>
            {[["product", t("visor.modoProducto")], ["card", t("visor.modoTarjeta")]].map(([m, etiqueta]) => { const activo = (m === "card") === esTarjeta; return (
              <button key={m} type="button" role="tab" aria-selected={activo} onClick={() => cambiarModo(m)} style={{ minHeight: 28, padding: "0 2px 4px", border: "none", borderBottom: `2px solid ${activo ? MARCA.sello : m === "card" && pedirTarjeta ? "rgba(255,197,61,0.6)" : "transparent"}`, background: "transparent", color: activo ? MARCA.sello : m === "card" && pedirTarjeta ? "#fff" : BLANCO_SUAVE, fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", fontFamily: "inherit", cursor: "pointer", textShadow: "0 1px 3px rgba(0,0,0,0.6)", animation: m === "card" && pedirTarjeta && !reducido ? "fairscanLate 1.6s ease-in-out infinite" : "none" }}>{etiqueta}</button>
            ); })}
          </div>
          <button
            type="button"
            onClick={() => onDisparar?.()}
            onPointerDown={() => setPresionado(true)}
            onPointerUp={() => setPresionado(false)}
            onPointerLeave={() => setPresionado(false)}
            aria-label={esTarjeta ? t("visor.escaneaTarjeta") : t("visor.disparar")}
            style={{ position: "relative", width: alturas.obturador, height: alturas.obturador, borderRadius: "50%", border: "5px solid #fff", background: esTarjeta ? MARCA.sello : MARCA.naranja, boxShadow: primeraFoto || tarjetaEjemplo ? `0 0 0 10px ${esTarjeta ? "rgba(255,197,61,0.30)" : "rgba(255,79,42,0.28)"}, 0 0 0 22px ${esTarjeta ? "rgba(255,197,61,0.12)" : "rgba(255,79,42,0.12)"}` : "0 0 0 3px rgba(43,18,6,0.35)", cursor: "pointer", transform: presionado && !reducido ? "scale(0.92)" : "scale(1)", transition: `transform ${duracion(movimiento.obturador.presion)}ms ${curvas.salida}, background 200ms` }}
          />
          <span aria-hidden style={{ fontSize: 15, fontWeight: 600, color: BLANCO, textShadow: "0 1px 3px rgba(0,0,0,0.6)", textAlign: "center", lineHeight: 1.3, maxWidth: 210, minHeight: 20, visibility: datos && !esTarjeta ? "hidden" : "visible" }}>{guiaAbajo}</span>
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
                <span style={{ fontSize: 14, fontWeight: 600, color: u.precio ? "#0F172A" : "#64748B" }}>{u.precio ? `${moneda} ${u.precio}` : t("visor.sinPrecioCorto")}{u.fotos > 1 ? <span style={{ fontWeight: 400, color: "#64748B" }}> · {t("cantidades.fotos", { count: u.fotos })}</span> : null}</span>
                <div style={{ display: "flex", gap: 6 }}>
                  <Boton variante="secundario" icono="camara" onClick={() => { setUltimasAbiertas(false); onAgregarFotoA?.(u.id); }}>{t("visor.masFoto")}</Boton>
                  {/* v2 (Nati, 28/10: "falta editar productos que ya fotografiaste"): Datos abre el mismo teclado para ese producto, con todas las pestañas */}
                  <Boton variante="secundario" onClick={() => { setUltimasAbiertas(false); onPrecioDe?.(u.id); }}>{t("visor.datosDe")}</Boton>
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
