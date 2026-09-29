/**
 * La ficha de un producto como feed vertical (decisión de Nati, 21/09, opción B del
 * wireframe https://claude.ai/artifact/BaipAd5ynMZnxVreJiYLQd): la foto ocupa la pantalla
 * entera; deslizar arriba/abajo pasa al producto vecino (en el orden del catálogo, con los
 * filtros puestos); deslizar a los lados cambia de ángulo. Encima, poco: volver, posición,
 * favorito, pedir, datos. El nombre, el precio y el proveedor van al pie, y "Ver todos los
 * datos" abre la hoja con los campos editables, el proveedor, la nota de voz y eliminar.
 * "Uno filtra por la foto y, si le interesa, ve más."
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSistema } from "../sistema/SistemaProvider.jsx";
import { Boton, Dato, Segmentado, Fila, Icono, Hoja, Esqueleto, PaginadorVertical, SeccionDeDatos } from "../componentes/index.js";
import { estadoIA, patchReintentoIA, explicarFalloIA } from "../lib/aiEstado.js";
import { urlDeAudio, esPunteroMuerto } from "../lib/audioNotes.js";
import { haceCuanto } from "../idiomas/formato.js";
import { respaldoDe } from "../lib/miniaturas.js";
import { useVolverConGesto } from "../sistema/useVolverConGesto.js";

export function FichaProducto({ product: p, allProducts = [], suppliers = [], districts = [], settings, moneda = "USD", Foto, tLegacy, onBack, onUpdate, onAddPhoto, onDelete, onNavigateSupplier, onNavigateProduct, onPedir }) {
  const { t } = useTranslation();
  const { paleta, alturas, radios, texto, espacios } = useSistema();
  const [foto, setFoto] = useState(0);
  const [guardado, setGuardado] = useState(false);
  const [eligiendoProveedor, setEligiendoProveedor] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [poniendoPrecio, setPoniendoPrecio] = useState(false); // 27/09: el precio se carga desde la portada
  // Volver al catálogo con el gesto (27/09): desde el borde, o desde cualquier lado cuando estás en la primera foto
  const fotoRef = useRef(0); fotoRef.current = foto;
  const { ref: raizRef, estilo: estiloGesto } = useVolverConGesto(onBack, { libre: () => fotoRef.current === 0 });
  const [precioBorrador, setPrecioBorrador] = useState("");
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
      img.onload = () => { const MAX = 1600; let w = img.width, h = img.height; if (w > h && w > MAX) { h = h * MAX / w; w = MAX; } else if (h > MAX) { w = w * MAX / h; h = MAX; } const c = document.createElement("canvas"); c.width = w; c.height = h; c.getContext("2d").drawImage(img, 0, 0, w, h); onAddPhoto?.(p.id, c.toDataURL("image/jpeg", 0.85)); };
      img.src = ev.target.result;
    };
    r.readAsDataURL(f);
  };

  const vacio = (x) => x === null || x === undefined || String(x).trim() === "";
  const materiales = Array.isArray(p.material) ? p.material.join(", ") : (p.material || "");
  const parte = (items) => ({ conDato: items.filter(i => !vacio(i.valor)).map(i => i.nodo), sinDato: items.filter(i => vacio(i.valor)).map(i => i.nodo) });
  // Las baldosas de la hoja (27/09, Nati: "plain, poco contraste y muchos campos vacíos que hacen ruido"):
  // solo lo que tiene dato; lo vacío detrás de "+ Agregar dato".
  const seccionProducto = parte([
    { valor: p.name, nodo: <Dato key="name" ancho={2} etiqueta={t("ficha.nombre")} valor={p.name} onChange={v => { if (v) guardar({ name: v }); }} /> },
    { valor: p.category, nodo: <Dato key="category" etiqueta={t("ficha.categoria")} valor={p.category} onChange={v => guardar({ category: v || null })} /> },
    { valor: materiales, nodo: <Dato key="material" etiqueta={t("ficha.materiales")} valor={materiales} onChange={v => guardar({ material: v ? v.split(",").map(x => x.trim()).filter(Boolean) : [] })} /> },
  ]);
  const seccionCompra = parte([
    { valor: p.price, nodo: <Dato key="price" etiqueta={`${t("ficha.precio")} ${moneda}`} valor={p.price} tipo="numero" destacado color={paleta.green} onChange={v => guardar({ price: v == null ? null : String(v) })} /> },
    { valor: p.moq, nodo: <Dato key="moq" etiqueta={t("ficha.moq")} valor={p.moq} tipo="numero" destacado onChange={v => guardar({ moq: v == null ? null : String(v) })} /> },
    settings?.datosDeCompra?.piezasPorCaja !== false && { valor: p.piezasPorCaja, nodo: <Dato key="piezas" etiqueta={t("ficha.piezasPorCaja")} valor={p.piezasPorCaja} tipo="numero" onChange={v => guardar({ piezasPorCaja: v })} /> },
    settings?.datosDeCompra?.cbmPorCaja !== false && { valor: p.cbmPorCaja, nodo: <Dato key="cbm" etiqueta={t("ficha.cbmPorCaja")} valor={p.cbmPorCaja} tipo="numero" sufijo="CBM" onChange={v => guardar({ cbmPorCaja: v })} /> },
  ].filter(Boolean));
  const baseMoq = (p.moq || p.moqBase) ? (
    <Dato key="moqBase" ancho={2} etiqueta={t("ficha.moqBase")} hijos={<Segmentado etiqueta={t("ficha.moqBase")} valor={p.moqBase || null} onChange={v => guardar({ moqBase: v })} estilo={{ marginTop: 4 }} opciones={[{ valor: "producto", texto: t("ficha.basePorProducto") }, { valor: "caja", texto: t("ficha.basePorCaja") }, { valor: "pedido", texto: t("ficha.basePorPedido") }]} />} />
  ) : null;
  const seccionNotas = parte([{ valor: p.notes, nodo: <Dato key="notes" ancho={2} etiqueta={t("ficha.notas")} valor={p.notes} multilinea onChange={v => guardar({ notes: v })} /> }]);
  const guardarPrecio = () => { const n = Number(String(precioBorrador).replace(",", ".")); setPoniendoPrecio(false); if (precioBorrador !== "" && !isNaN(n)) guardar({ price: String(n) }); };
  // La hoja de datos y el paginador vertical (3 pantallas: anterior · esta · siguiente)
  const [datosAbiertos, setDatosAbiertos] = useState(false);
  const fotosDe = (x) => (x.photos?.length ? x.photos : (x.photoUrls || []));
  const supplierDe = (x) => suppliers.find(s => s.id === x.supplierId);
  const posicion = idx >= 0 ? t("ficha.posicion", { n: idx + 1, total: allProducts.length }) : "";
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
        <div onScroll={esta ? (e => setFoto(Math.round(e.target.scrollLeft / Math.max(1, e.target.offsetWidth)))) : undefined} style={{ position: "absolute", inset: 0, display: "flex", overflowX: fs.length > 1 ? "auto" : "hidden", scrollSnapType: "x mandatory", scrollbarWidth: "none", WebkitOverflowScrolling: "touch", touchAction: "pan-x" }}>
          {fs.length > 0 ? fs.map((ph, i) => (
            <div key={i} style={{ width: "100%", height: "100%", flexShrink: 0, scrollSnapAlign: "start" }}>
              {Foto ? <Foto src={ph} respaldo={respaldoDe(x, i)} t={tLegacy} estilo={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : <img src={ph} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
            </div>
          )) : (
            <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", color: "rgba(255,255,255,0.6)" }}><Icono nombre="foto" tamano={40} color="rgba(255,255,255,0.6)" /></div>
          )}
        </div>
        {/* El pie: nombre, precio y proveedor sobre la foto; "Ver todos los datos" abre la hoja */}
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: `72px 84px calc(18px + env(safe-area-inset-bottom, 0px)) 18px`, background: "linear-gradient(to top, rgba(43,18,6,0.86) 55%, rgba(43,18,6,0))", color: "#fff", display: "flex", flexDirection: "column", gap: 4 }}>
          {sinNombreX ? <Esqueleto ancho={200} alto={22} estilo={{ background: "rgba(255,255,255,0.35)" }} /> : <p style={{ margin: 0, fontSize: 24, fontWeight: 700, lineHeight: 1.15, overflowWrap: "anywhere" }}>{x.name || t("ficha.producto")}</p>}
          {/* 27/09: el precio se toca y se carga desde la portada, sin ir a editar */}
          <button type="button" onClick={esta ? () => { setPrecioBorrador(x.price || ""); setPoniendoPrecio(true); } : undefined} aria-label={x.price ? `${t("ficha.precio")} ${moneda} ${x.price}` : t("ficha.tocaPrecio")}
            style={{ alignSelf: "flex-start", background: "none", border: "none", padding: 0, margin: 0, fontFamily: "inherit", textAlign: "left", cursor: "pointer", color: "#fff", fontSize: 20, fontWeight: 700, fontVariantNumeric: "tabular-nums", display: "inline-flex", alignItems: "center", gap: 6, minHeight: 32 }}>
            {x.price ? <span style={{ color: "#86EFAC" }}>{moneda} {x.price}</span> : <span style={{ color: "#FCD34D", fontSize: 16, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6 }}><Icono nombre="editar" tamano={16} color="#FCD34D" />{t("ficha.tocaPrecio")}</span>}
            {x.moq ? <span style={{ fontWeight: 400, fontSize: 14, color: "rgba(255,255,255,0.75)" }}> · MOQ {x.moq}{x.moqBase ? " " + t(`ficha.basePor${x.moqBase[0].toUpperCase()}${x.moqBase.slice(1)}`) : ""}</span> : null}
          </button>
          {/* 27/09: el proveedor (grande, fácil de tocar) y "Ver todos los datos" en una sola fila: menos pila de cosas al pie */}
          <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center", flexWrap: "wrap" }}>
            {sup ? (
              <button type="button" onClick={() => onNavigateSupplier?.(sup)} style={{ background: "rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.4)", borderRadius: 999, padding: "0 12px 0 10px", minHeight: 42, color: "#fff", fontFamily: "inherit", fontSize: 15, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", textAlign: "left", maxWidth: "100%", minWidth: 0 }}>
                <Icono nombre="proveedor" tamano={17} color="#fff" /><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 170 }}>{sup.company || `#${sup.id}`}</span><Icono nombre="siguiente" tamano={14} color="rgba(255,255,255,0.7)" />
              </button>
            ) : <span style={{ fontSize: 14, color: "rgba(255,255,255,0.6)" }}>{t("ficha.sinProveedor")}</span>}
            <button type="button" onClick={() => setDatosAbiertos(true)} style={{ minHeight: 42, borderRadius: 999, border: "1px solid rgba(255,255,255,0.4)", background: "rgba(43,18,6,0.35)", color: "#fff", fontFamily: "inherit", fontSize: 14, fontWeight: 600, padding: "0 12px", display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <Icono nombre="abajo" tamano={16} color="#fff" style={{ transform: "rotate(180deg)" }} />{t("ficha.verDatos")}
            </button>
          </div>
          {fs.length > 1 && esta && (
            <div style={{ position: "absolute", right: 18, bottom: `calc(22px + env(safe-area-inset-bottom, 0px))`, display: "flex", gap: 5 }}>
              {fs.map((_, i) => <span key={i} style={{ width: foto === i ? 16 : 6, height: 6, borderRadius: 3, background: foto === i ? "#fff" : "rgba(255,255,255,0.5)", transition: "width 150ms" }} />)}
            </div>
          )}
        </div>
      </div>
    );
  };

  const redondo = (nombre, etiqueta, onClick, { activo = false, presionado, texto: rotulo } = {}) => (
    <button type="button" onClick={onClick} aria-label={etiqueta} aria-pressed={presionado} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, border: "none", background: "none", padding: 0, cursor: "pointer", color: "#fff", fontFamily: "inherit", width: 56 }}>
      <span style={{ width: 48, height: 48, borderRadius: 24, background: activo ? (nombre === "favorito" ? paleta.sello : paleta.accent) : "rgba(43,18,6,0.55)", display: "grid", placeItems: "center" }}><Icono nombre={nombre} tamano={22} color={activo && nombre === "favorito" ? paleta.selloTexto : "#fff"} relleno={activo && nombre === "favorito" ? paleta.selloTexto : undefined} /></span>
      {rotulo && <span style={{ fontSize: 11, fontWeight: 600, textShadow: "0 1px 2px rgba(0,0,0,0.6)" }}>{rotulo}</span>}
    </button>
  );

  return (
    <div ref={raizRef} className="pantalla-fija" style={{ position: "fixed", inset: 0, background: "#000", color: "#fff", fontFamily: "inherit", zIndex: 50, ...estiloGesto }}>
      {/* El paginador vertical: anterior · esta · siguiente; al asentarse en una vecina, se navega */}
      <PaginadorVertical clave={p.id} anterior={prev ? pantalla(prev, false) : null} actual={pantalla(p, true)} siguiente={next ? pantalla(next, false) : null}
        onAnterior={() => prev && onNavigateProduct?.(prev)} onSiguiente={() => next && onNavigateProduct?.(next)} />

      {/* Arriba: volver, la posición en el catálogo, agregar foto */}
      <div style={{ position: "absolute", top: `calc(env(safe-area-inset-top, 0px) + 12px)`, left: 14, right: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, pointerEvents: "none" }}>
        <span style={{ pointerEvents: "auto" }}>{redondo("volver", t("comun.volver"), onBack)}</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(43,18,6,0.55)", color: "#fff", borderRadius: 999, padding: "6px 12px", fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
          {estadoIA(p) === "fallo" && <Icono nombre="error" tamano={14} color="#FCA5A5" />}{guardado ? <><Icono nombre="listo" tamano={14} color="#86EFAC" />{t("ficha.guardado")}</> : posicion}
        </span>
        <span style={{ display: "inline-block", width: 48 }} />
      </div>

      {/* A la derecha: favorito, pedir, datos */}
      <div style={{ position: "absolute", right: 10, bottom: `calc(170px + env(safe-area-inset-bottom, 0px))`, display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
        {redondo("favorito", p.favorito ? t("ficha.quitarFavorito") : t("ficha.marcarFavorito"), () => guardar({ favorito: p.favorito ? 0 : 1 }), { activo: !!p.favorito, presionado: !!p.favorito, texto: t("revisar.favorito") })}
        {/* 27/09: agregar foto baja al riel, al alcance del dedo, con nombre */}
        {onAddPhoto && <>{redondo("mas", t("ficha.agregarFoto"), () => fileRef.current?.click(), { texto: t("ficha.fotoCorto") })}<input ref={fileRef} type="file" accept="image/*" onChange={onArchivo} style={{ display: "none" }} /></>}
        {redondo("editar", t("ficha.datos"), () => setDatosAbiertos(true), { texto: t("ficha.datosCorto") })}
      </div>

      {/* Todos los datos, en una hoja */}
      <Hoja abierta={datosAbiertos} onCerrar={() => setDatosAbiertos(false)} titulo={t("ficha.datos")} altura="completa">
        <div style={{ display: "flex", flexDirection: "column", gap: 18, color: paleta.text }}>
          {p.bloqueado && (
            <div style={{ background: paleta.card, border: `1px solid ${paleta.accent}`, borderRadius: radios.grande, padding: "10px 14px" }}>
              <p style={{ ...texto("cuerpo", { fontWeight: 600 }), margin: 0 }}>{t("ficha.bloqueadoTitulo")}</p>
              <p style={{ ...texto("pie"), color: paleta.muted, margin: "2px 0 0" }}>{t("ficha.bloqueadoTexto")}</p>
            </div>
          )}
          {district && <p style={{ ...texto("pie"), color: paleta.dim, margin: 0 }}>{district.name} · {t("ficha.capturado", { cuando: haceCuanto(p.createdAt) })}</p>}

          <SeccionDeDatos titulo={t("ficha.seccionProducto")} {...seccionProducto} />
          <SeccionDeDatos titulo={t("ficha.seccionCompra")} {...seccionCompra} extra={baseMoq} />

          {/* Proveedor */}
          <section>
            <h3 style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: paleta.dim, margin: "4px 2px 8px" }}>{t("ficha.proveedor")}</h3>
            {supplier ? (
              <Fila onClick={() => onNavigateSupplier?.(supplier)} flecha
                miniatura={(supplier.cardPhoto || supplier.cardPhotoUrl) ? <img src={supplier.cardPhoto || supplier.cardPhotoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Icono nombre="proveedor" tamano={20} color={paleta.dim} />}
                titulo={<>{supplier.favorito ? <><Icono nombre="favorito" tamano={13} color={paleta.selloTexto} relleno={paleta.sello} /> </> : null}{supplier.company || `#${supplier.id}`}</>}
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

          {/* Notas y la nota de voz */}
          <SeccionDeDatos titulo={t("ficha.notas")} {...seccionNotas} extra={(audioSrc || p.audioTranscript) ? (
            <div style={{ gridColumn: "1 / -1", padding: "4px 0" }}>
              <p style={{ ...texto("pie", { fontWeight: 600 }), color: paleta.dim, margin: "0 0 6px", display: "flex", alignItems: "center", gap: 6 }}><Icono nombre="voz" tamano={14} color={paleta.dim} />{t("ficha.notaDeVoz")}</p>
              {audioSrc && <audio src={audioSrc} controls style={{ width: "100%", height: 36, marginBottom: 6 }} />}
              {p.audioTranscript && <p style={{ ...texto("cuerpo", { fontWeight: 400 }), color: paleta.text, margin: 0, lineHeight: 1.5 }}>{p.audioTranscript}</p>}
            </div>
          ) : null} />

          <div style={{ marginTop: 8 }}><Boton variante="peligro" ancho="total" icono="borrar" onClick={() => setConfirmando(true)}>{t("ficha.eliminar")}</Boton></div>
        </div>
      </Hoja>

      {/* Poner el precio desde la portada (27/09) */}
      <Hoja abierta={poniendoPrecio} onCerrar={() => setPoniendoPrecio(false)} titulo={t("ficha.ponerPrecio")}
        pie={<Boton variante="principal" ancho="total" onClick={guardarPrecio}>{t("ficha.guardarPrecio")}</Boton>}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ ...texto("titulo"), color: paleta.muted }}>{moneda}</span>
          <input autoFocus type="text" inputMode="decimal" value={precioBorrador} aria-label={`${t("ficha.precio")} ${moneda}`} onChange={e => setPrecioBorrador(e.target.value.replace(/[^0-9.,]/g, ""))} onKeyDown={e => { if (e.key === "Enter") guardarPrecio(); }} placeholder="0"
            style={{ flex: 1, minWidth: 0, width: "100%", boxSizing: "border-box", minHeight: 56, fontSize: 32, fontWeight: 700, fontVariantNumeric: "tabular-nums", borderRadius: radios.medio, border: `1px solid ${paleta.accent}`, background: paleta.surface, color: paleta.text, padding: "0 14px", fontFamily: "inherit", outline: "none" }} />
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
