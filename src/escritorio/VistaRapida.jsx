/**
 * La vista rápida (25/09, Nati: "preferiría que se abra en la pantalla a modo vista rápida"; el
 * concepto "la foto primero" del teléfono llevado a la compu). Tocás un producto y se abre encima
 * de todo: la foto grande a la izquierda sobre fondo oscuro, los datos a la derecha con las acciones
 * arriba (Agregar al pedido es la más importante y no se esconde). ← → pasan al vecino, Esc cierra.
 */
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSistema } from "../sistema/SistemaProvider.jsx";
import { Boton, Campo, Segmentado, Icono } from "../componentes/index.js";
import { haceCuanto } from "../idiomas/formato.js";
import { respaldoDe } from "../lib/miniaturas.js";
import { Miniatura } from "./util.jsx";
import { PREFIJO_EXTRA, cambioDeExtra } from "./camposPersonalizados.js";

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

  const redondoOscuro = (nombre, etiqueta, onClick, extra = {}) => (
    <button type="button" onClick={onClick} aria-label={etiqueta} title={etiqueta} style={{ width: 44, height: 44, borderRadius: 22, border: "none", background: "rgba(255,255,255,0.14)", display: "grid", placeItems: "center", cursor: "pointer", ...extra }}>
      <Icono nombre={nombre} tamano={20} color="#fff" />
    </button>
  );
  const chip = (nombre, etiqueta, onClick, activo = false) => (
    <button type="button" onClick={onClick} aria-pressed={activo || undefined} aria-label={etiqueta} title={etiqueta}
      style={{ display: "inline-flex", alignItems: "center", gap: 6, minHeight: 38, padding: "0 12px", borderRadius: 999, border: `1px solid ${activo ? paleta.accent : paleta.border}`, background: activo ? paleta.accentSoft : paleta.card, color: activo ? paleta.accentTexto : paleta.text, fontFamily: "inherit", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
      <Icono nombre={nombre} tamano={16} color={activo ? paleta.accentTexto : paleta.muted} />{etiqueta}
    </button>
  );

  return (
    <div role="dialog" aria-modal="true" aria-label={p.name || t("ficha.producto")} onClick={onCerrar}
      style={{ position: "fixed", inset: 0, zIndex: 58, background: "rgba(5,8,15,0.92)", display: "flex" }}>
      {/* La foto, protagonista */}
      <div style={{ flex: 1, minWidth: 0, position: "relative", display: "grid", placeItems: "center", padding: "64px 84px 96px" }}>
        <div onClick={e => { e.stopPropagation(); if (fotos.length) setFotoGrande(true); }} title={fotos.length ? t("escritorio.fotoGrande") : undefined} style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", cursor: fotos.length ? "zoom-in" : "default" }}>
          {fotos.length ? <Miniatura p={p} i={i} completa Foto={Foto} tLegacy={tLegacy} paleta={paleta} estilo={{ objectFit: "contain", width: "100%", height: "100%", borderRadius: 8 }} />
            : <div style={{ color: "rgba(255,255,255,0.6)", display: "grid", placeItems: "center", gap: 8 }}><Icono nombre="foto" tamano={48} color="rgba(255,255,255,0.6)" /><span>{t("ficha.sinFoto")}</span></div>}
        </div>
        <div style={{ position: "absolute", top: 14, left: 16, display: "flex", alignItems: "center", gap: 10, color: "#fff" }} onClick={e => e.stopPropagation()}>
          {redondoOscuro("cerrar", t("escritorio.cerrarVistaRapida"), onCerrar)}
          {posicion && <span style={{ fontSize: 13, opacity: 0.8 }}>{t("ficha.posicion", posicion)}</span>}
        </div>
        {onAnterior && <span style={{ position: "absolute", left: 20, top: "50%", transform: "translateY(-50%)" }} onClick={e => e.stopPropagation()}>{redondoOscuro("anterior", t("escritorio.anterior"), onAnterior)}</span>}
        {onSiguiente && <span style={{ position: "absolute", right: 20, top: "50%", transform: "translateY(-50%)" }} onClick={e => e.stopPropagation()}>{redondoOscuro("siguiente", t("escritorio.siguiente"), onSiguiente)}</span>}
        {fotos.length > 1 && (
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

      {/* Los datos: las acciones arriba, lo esencial grande, el resto en filas */}
      <aside onClick={e => e.stopPropagation()} aria-label={t("ficha.datos")} style={{ width: 440, flexShrink: 0, background: paleta.card, color: paleta.text, overflowY: "auto", display: "flex", flexDirection: "column" }}>
        <div style={{ position: "sticky", top: 0, background: paleta.card, padding: "16px 20px 12px", borderBottom: `1px solid ${paleta.border}`, display: "flex", flexDirection: "column", gap: 10, zIndex: 1 }}>
          <Boton variante="principal" ancho="total" icono="pedido" deshabilitado={!supplier} onClick={() => onAgregarAlPedido?.(p)}>{t("escritorio.agregarAlPedido")}</Boton>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {chip("favorito", p.favorito ? t("escritorio.quitarFavorito") : t("escritorio.favorito"), () => (onFavorito ? onFavorito(p) : guardar({ favorito: p.favorito ? 0 : 1 })), !!p.favorito)}
            {chip(p.descartado ? "reintentar" : "ojoCerrado", p.descartado ? t("escritorio.restaurar") : t("escritorio.descartar"), () => (onDescartar ? onDescartar(p) : guardar({ descartado: p.descartado ? 0 : 1 })), !!p.descartado)}
            {fotos.length > 0 && chip("expandir", t("escritorio.fotoGrande"), () => setFotoGrande(true))}
          </div>
        </div>

        <div style={{ padding: "16px 20px 24px", display: "flex", flexDirection: "column", gap: 4 }}>
          {editandoNombre
            ? <Campo etiqueta={t("ficha.nombre")} valor={p.name} apilado onChange={v => { if (v) guardar({ name: v }); setEditandoNombre(false); }} />
            : <button type="button" onClick={() => setEditandoNombre(true)} title={t("comun.editar")} style={{ textAlign: "left", border: "none", background: "none", padding: 0, fontFamily: "inherit", cursor: "text" }}>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, lineHeight: 1.2, color: paleta.text, overflowWrap: "anywhere" }}>{p.name || t("catalogo.procesandoNombre")}</h2>
              </button>}
          <p style={{ margin: "6px 0 2px", fontSize: 20, fontWeight: 700, color: p.price ? paleta.green : paleta.dim, fontVariantNumeric: "tabular-nums" }}>
            {p.price ? `${moneda} ${p.price}` : t("escritorio.sinPrecio")}{p.moq ? <span style={{ fontSize: 14, fontWeight: 500, color: paleta.muted }}> · MOQ {p.moq}{p.moqBase === "caja" ? ` ${t("ficha.basePorCaja")}` : p.moqBase === "pedido" ? ` ${t("ficha.basePorPedido")}` : ""}</span> : null}
          </p>
          {supplier ? (
            <button type="button" onClick={() => onVerProveedor?.(supplier)} style={{ display: "flex", alignItems: "center", gap: 8, border: "none", background: "none", padding: "6px 0", fontFamily: "inherit", cursor: "pointer", color: paleta.accentTexto, fontSize: 14, fontWeight: 600, textAlign: "left" }}>
              <Icono nombre="proveedor" tamano={16} color={paleta.accentTexto} /><span style={{ flex: 1 }}>{supplier.company || `#${supplier.id}`}{supplier.contact ? <span style={{ color: paleta.muted, fontWeight: 400 }}> · {supplier.contact}</span> : null}</span><Icono nombre="siguiente" tamano={14} color={paleta.dim} />
            </button>
          ) : <p style={{ ...texto("pie"), color: paleta.dim, margin: "6px 0" }}>{t("ficha.sinProveedor")}</p>}
          {district && <p style={{ ...texto("pie"), color: paleta.dim, margin: "0 0 10px" }}>{district.name} · {t("ficha.capturado", { cuando: haceCuanto(p.createdAt) })}</p>}

          <Campo etiqueta={`${t("ficha.precio")} ${moneda}`} valor={p.price} tipo="numero" onChange={v => guardar({ price: v == null ? null : String(v) })} />
          <Campo etiqueta={t("ficha.moq")} valor={p.moq} tipo="numero" onChange={v => guardar({ moq: v == null ? null : String(v) })} />
          {(p.moq || p.moqBase) && (
            <div style={{ padding: "8px 0 10px", borderBottom: `1px solid ${paleta.border}` }}>
              <Segmentado etiqueta={t("ficha.moqBase")} valor={p.moqBase || null} onChange={v => guardar({ moqBase: v })}
                opciones={[{ valor: "producto", texto: t("ficha.basePorProducto") }, { valor: "caja", texto: t("ficha.basePorCaja") }, { valor: "pedido", texto: t("ficha.basePorPedido") }]} />
            </div>
          )}
          {settings?.datosDeCompra?.piezasPorCaja !== false && <Campo etiqueta={t("ficha.piezasPorCaja")} valor={p.piezasPorCaja} tipo="numero" onChange={v => guardar({ piezasPorCaja: v })} />}
          {settings?.datosDeCompra?.cbmPorCaja !== false && <Campo etiqueta={t("ficha.cbmPorCaja")} valor={p.cbmPorCaja} tipo="numero" sufijo="CBM" onChange={v => guardar({ cbmPorCaja: v })} />}
          <Campo etiqueta={t("ficha.categoria")} valor={p.category} onChange={v => guardar({ category: v || null })} />
          <Campo etiqueta={t("ficha.materiales")} valor={materiales} onChange={v => guardar({ material: v ? v.split(",").map(x => x.trim()).filter(Boolean) : [] })} />
          <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, minHeight: 44, borderBottom: `1px solid ${paleta.border}` }}>
            <span style={{ ...texto("cuerpo", { fontWeight: 400 }), color: paleta.muted }}>{t("ficha.proveedor")}</span>
            <select value={p.supplierId ?? ""} onChange={e => { const id = e.target.value === "" ? null : Number(e.target.value); const s = suppliers.find(x => x.id === id); guardar({ supplierId: id, supplierCompany: s?.company || null }); }}
              style={{ maxWidth: 220, minHeight: 32, borderRadius: radios.chico, border: `1px solid ${paleta.border}`, background: paleta.card, color: paleta.text, fontFamily: "inherit", fontSize: 14, padding: "0 8px", textAlign: "right" }}>
              <option value="">{t("ficha.sinProveedor")}</option>
              {[...suppliers].sort((a, b) => (a.company || "").localeCompare(b.company || "")).map(s => <option key={s.id} value={s.id}>{s.company || `#${s.id}`}</option>)}
            </select>
          </label>
          {camposPropios.map(c => (
            <Campo key={c.id} etiqueta={c.nombre} valor={p.extras?.[c.clave]} tipo={c.tipo === "numero" ? "numero" : "texto"} onChange={v => guardar(cambioDeExtra(p, `${PREFIJO_EXTRA}${c.clave}`, v, c.tipo))} />
          ))}
          <Campo etiqueta={t("ficha.notas")} valor={p.notes} onChange={v => guardar({ notes: v })} multilinea apilado />

          <div style={{ marginTop: 18 }}>
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
        <div role="dialog" aria-modal="true" aria-label={t("escritorio.fotoGrande")} onClick={e => { e.stopPropagation(); setFotoGrande(false); }} style={{ position: "fixed", inset: 0, zIndex: 62, background: "rgba(0,0,0,0.96)", display: "grid", placeItems: "center", padding: 24, cursor: "zoom-out" }}>
          <Miniatura p={p} i={i} completa Foto={Foto} tLegacy={tLegacy} paleta={paleta} estilo={{ objectFit: "contain", width: "100%", height: "100%" }} />
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
