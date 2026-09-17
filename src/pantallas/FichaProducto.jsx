/**
 * La ficha de un producto (recorrido, pantalla 9; decisiones 1, 2, 5 y 8 del 16/09):
 * foto 4:3 con carrusel y "+", favorito, precio grande, campos que se editan tocando
 * el dato y guardan solos con una tilde, "Datos del bulto" colapsado hasta que se
 * carga, proveedor como fila, nota de voz, fallo de IA con salida, eliminar con
 * confirmación. Deslizar vertical sobre la foto cambia de producto (7.7).
 * "Pedir este producto" llega con la pantalla Pedidos.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
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
  const scrollRef = useRef(null);
  const fileRef = useRef(null);
  const touchRef = useRef(null);

  const supplier = suppliers.find(s => s.id === p.supplierId);
  const district = districts.find(d => d.id === p.districtId);
  const idx = allProducts.findIndex(x => x.id === p.id);
  const prev = idx > 0 ? allProducts[idx - 1] : null;
  const next = idx >= 0 && idx < allProducts.length - 1 ? allProducts[idx + 1] : null;
  const fotos = p.photos || [];

  const audioSrc = useMemo(() => urlDeAudio(p.audio) || (esPunteroMuerto(p.audioURL) ? null : p.audioURL || null), [p.audio, p.audioURL]);
  useEffect(() => () => { if (audioSrc?.startsWith("blob:")) URL.revokeObjectURL(audioSrc); }, [audioSrc]);

  const guardar = (cambios) => { onUpdate?.(p.id, cambios); setGuardado(true); };
  useEffect(() => { if (!guardado) return; const id = setTimeout(() => setGuardado(false), 2000); return () => clearTimeout(id); }, [guardado]);

  const cambiarProveedor = (s) => { guardar({ supplierId: s ? s.id : null, supplierCompany: s ? s.company || null : null }); setEligiendoProveedor(false); };

  // Deslizar vertical sobre la foto: producto anterior / siguiente (7.7)
  const onTouchStart = e => { const t0 = e.touches?.[0]; if (t0) touchRef.current = { x: t0.clientX, y: t0.clientY }; };
  const onTouchEnd = e => {
    const t0 = touchRef.current, t1 = e.changedTouches?.[0]; touchRef.current = null;
    if (!t0 || !t1 || !onNavigateProduct) return;
    const dx = t1.clientX - t0.x, dy = t1.clientY - t0.y;
    if (Math.abs(dy) > 60 && Math.abs(dy) > Math.abs(dx) * 1.5) { if (dy < 0 && next) onNavigateProduct(next); else if (dy > 0 && prev) onNavigateProduct(prev); }
  };

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

  const sinNombre = !p.name && !p.ai_processed && estadoIA(p) !== "fallo";

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: paleta.bg, color: paleta.text, fontFamily: "inherit" }}>
      {/* Barra superior */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: `calc(env(safe-area-inset-top, 0px) + 8px) ${espacios.margenLateral}px 8px`, minHeight: alturas.tocable + 16 }}>
        <button type="button" onClick={onBack} aria-label={t("comun.volver")} style={{ width: alturas.icono, height: alturas.icono, borderRadius: radios.medio, border: `1px solid ${paleta.border}`, background: paleta.card, display: "grid", placeItems: "center", cursor: "pointer", boxShadow: paleta.sombraTarjeta }}><Icono nombre="volver" tamano={20} color={paleta.muted} /></button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ ...texto("titulo"), margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sinNombre ? <Esqueleto ancho={160} alto={14} /> : (p.name || t("ficha.producto"))}</h1>
          <p style={{ ...texto("pie"), color: guardado ? paleta.green : paleta.muted, margin: 0, display: "flex", alignItems: "center", gap: 4 }}>{guardado ? <><Icono nombre="listo" tamano={13} color={paleta.green} />{t("ficha.guardado")}</> : (supplier?.company || p.supplierCompany || (allProducts.length > 1 ? `${idx + 1} / ${allProducts.length}` : ""))}</p>
        </div>
        <button type="button" onClick={() => guardar({ favorito: p.favorito ? 0 : 1 })} aria-pressed={!!p.favorito} aria-label={p.favorito ? t("ficha.quitarFavorito") : t("ficha.marcarFavorito")} style={{ width: alturas.icono, height: alturas.icono, borderRadius: radios.medio, border: `1px solid ${p.favorito ? paleta.accent : paleta.border}`, background: p.favorito ? paleta.accentSoft : paleta.card, display: "grid", placeItems: "center", cursor: "pointer", boxShadow: paleta.sombraTarjeta }}>
          <Icono nombre="favorito" tamano={20} color={p.favorito ? paleta.accentTexto : paleta.muted} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", overscrollBehavior: "contain", WebkitOverflowScrolling: "touch", padding: `0 ${espacios.margenLateral}px 40px`, display: "flex", flexDirection: "column", gap: espacios.entreFilas }}>

        {/* Foto 4:3, carrusel, +, flechas */}
        <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} style={{ position: "relative", borderRadius: radios.grande, overflow: "hidden", background: paleta.surface, border: `1px solid ${paleta.border}` }}>
          {fotos.length > 0 ? (
            <div ref={scrollRef} onScroll={e => setFoto(Math.round(e.target.scrollLeft / e.target.offsetWidth))} style={{ display: "flex", overflowX: "auto", scrollSnapType: "x mandatory", scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>
              {fotos.map((ph, i) => <div key={i} style={{ width: "100%", aspectRatio: "4/3", flexShrink: 0, scrollSnapAlign: "start" }}>{Foto ? <Foto src={ph} respaldo={respaldoDe(p, i)} t={tLegacy} estilo={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : <img src={ph} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}</div>)}
            </div>
          ) : (
            <div style={{ aspectRatio: "4/3", display: "grid", placeItems: "center" }}><Icono nombre="foto" tamano={32} color={paleta.dim} /></div>
          )}
          {fotos.length > 1 && (
            <div style={{ position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 5 }}>
              {fotos.map((_, i) => <span key={i} style={{ width: foto === i ? 16 : 6, height: 6, borderRadius: 3, background: foto === i ? "#fff" : "rgba(255,255,255,0.5)", transition: "width 150ms" }} />)}
            </div>
          )}
          {onAddPhoto && (
            <>
              <button type="button" onClick={() => fileRef.current?.click()} aria-label={t("ficha.agregarFoto")} style={{ position: "absolute", top: 10, right: 10, minWidth: alturas.tocable, height: alturas.tocable, padding: "0 12px", borderRadius: radios.medio, border: "none", background: "rgba(10,14,23,0.6)", color: "#F1F5F9", display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600 }}><Icono nombre="mas" tamano={18} color="#F1F5F9" />{t("ficha.fotos", { count: fotos.length })}</button>
              <input ref={fileRef} type="file" accept="image/*" onChange={onArchivo} style={{ display: "none" }} />
            </>
          )}
          {estadoIA(p) === "fallo" && <span style={{ position: "absolute", top: 10, left: 10, width: alturas.tocable, height: alturas.tocable, borderRadius: radios.medio, background: "rgba(220,38,38,0.9)", display: "grid", placeItems: "center" }}><Icono nombre="error" tamano={18} color="#fff" /></span>}
          {prev && onNavigateProduct && <button type="button" onClick={() => onNavigateProduct(prev)} aria-label={t("ficha.anterior")} style={{ position: "absolute", left: 6, top: "50%", transform: "translateY(-50%)", width: 36, height: alturas.tocable, borderRadius: radios.chico, border: "none", background: "rgba(10,14,23,0.45)", display: "grid", placeItems: "center", cursor: "pointer" }}><Icono nombre="volver" tamano={18} color="#F1F5F9" /></button>}
          {next && onNavigateProduct && <button type="button" onClick={() => onNavigateProduct(next)} aria-label={t("ficha.siguiente")} style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", width: 36, height: alturas.tocable, borderRadius: radios.chico, border: "none", background: "rgba(10,14,23,0.45)", display: "grid", placeItems: "center", cursor: "pointer" }}><Icono nombre="siguiente" tamano={18} color="#F1F5F9" /></button>}
        </div>

        {p.bloqueado && (
          <div style={{ background: paleta.card, border: `1px solid ${paleta.accent}`, borderRadius: radios.grande, padding: "10px 14px" }}>
            <p style={{ ...texto("cuerpo", { fontWeight: 600 }), margin: 0 }}>{t("ficha.bloqueadoTitulo")}</p>
            <p style={{ ...texto("pie"), color: paleta.muted, margin: "2px 0 0" }}>{t("ficha.bloqueadoTexto")}</p>
          </div>
        )}

        {/* Precio grande + contexto */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 10, padding: "0 2px" }}>
          <div>
            <span style={{ ...texto("grande"), color: p.price ? paleta.green : paleta.dim, fontVariantNumeric: "tabular-nums" }}>{p.price ? `${moneda} ${p.price}` : "—"}</span>
            <p style={{ ...texto("pie"), color: paleta.muted, margin: "2px 0 0" }}>{[p.moq ? `MOQ ${p.moq}${p.moqBase ? " " + t(`ficha.basePor${p.moqBase[0].toUpperCase()}${p.moqBase.slice(1)}`) : ""}` : null, p.category].filter(Boolean).join(" · ")}</p>
          </div>
          {district && <span style={{ ...texto("pie"), color: paleta.dim, textAlign: "right" }}>{district.name}<br />{t("ficha.capturado", { cuando: haceCuanto(p.createdAt) })}</span>}
        </div>

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

        {/* Pedir este producto: abre el pedido de su proveedor con este arriba (decisión 4, 16/09) */}
        {onPedir && <Boton variante="secundario" ancho="total" icono="pedido" onClick={() => (supplier ? onPedir(p) : setEligiendoProveedor(true))}>{t("ficha.pedir")}</Boton>}

        {/* Los datos, editables tocando */}
        <Bloque>
          <Campo etiqueta={t("ficha.nombre")} valor={p.name} onChange={v => { if (v) guardar({ name: v }); }} />
          <Campo etiqueta={`${t("ficha.precio")} ${moneda}`} valor={p.price} tipo="numero" onChange={v => guardar({ price: v == null ? null : String(v) })} />
          <Campo etiqueta={t("ficha.moq")} valor={p.moq} tipo="numero" onChange={v => guardar({ moq: v == null ? null : String(v) })} />
          {(p.moq || p.moqBase) && (
            <div style={{ padding: "8px 0 10px" }}>
              <Segmentado etiqueta={t("ficha.moqBase")} valor={p.moqBase || null} onChange={v => guardar({ moqBase: v })} opciones={[{ valor: "producto", texto: t("ficha.basePorProducto") }, { valor: "caja", texto: t("ficha.basePorCaja") }, { valor: "pedido", texto: t("ficha.basePorPedido") }]} />
            </div>
          )}
          {settings?.datosDeCompra?.piezasPorCaja !== false && <Campo etiqueta={t("ficha.piezasPorCaja")} valor={p.piezasPorCaja} tipo="numero" onChange={v => guardar({ piezasPorCaja: v })} />}
          {settings?.datosDeCompra?.cbmPorCaja !== false && <Campo etiqueta={t("ficha.cbmPorCaja")} valor={p.cbmPorCaja} tipo="numero" sufijo="CBM" onChange={v => guardar({ cbmPorCaja: v })} />}
          <Campo etiqueta={t("ficha.notas")} valor={p.notes} onChange={v => guardar({ notes: v })} multilinea />
        </Bloque>


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

        {/* Eliminar */}
        <div style={{ marginTop: 8 }}><Boton variante="peligro" ancho="total" icono="borrar" onClick={() => setConfirmando(true)}>{t("ficha.eliminar")}</Boton></div>
      </div>

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
