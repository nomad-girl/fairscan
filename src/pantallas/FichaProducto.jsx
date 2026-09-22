/**
 * La ficha de un producto como feed vertical (decisión de Nati, 21/09, opción B del
 * wireframe https://claude.ai/artifact/BaipAd5ynMZnxVreJiYLQd): la foto ocupa la pantalla
 * entera; deslizar arriba/abajo pasa al producto vecino (en el orden del catálogo, con los
 * filtros puestos); deslizar a los lados cambia de ángulo. Encima, poco: volver, posición,
 * favorito, pedir, datos. El nombre, el precio y el proveedor van al pie, y "Ver todos los
 * datos" abre la hoja con los campos editables, el proveedor, la nota de voz y eliminar.
 * "Uno filtra por la foto y, si le interesa, ve más."
 */
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSistema } from "../sistema/SistemaProvider.jsx";
import { Boton, Bloque, Campo, Segmentado, Fila, Icono, Hoja, Esqueleto } from "../componentes/index.js";
import { estadoIA, patchReintentoIA, explicarFalloIA } from "../lib/aiEstado.js";
import { urlDeAudio, esPunteroMuerto } from "../lib/audioNotes.js";
import { haceCuanto } from "../idiomas/formato.js";
import { respaldoDe } from "../lib/miniaturas.js";

export function FichaProducto({ product: p, allProducts = [], suppliers = [], districts = [], settings, moneda = "USD", Foto, tLegacy, onBack, onUpdate, onAddPhoto, onDelete, onNavigateSupplier, onNavigateProduct, onPedir }) {
  const { t } = useTranslation();
  const { paleta, alturas, radios, texto, espacios } = useSistema();
  const [foto, setFoto] = useState(0);
  const [guardado, setGuardado] = useState(false);
  const [eligiendoProveedor, setEligiendoProveedor] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const fileRef = useRef(null);

  const supplier = suppliers.find(s => s.id === p.supplierId);
  const district = districts.find(d => d.id === p.districtId);
  const idx = allProducts.findIndex(x => x.id === p.id);
  const prev = idx > 0 ? allProducts[idx - 1] : null;
  const next = idx >= 0 && idx < allProducts.length - 1 ? allProducts[idx + 1] : null;
  const fotos = p.photos?.length ? p.photos : (p.photoUrls || []); // sin copia local, las de la nube (17/09)

  const audioSrc = useMemo(() => urlDeAudio(p.audio) || (esPunteroMuerto(p.audioURL) ? null : p.audioURL || null), [p.audio, p.audioURL]);
  useEffect(() => () => { if (audioSrc?.startsWith("blob:")) URL.revokeObjectURL(audioSrc); }, [audioSrc]);

  const guardar = (cambios) => { onUpdate?.(p.id, cambios); setGuardado(true); };
  useEffect(() => { if (!guardado) return; const id = setTimeout(() => setGuardado(false), 2000); return () => clearTimeout(id); }, [guardado]);

  const cambiarProveedor = (s) => { guardar({ supplierId: s ? s.id : null, supplierCompany: s ? s.company || null : null }); setEligiendoProveedor(false); };


  const onArchivo = (e) => {
    const f = e.target.files?.[0]; e.target.value = ""; if (!f) return;
    const r = new FileReader();
    r.onload = ev => {
      const img = new Image();
      img.onload = () => { const MAX = 800; let w = img.width, h = img.height; if (w > h && w > MAX) { h = h * MAX / w; w = MAX; } else if (h > MAX) { w = w * MAX / h; h = MAX; } const c = document.createElement("canvas"); c.width = w; c.height = h; c.getContext("2d").drawImage(img, 0, 0, w, h); onAddPhoto?.(p.id, c.toDataURL("image/jpeg", 0.8)); };
      img.src = ev.target.result;
    };
    r.readAsDataURL(f);
  };

  // Los campos: los que tienen dato se ven; los vacíos quedan detrás de "Agregar un dato" (Nati, 17/09: "ocultos pero que se sepa que están").
  const [masDatos, setMasDatos] = useState(false);
  const vacio = (x) => x === null || x === undefined || String(x).trim() === "";
  const campos = [
    { clave: "price", etiqueta: t("ficha.precio"), valor: p.price, nodo: <Campo key="price" etiqueta={`${t("ficha.precio")} ${moneda}`} valor={p.price} tipo="numero" onChange={v => guardar({ price: v == null ? null : String(v) })} /> },
    { clave: "moq", etiqueta: t("ficha.moq"), valor: p.moq, nodo: <React.Fragment key="moq"><Campo etiqueta={t("ficha.moq")} valor={p.moq} tipo="numero" onChange={v => guardar({ moq: v == null ? null : String(v) })} />{(p.moq || p.moqBase) && <div style={{ padding: "8px 0 10px" }}><Segmentado etiqueta={t("ficha.moqBase")} valor={p.moqBase || null} onChange={v => guardar({ moqBase: v })} opciones={[{ valor: "producto", texto: t("ficha.basePorProducto") }, { valor: "caja", texto: t("ficha.basePorCaja") }, { valor: "pedido", texto: t("ficha.basePorPedido") }]} /></div>}</React.Fragment> },
    settings?.datosDeCompra?.piezasPorCaja !== false && { clave: "piezasPorCaja", etiqueta: t("ficha.piezasPorCaja"), valor: p.piezasPorCaja, nodo: <Campo key="piezas" etiqueta={t("ficha.piezasPorCaja")} valor={p.piezasPorCaja} tipo="numero" onChange={v => guardar({ piezasPorCaja: v })} /> },
    settings?.datosDeCompra?.cbmPorCaja !== false && { clave: "cbmPorCaja", etiqueta: t("ficha.cbmPorCaja"), valor: p.cbmPorCaja, nodo: <Campo key="cbm" etiqueta={t("ficha.cbmPorCaja")} valor={p.cbmPorCaja} tipo="numero" sufijo="CBM" onChange={v => guardar({ cbmPorCaja: v })} /> },
    { clave: "notes", etiqueta: t("ficha.notas"), valor: p.notes, nodo: <Campo key="notes" etiqueta={t("ficha.notas")} valor={p.notes} onChange={v => guardar({ notes: v })} multilinea apilado /> },
  ].filter(Boolean);
  // La hoja de datos y el paginador vertical (3 pantallas: anterior · esta · siguiente)
  const [datosAbiertos, setDatosAbiertos] = useState(false);
  const pagerRef = useRef(null);
  const timerRef = useRef(null);
  const navegandoRef = useRef(false);
  const centro = prev ? 1 : 0;
  useLayoutEffect(() => { const el = pagerRef.current; if (el) el.scrollTop = centro * el.clientHeight; navegandoRef.current = false; }, [p.id, centro]);
  // Al asentarse en una vecina, se navega. Se decide en el momento exacto en que la foto encaja
  // (a 2 px del punto de encaje) y, por si el encaje no llega a verse, con un segundo chequeo
  // 220 ms después del último movimiento. Antes se decidía a los 90 ms, mientras el iPhone
  // seguía animando el encaje: leía una posición intermedia, no navegaba y el feed quedaba
  // trabado en la última pantalla (Nati, 21/09: "escroleo 3 y se traba").
  const decidir = (el) => {
    if (navegandoRef.current) return;
    const h = Math.max(1, el.clientHeight);
    const i = Math.round(el.scrollTop / h);
    if (i === centro) return;
    const destino = i < centro ? prev : next;
    if (!destino) return;
    navegandoRef.current = true;
    onNavigateProduct?.(destino);
  };
  const onScrollPager = (e) => {
    const el = e.currentTarget;
    const h = Math.max(1, el.clientHeight);
    const resto = Math.abs(el.scrollTop - Math.round(el.scrollTop / h) * h);
    if (resto < 2) decidir(el);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => decidir(el), 220);
  };
  useEffect(() => {
    const el = pagerRef.current;
    const alTerminar = () => el && decidir(el);
    el?.addEventListener?.("scrollend", alTerminar);
    return () => { clearTimeout(timerRef.current); el?.removeEventListener?.("scrollend", alTerminar); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const fotosDe = (x) => (x.photos?.length ? x.photos : (x.photoUrls || []));
  const supplierDe = (x) => suppliers.find(s => s.id === x.supplierId);
  const posicion = idx >= 0 ? t("ficha.posicion", { n: idx + 1, total: allProducts.length }) : "";
  const camposConDato = campos.filter(c => !vacio(c.valor));
  const camposSinDato = campos.filter(c => vacio(c.valor));
  const sinNombre = !p.name && !p.ai_processed && estadoIA(p) !== "fallo";

  // Una pantalla del feed: la foto a pantalla entera (deslizar a los lados cambia de ángulo) y el pie con lo esencial.
  const pantalla = (x, esta) => {
    const fs = fotosDe(x);
    const sup = supplierDe(x);
    const sinNombreX = !x.name && !x.ai_processed && estadoIA(x) !== "fallo";
    return (
      <div key={x.id} style={{ height: "100%", flexShrink: 0, scrollSnapAlign: "start", position: "relative", background: "#000" }}>
        {/* La miniatura, borrosa, debajo: la foto grande aparece encima cuando termina de cargar (deslizar se siente al toque) */}
        {x.thumb && <img src={x.thumb} alt="" aria-hidden style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "blur(10px)", transform: "scale(1.08)" }} />}
        <div onScroll={esta ? (e => setFoto(Math.round(e.target.scrollLeft / Math.max(1, e.target.offsetWidth)))) : undefined} style={{ position: "absolute", inset: 0, display: "flex", overflowX: "auto", scrollSnapType: "x mandatory", scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>
          {fs.length > 0 ? fs.map((ph, i) => (
            <div key={i} style={{ width: "100%", height: "100%", flexShrink: 0, scrollSnapAlign: "start" }}>
              {Foto ? <Foto src={ph} respaldo={respaldoDe(x, i)} t={tLegacy} estilo={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : <img src={ph} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
            </div>
          )) : (
            <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", color: "rgba(255,255,255,0.6)" }}><Icono nombre="foto" tamano={40} color="rgba(255,255,255,0.6)" /></div>
          )}
        </div>
        {/* El pie: nombre, precio y proveedor sobre la foto; "Ver todos los datos" abre la hoja */}
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: `72px 84px calc(18px + env(safe-area-inset-bottom, 0px)) 18px`, background: "linear-gradient(to top, rgba(10,14,23,0.86) 55%, rgba(10,14,23,0))", color: "#fff", display: "flex", flexDirection: "column", gap: 4 }}>
          {sinNombreX ? <Esqueleto ancho={200} alto={22} estilo={{ background: "rgba(255,255,255,0.35)" }} /> : <p style={{ margin: 0, fontSize: 24, fontWeight: 700, lineHeight: 1.15, overflowWrap: "anywhere" }}>{x.name || t("ficha.producto")}</p>}
          <p style={{ margin: 0, fontSize: 17, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{x.price ? `${moneda} ${x.price}` : <span style={{ color: "rgba(255,255,255,0.6)", fontWeight: 400 }}>{t("ficha.precio")}: —</span>}{x.moq ? <span style={{ fontWeight: 400, color: "rgba(255,255,255,0.75)" }}> · MOQ {x.moq}{x.moqBase ? " " + t(`ficha.basePor${x.moqBase[0].toUpperCase()}${x.moqBase.slice(1)}`) : ""}</span> : null}{x.category ? <span style={{ fontWeight: 400, color: "rgba(255,255,255,0.75)" }}> · {x.category}</span> : null}</p>
          {sup ? (
            <button type="button" onClick={() => onNavigateSupplier?.(sup)} style={{ alignSelf: "flex-start", background: "none", border: "none", padding: 0, color: "rgba(255,255,255,0.85)", fontFamily: "inherit", fontSize: 14, display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", textAlign: "left" }}>
              <Icono nombre="proveedor" tamano={14} color="rgba(255,255,255,0.85)" /><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 240 }}>{sup.company || `#${sup.id}`}</span><Icono nombre="siguiente" tamano={14} color="rgba(255,255,255,0.6)" />
            </button>
          ) : <span style={{ fontSize: 14, color: "rgba(255,255,255,0.6)" }}>{t("ficha.sinProveedor")}</span>}
          <button type="button" onClick={() => setDatosAbiertos(true)} style={{ marginTop: 10, alignSelf: "flex-start", minHeight: 40, borderRadius: 999, border: "1px solid rgba(255,255,255,0.6)", background: "rgba(10,14,23,0.35)", color: "#fff", fontFamily: "inherit", fontSize: 14, fontWeight: 600, padding: "0 14px", display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
            <Icono nombre="abajo" tamano={16} color="#fff" style={{ transform: "rotate(180deg)" }} />{t("ficha.verDatos")}
          </button>
          {fs.length > 1 && esta && (
            <div style={{ position: "absolute", right: 18, bottom: `calc(22px + env(safe-area-inset-bottom, 0px))`, display: "flex", gap: 5 }}>
              {fs.map((_, i) => <span key={i} style={{ width: foto === i ? 16 : 6, height: 6, borderRadius: 3, background: foto === i ? "#fff" : "rgba(255,255,255,0.5)", transition: "width 150ms" }} />)}
            </div>
          )}
        </div>
      </div>
    );
  };

  const redondo = (nombre, etiqueta, onClick, { activo = false, presionado } = {}) => (
    <button type="button" onClick={onClick} aria-label={etiqueta} aria-pressed={presionado} style={{ width: 48, height: 48, borderRadius: 24, border: "none", background: activo ? paleta.accent : "rgba(10,14,23,0.55)", display: "grid", placeItems: "center", cursor: "pointer", backdropFilter: "blur(6px)" }}>
      <Icono nombre={nombre} tamano={22} color="#fff" />
    </button>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000", color: "#fff", fontFamily: "inherit", zIndex: 50 }}>
      {/* El paginador vertical: anterior · esta · siguiente; al asentarse en una vecina, se navega */}
      <div ref={pagerRef} onScroll={onScrollPager} style={{ position: "absolute", inset: 0, overflowY: "auto", scrollSnapType: "y mandatory", scrollbarWidth: "none", overscrollBehavior: "contain", WebkitOverflowScrolling: "touch" }}>
        {prev && pantalla(prev, false)}
        {pantalla(p, true)}
        {next && pantalla(next, false)}
      </div>

      {/* Arriba: volver, la posición en el catálogo, agregar foto */}
      <div style={{ position: "absolute", top: `calc(env(safe-area-inset-top, 0px) + 12px)`, left: 14, right: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, pointerEvents: "none" }}>
        <span style={{ pointerEvents: "auto" }}>{redondo("volver", t("comun.volver"), onBack)}</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(10,14,23,0.55)", color: "#fff", borderRadius: 999, padding: "6px 12px", fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums", backdropFilter: "blur(6px)" }}>
          {estadoIA(p) === "fallo" && <Icono nombre="error" tamano={14} color="#FCA5A5" />}{guardado ? <><Icono nombre="listo" tamano={14} color="#86EFAC" />{t("ficha.guardado")}</> : posicion}
        </span>
        <span style={{ pointerEvents: "auto" }}>
          {onAddPhoto ? (
            <>
              <button type="button" onClick={() => fileRef.current?.click()} aria-label={t("ficha.agregarFoto")} style={{ minWidth: 48, height: 48, padding: "0 12px", borderRadius: 24, border: "none", background: "rgba(10,14,23,0.55)", color: "#fff", fontFamily: "inherit", fontSize: 13, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", backdropFilter: "blur(6px)" }}>
                <Icono nombre="mas" tamano={18} color="#fff" />{t("ficha.fotos", { count: fotos.length })}
              </button>
              <input ref={fileRef} type="file" accept="image/*" onChange={onArchivo} style={{ display: "none" }} />
            </>
          ) : <span style={{ display: "inline-block", width: 48 }} />}
        </span>
      </div>

      {/* A la derecha: favorito, pedir, datos */}
      <div style={{ position: "absolute", right: 14, bottom: `calc(150px + env(safe-area-inset-bottom, 0px))`, display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
        {redondo("favorito", p.favorito ? t("ficha.quitarFavorito") : t("ficha.marcarFavorito"), () => guardar({ favorito: p.favorito ? 0 : 1 }), { activo: !!p.favorito, presionado: !!p.favorito })}
        {onPedir && redondo("pedido", t("ficha.pedir"), () => (supplier ? onPedir(p) : setEligiendoProveedor(true)))}
        {redondo("editar", t("ficha.datos"), () => setDatosAbiertos(true))}
      </div>

      {/* Todos los datos, en una hoja */}
      <Hoja abierta={datosAbiertos} onCerrar={() => setDatosAbiertos(false)} titulo={t("ficha.datos")} altura="completa">
        <div style={{ display: "flex", flexDirection: "column", gap: espacios.entreFilas, color: paleta.text }}>
          {p.bloqueado && (
            <div style={{ background: paleta.card, border: `1px solid ${paleta.accent}`, borderRadius: radios.grande, padding: "10px 14px" }}>
              <p style={{ ...texto("cuerpo", { fontWeight: 600 }), margin: 0 }}>{t("ficha.bloqueadoTitulo")}</p>
              <p style={{ ...texto("pie"), color: paleta.muted, margin: "2px 0 0" }}>{t("ficha.bloqueadoTexto")}</p>
            </div>
          )}
          {district && <p style={{ ...texto("pie"), color: paleta.dim, margin: 0 }}>{district.name} · {t("ficha.capturado", { cuando: haceCuanto(p.createdAt) })}</p>}

          {/* Los datos, editables tocando */}
          <Bloque>
            <Campo etiqueta={t("ficha.nombre")} valor={p.name} onChange={v => { if (v) guardar({ name: v }); }} />
            {camposConDato.map(c => c.nodo)}
            {masDatos ? camposSinDato.map(c => c.nodo) : camposSinDato.length > 0 && (
              <button type="button" onClick={() => setMasDatos(true)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", minHeight: alturas.campo, padding: 0, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", ...texto("cuerpo", { fontWeight: 400 }), color: paleta.muted, textAlign: "left" }}>
                <span>{t("ficha.agregarDato")} · {camposSinDato.map(c => c.etiqueta).join(", ")}</span><Icono nombre="mas" tamano={18} color={paleta.dim} />
              </button>
            )}
          </Bloque>

          {/* Proveedor */}
          <section>
            <h3 style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: paleta.dim, margin: "4px 2px 8px" }}>{t("ficha.proveedor")}</h3>
            {supplier ? (
              <Fila onClick={() => onNavigateSupplier?.(supplier)} flecha
                miniatura={(supplier.cardPhoto || supplier.cardPhotoUrl) ? <img src={supplier.cardPhoto || supplier.cardPhotoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Icono nombre="proveedor" tamano={20} color={paleta.dim} />}
                titulo={<>{supplier.favorito ? <><Icono nombre="favorito" tamano={13} color={paleta.accentTexto} /> </> : null}{supplier.company || `#${supplier.id}`}</>}
                subtitulo={supplier.contact || supplier.boothNumber || ""} />
            ) : (
              <Boton variante="secundario" ancho="total" icono="proveedor" onClick={() => setEligiendoProveedor(true)}>{t("ficha.asignarProveedor")}</Boton>
            )}
            {supplier && <div style={{ display: "flex", gap: 8, marginTop: 8 }}><Boton variante="fantasma" onClick={() => setEligiendoProveedor(true)}>{t("ficha.cambiarProveedor")}</Boton><Boton variante="fantasma" onClick={() => cambiarProveedor(null)}>{t("ficha.quitarProveedor")}</Boton></div>}
          </section>

          {onPedir && <Boton variante="secundario" ancho="total" icono="pedido" onClick={() => (supplier ? onPedir(p) : setEligiendoProveedor(true))}>{t("ficha.pedir")}</Boton>}

          {/* La IA no pudo */}
          {estadoIA(p) === "fallo" && (
            <div style={{ background: paleta.card, border: `1px solid ${paleta.red}`, borderRadius: radios.grande, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
              <p style={{ ...texto("cuerpo", { fontWeight: 600 }), color: paleta.red, margin: 0 }}>{t("ficha.iaFalloTitulo")}</p>
              <p style={{ ...texto("pie"), color: paleta.muted, margin: 0 }}>{explicarFalloIA(p.ai_error)} {t("ficha.iaFalloTexto")}</p>
              <Boton variante="secundario" icono="reintentar" onClick={() => guardar(patchReintentoIA())}>{t("ficha.reintentarIA")}</Boton>
            </div>
          )}

          {/* Nota de voz */}
          {(audioSrc || p.audioTranscript) && (
            <Bloque titulo={t("ficha.notaDeVoz")}>
              {audioSrc && <audio src={audioSrc} controls style={{ width: "100%", height: 36, margin: "6px 0 8px" }} />}
              {p.audioTranscript && <p style={{ ...texto("cuerpo", { fontWeight: 400 }), color: paleta.text, margin: "0 0 10px", lineHeight: 1.5 }}>{p.audioTranscript}</p>}
            </Bloque>
          )}

          <div style={{ marginTop: 8 }}><Boton variante="peligro" ancho="total" icono="borrar" onClick={() => setConfirmando(true)}>{t("ficha.eliminar")}</Boton></div>
        </div>
      </Hoja>

      {/* Elegir proveedor */}
      <Hoja abierta={eligiendoProveedor} onCerrar={() => setEligiendoProveedor(false)} titulo={t("ficha.proveedor")}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Fila onClick={() => cambiarProveedor(null)} seleccionada={!p.supplierId} titulo={t("ficha.sinProveedor")} />
          {[...suppliers].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).map(s => <Fila key={s.id} onClick={() => cambiarProveedor(s)} seleccionada={s.id === p.supplierId} titulo={s.company || `#${s.id}`} subtitulo={s.contact || ""} />)}
        </div>
      </Hoja>

      {/* Confirmar eliminación */}
      <Hoja abierta={confirmando} onCerrar={() => setConfirmando(false)} titulo={t("ficha.eliminarSeguro")}>
        <p style={{ ...texto("cuerpo", { fontWeight: 400 }), color: paleta.muted, margin: "0 0 14px" }}>{t("ficha.eliminarTexto")}</p>
        <div style={{ display: "flex", gap: 8 }}>
          <Boton variante="secundario" ancho="total" onClick={() => setConfirmando(false)} estilo={{ flex: 1 }}>{t("ficha.cancelar")}</Boton>
          <Boton variante="peligro" ancho="total" icono="borrar" onClick={() => { setConfirmando(false); onDelete?.(p.id); }} estilo={{ flex: 1 }}>{t("ficha.eliminar")}</Boton>
        </div>
      </Hoja>
    </div>
  );
}
