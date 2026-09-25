/**
 * La vista rápida (25/09, Nati: "preferiría que se abra en la pantalla a modo vista rápida"; el
 * concepto "la foto primero" del teléfono llevado a la compu). Tocás un producto y se abre encima
 * de todo: la foto entera a la izquierda sobre fondo oscuro (nunca recortada), los datos a la derecha.
 *
 * Segunda vuelta (25/09, noche; Nati: "la ficha sigue mareando, es un problema de UI"): la ficha
 * se lee de arriba a abajo en el orden en que se piensa. Quién es (nombre, proveedor, feria), qué
 * hago (Agregar al pedido y los tres chips), y después los datos agrupados en tres secciones,
 * Compra · El producto · Notas, como baldosas de dos columnas: etiqueta chica, valor grande, un
 * guion si está vacío. Se fueron las ocho filas seguidas de "Agregar ›" y el desplegable suelto.
 * ← → pasan al vecino, Esc cierra (primero la foto grande, después la vista).
 */
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSistema } from "../sistema/SistemaProvider.jsx";
import { Boton, Segmentado, Icono } from "../componentes/index.js";
import { haceCuanto } from "../idiomas/formato.js";
import { respaldoDe } from "../lib/miniaturas.js";
import { Miniatura } from "./util.jsx";
import { Dato } from "./Dato.jsx";
import { PREFIJO_EXTRA, cambioDeExtra } from "./camposPersonalizados.js";

const ANCHO_DATOS = 460;
/** La foto ocupa su caja entera sin recortarse: ancho y alto automáticos, con tope en la caja. */
const FOTO_ENTERA = { width: "auto", height: "auto", maxWidth: "100%", maxHeight: "100%", objectFit: "contain", display: "block" };

export function VistaRapida({
  producto: p, suppliers = [], districts = [], moneda = "USD", settings, Foto, tLegacy,
  posicion = null, onAnterior, onSiguiente, onCerrar,
  onActualizar, onEliminar, onAgregarAlPedido, onVerProveedor, onFavorito, onDescartar, camposPropios = [],
}) {
  const { t } = useTranslation();
  const { paleta, radios, texto } = useSistema();
  const [foto, setFoto] = useState(0);
  const [confirmando, setConfirmando] = useState(false);
  const [editandoNombre, setEditandoNombre] = useState(false);
  const [nombreBorrador, setNombreBorrador] = useState("");
  const [fotoGrande, setFotoGrande] = useState(false);
  useEffect(() => { setFoto(0); setConfirmando(false); setEditandoNombre(false); setFotoGrande(false); }, [p?.id]);
  // Esc: primero cierra la foto grande, después la vista rápida (la maneja el escritorio)
  useEffect(() => { if (!fotoGrande) return; const al = (e) => { if (e.key === "Escape") { e.stopPropagation(); setFotoGrande(false); } }; window.addEventListener("keydown", al, true); return () => window.removeEventListener("keydown", al, true); }, [fotoGrande]);
  if (!p) return null;

  const guardar = (cambios) => onActualizar?.(p.id, cambios);
  const supplier = suppliers.find(s => s.id === p.supplierId) || null;
  const district = districts.find(d => d.id === p.districtId) || null;
  const fotos = p.photos?.length ? p.photos : (p.photoUrls || []);
  const materiales = Array.isArray(p.material) ? p.material.join(", ") : (p.material || "");
  const i = Math.min(foto, Math.max(0, fotos.length - 1));
  const conTiras = fotos.length > 1;

  const redondoOscuro = (nombre, etiqueta, onClick, extra = {}) => (
    <button type="button" onClick={onClick} aria-label={etiqueta} title={etiqueta} style={{ width: 44, height: 44, borderRadius: 22, border: "none", background: "rgba(255,255,255,0.14)", display: "grid", placeItems: "center", cursor: "pointer", ...extra }}>
      <Icono nombre={nombre} tamano={20} color="#fff" />
    </button>
  );
  const chip = (nombre, etiqueta, onClick, activo = false) => (
    <button type="button" onClick={onClick} aria-pressed={activo || undefined} aria-label={etiqueta} title={etiqueta}
      style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, minHeight: 40, padding: "0 10px", borderRadius: radios.medio, border: `1px solid ${activo ? paleta.accent : paleta.border}`, background: activo ? paleta.accentSoft : paleta.card, color: activo ? paleta.accentTexto : paleta.text, fontFamily: "inherit", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
      <Icono nombre={nombre} tamano={16} color={activo ? paleta.accentTexto : paleta.muted} />{etiqueta}
    </button>
  );
  const seccion = (titulo, hijos) => (
    <section aria-label={titulo} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <h3 style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: paleta.dim }}>{titulo}</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>{hijos}</div>
    </section>
  );
  const selectEstilo = { minHeight: 30, width: "100%", borderRadius: radios.chico, border: `1px solid ${paleta.border}`, background: paleta.card, color: paleta.text, fontFamily: "inherit", fontSize: 15, fontWeight: 600, padding: "0 6px" };

  return (
    <div role="dialog" aria-modal="true" aria-label={p.name || t("ficha.producto")} onClick={onCerrar}
      style={{ position: "fixed", inset: 0, zIndex: 58, background: "rgba(5,8,15,0.92)", display: "flex" }}>
      {/* La foto, protagonista y entera */}
      <div style={{ flex: 1, minWidth: 0, position: "relative" }}>
        <div onClick={e => { e.stopPropagation(); if (fotos.length) setFotoGrande(true); }} title={fotos.length ? t("escritorio.fotoGrande") : undefined}
          style={{ position: "absolute", top: 72, left: 84, right: 84, bottom: conTiras ? 100 : 40, display: "flex", alignItems: "center", justifyContent: "center", cursor: fotos.length ? "zoom-in" : "default" }}>
          {fotos.length ? <Miniatura p={p} i={i} completa Foto={Foto} tLegacy={tLegacy} paleta={paleta} estilo={{ ...FOTO_ENTERA, borderRadius: 8 }} />
            : <div style={{ color: "rgba(255,255,255,0.6)", display: "grid", placeItems: "center", gap: 8 }}><Icono nombre="foto" tamano={48} color="rgba(255,255,255,0.6)" /><span>{t("ficha.sinFoto")}</span></div>}
        </div>
        <div style={{ position: "absolute", top: 14, left: 16, display: "flex", alignItems: "center", gap: 10, color: "#fff" }} onClick={e => e.stopPropagation()}>
          {redondoOscuro("cerrar", t("escritorio.cerrarVistaRapida"), onCerrar)}
          {posicion && <span style={{ fontSize: 13, opacity: 0.8 }}>{t("ficha.posicion", posicion)}</span>}
        </div>
        {onAnterior && <span style={{ position: "absolute", left: 20, top: "50%", transform: "translateY(-50%)" }} onClick={e => e.stopPropagation()}>{redondoOscuro("anterior", t("escritorio.anterior"), onAnterior)}</span>}
        {onSiguiente && <span style={{ position: "absolute", right: 20, top: "50%", transform: "translateY(-50%)" }} onClick={e => e.stopPropagation()}>{redondoOscuro("siguiente", t("escritorio.siguiente"), onSiguiente)}</span>}
        {conTiras && (
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 20, display: "flex", justifyContent: "center", gap: 8 }} onClick={e => e.stopPropagation()}>
            {fotos.map((_, k) => (
              <button key={k} type="button" onClick={() => setFoto(k)} aria-pressed={i === k} aria-label={t("escritorio.fotoDe", { n: k + 1, total: fotos.length })}
                style={{ width: 56, height: 56, borderRadius: radios.chico, overflow: "hidden", padding: 0, border: `2px solid ${i === k ? "#fff" : "rgba(255,255,255,0.3)"}`, background: "#000", cursor: "pointer" }}>
                <Miniatura p={p} i={k} Foto={Foto} tLegacy={tLegacy} paleta={paleta} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Los datos: quién es, qué hago, y después los datos en tres secciones */}
      <aside onClick={e => e.stopPropagation()} aria-label={t("ficha.datos")} style={{ width: ANCHO_DATOS, flexShrink: 0, background: paleta.card, color: paleta.text, overflowY: "auto", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "22px 22px 0", display: "flex", flexDirection: "column", gap: 6 }}>
          {editandoNombre
            ? <input autoFocus value={nombreBorrador} aria-label={t("ficha.nombre")} onChange={e => setNombreBorrador(e.target.value)}
                onBlur={() => { setEditandoNombre(false); const v = nombreBorrador.trim(); if (v && v !== p.name) guardar({ name: v }); }}
                onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") { e.stopPropagation(); setEditandoNombre(false); } }}
                style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.2, color: paleta.text, fontFamily: "inherit", border: `1px solid ${paleta.accent}`, borderRadius: radios.chico, padding: "4px 8px", background: paleta.surface, outline: "none", width: "100%", boxSizing: "border-box" }} />
            : <button type="button" onClick={() => { setNombreBorrador(p.name || ""); setEditandoNombre(true); }} title={t("comun.editar")} style={{ textAlign: "left", border: "none", background: "none", padding: 0, fontFamily: "inherit", cursor: "text" }}>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, lineHeight: 1.2, color: paleta.text, overflowWrap: "anywhere" }}>{p.name || t("catalogo.procesandoNombre")}</h2>
              </button>}
          {supplier ? (
            <button type="button" onClick={() => onVerProveedor?.(supplier)} style={{ display: "flex", alignItems: "center", gap: 8, border: "none", background: "none", padding: 0, fontFamily: "inherit", cursor: "pointer", color: paleta.accentTexto, fontSize: 15, fontWeight: 600, textAlign: "left" }}>
              <Icono nombre="proveedor" tamano={16} color={paleta.accentTexto} /><span style={{ flex: 1, minWidth: 0 }}>{supplier.company || `#${supplier.id}`}</span><Icono nombre="siguiente" tamano={14} color={paleta.dim} />
            </button>
          ) : <p style={{ ...texto("pie"), color: paleta.dim, margin: 0 }}>{t("ficha.sinProveedor")}</p>}
          <p style={{ ...texto("pie"), color: paleta.dim, margin: 0 }}>{[district?.name, t("ficha.capturado", { cuando: haceCuanto(p.createdAt) })].filter(Boolean).join(" · ")}</p>
        </div>

        <div style={{ padding: "16px 22px 18px", borderBottom: `1px solid ${paleta.border}`, display: "flex", flexDirection: "column", gap: 8 }}>
          <Boton variante="principal" ancho="total" icono="pedido" deshabilitado={!supplier} onClick={() => onAgregarAlPedido?.(p)}>{t("escritorio.agregarAlPedido")}</Boton>
          <div style={{ display: "flex", gap: 8 }}>
            {chip("favorito", p.favorito ? t("escritorio.quitarFavorito") : t("escritorio.favorito"), () => (onFavorito ? onFavorito(p) : guardar({ favorito: p.favorito ? 0 : 1 })), !!p.favorito)}
            {chip(p.descartado ? "reintentar" : "ojoCerrado", p.descartado ? t("escritorio.restaurar") : t("escritorio.descartar"), () => (onDescartar ? onDescartar(p) : guardar({ descartado: p.descartado ? 0 : 1 })), !!p.descartado)}
            {fotos.length > 0 && chip("expandir", t("escritorio.fotoGrande"), () => setFotoGrande(true))}
          </div>
        </div>

        <div style={{ padding: "18px 22px 24px", display: "flex", flexDirection: "column", gap: 22 }}>
          {seccion(t("ficha.seccionCompra"), <>
            <Dato etiqueta={`${t("ficha.precio")} ${moneda}`} valor={p.price} tipo="numero" destacado color={paleta.green} onChange={v => guardar({ price: v == null ? null : String(v) })} />
            <Dato etiqueta={t("ficha.moq")} valor={p.moq} tipo="numero" destacado onChange={v => guardar({ moq: v == null ? null : String(v) })} />
            {settings?.datosDeCompra?.piezasPorCaja !== false && <Dato etiqueta={t("ficha.piezasPorCaja")} valor={p.piezasPorCaja} tipo="numero" onChange={v => guardar({ piezasPorCaja: v })} />}
            {settings?.datosDeCompra?.cbmPorCaja !== false && <Dato etiqueta={t("ficha.cbmPorCaja")} valor={p.cbmPorCaja} tipo="numero" sufijo="CBM" onChange={v => guardar({ cbmPorCaja: v })} />}
            {(p.moq || p.moqBase) && (
              <Dato ancho={2} etiqueta={t("ficha.moqBase")} hijos={
                <Segmentado etiqueta={t("ficha.moqBase")} valor={p.moqBase || null} onChange={v => guardar({ moqBase: v })} estilo={{ marginTop: 4 }}
                  opciones={[{ valor: "producto", texto: t("ficha.basePorProducto") }, { valor: "caja", texto: t("ficha.basePorCaja") }, { valor: "pedido", texto: t("ficha.basePorPedido") }]} />
              } />
            )}
          </>)}

          {seccion(t("ficha.seccionProducto"), <>
            <Dato etiqueta={t("ficha.categoria")} valor={p.category} onChange={v => guardar({ category: v || null })} />
            <Dato etiqueta={t("ficha.materiales")} valor={materiales} onChange={v => guardar({ material: v ? v.split(",").map(x => x.trim()).filter(Boolean) : [] })} />
            <Dato ancho={2} etiqueta={t("ficha.proveedor")} hijos={
              <select value={p.supplierId ?? ""} aria-label={t("ficha.proveedor")} onChange={e => { const id = e.target.value === "" ? null : Number(e.target.value); const s = suppliers.find(x => x.id === id); guardar({ supplierId: id, supplierCompany: s?.company || null }); }} style={selectEstilo}>
                <option value="">{t("ficha.sinProveedor")}</option>
                {[...suppliers].sort((a, b) => (a.company || "").localeCompare(b.company || "")).map(s => <option key={s.id} value={s.id}>{s.company || `#${s.id}`}</option>)}
              </select>
            } />
            {camposPropios.map(c => (
              <Dato key={c.id} etiqueta={c.nombre} valor={p.extras?.[c.clave]} tipo={c.tipo === "numero" ? "numero" : "texto"} onChange={v => guardar(cambioDeExtra(p, `${PREFIJO_EXTRA}${c.clave}`, v, c.tipo))} />
            ))}
          </>)}

          {seccion(t("ficha.notas"), <Dato ancho={2} etiqueta={t("ficha.notas")} valor={p.notes} multilinea onChange={v => guardar({ notes: v })} />)}

          <div>
            {!confirmando
              ? <Boton variante="fantasma" icono="borrar" onClick={() => setConfirmando(true)}>{t("ficha.eliminar")}</Boton>
              : (
                <div style={{ border: `1px solid ${paleta.red}`, borderRadius: radios.grande, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                  <p style={{ ...texto("cuerpo", { fontWeight: 600 }), margin: 0 }}>{t("escritorio.eliminarSeguro")}</p>
                  <p style={{ ...texto("pie"), color: paleta.muted, margin: 0 }}>{t("escritorio.eliminarTexto")}</p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Boton variante="peligro" onClick={() => { setConfirmando(false); onEliminar?.(p); }}>{t("comun.borrar")}</Boton>
                    <Boton variante="secundario" onClick={() => setConfirmando(false)}>{t("comun.cancelar")}</Boton>
                  </div>
                </div>
              )}
          </div>
        </div>
      </aside>

      {fotoGrande && fotos.length > 0 && (
        <div role="dialog" aria-modal="true" aria-label={t("escritorio.fotoGrande")} onClick={e => { e.stopPropagation(); setFotoGrande(false); }} style={{ position: "fixed", inset: 0, zIndex: 62, background: "rgba(0,0,0,0.96)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, cursor: "zoom-out" }}>
          <Miniatura p={p} i={i} completa Foto={Foto} tLegacy={tLegacy} paleta={paleta} estilo={FOTO_ENTERA} />
          <button type="button" onClick={e => { e.stopPropagation(); setFotoGrande(false); }} aria-label={t("escritorio.cerrarFoto")} title={`${t("escritorio.cerrarFoto")} · Esc`} style={{ position: "absolute", top: 14, right: 16, width: 44, height: 44, borderRadius: 22, border: "none", background: "rgba(255,255,255,0.14)", display: "grid", placeItems: "center", cursor: "pointer" }}><Icono nombre="cerrar" tamano={20} color="#fff" /></button>
          {fotos.length > 1 && (
            <div style={{ position: "absolute", left: 0, right: 0, bottom: 16, display: "flex", justifyContent: "center", gap: 8 }} onClick={e => e.stopPropagation()}>
              <button type="button" onClick={() => setFoto((i - 1 + fotos.length) % fotos.length)} aria-label={t("escritorio.fotoAnterior")} style={{ width: 40, height: 40, borderRadius: 20, border: "none", background: "rgba(255,255,255,0.14)", display: "grid", placeItems: "center", cursor: "pointer" }}><Icono nombre="anterior" tamano={18} color="#fff" /></button>
              <span style={{ color: "#fff", fontSize: 13, alignSelf: "center", opacity: 0.85 }}>{t("escritorio.fotoDe", { n: i + 1, total: fotos.length })}</span>
              <button type="button" onClick={() => setFoto((i + 1) % fotos.length)} aria-label={t("escritorio.fotoSiguiente")} style={{ width: 40, height: 40, borderRadius: 20, border: "none", background: "rgba(255,255,255,0.14)", display: "grid", placeItems: "center", cursor: "pointer" }}><Icono nombre="siguiente" tamano={18} color="#fff" /></button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export const fotoCompleta = (p, i = 0) => p?.photos?.[i] || respaldoDe(p, i) || null;
