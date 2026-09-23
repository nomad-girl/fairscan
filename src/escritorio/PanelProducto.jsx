/**
 * El panel de la derecha del escritorio: la ficha del producto elegido, editable en el lugar
 * (wireframe "FairScan en la computadora", opción A, decisiones 1 y 2 de Nati del 23/09).
 * Las mismas filas que la hoja del teléfono (opción A del 22/09): una por dato, sin Guardar.
 */
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSistema } from "../sistema/SistemaProvider.jsx";
import { Boton, Campo, Bloque, Segmentado, Icono, Fila } from "../componentes/index.js";
import { haceCuanto } from "../idiomas/formato.js";
import { Miniatura } from "./util.jsx";

export function PanelProducto({
  producto: p, suppliers = [], districts = [], moneda = "USD", settings, Foto, tLegacy,
  posicion = null, onAnterior, onSiguiente, onCerrar, onVerFoto, panelAmplio = false, onAlternarPanel,
  onActualizar, onEliminar, onAgregarAlPedido, onVerProveedor,
}) {
  const { t } = useTranslation();
  const { paleta, radios, texto } = useSistema();
  const [foto, setFoto] = useState(0);
  const [confirmando, setConfirmando] = useState(false);
  useEffect(() => { setFoto(0); setConfirmando(false); }, [p?.id]);
  if (!p) return null;

  const guardar = (cambios) => onActualizar?.(p.id, cambios);
  const supplier = suppliers.find(s => s.id === p.supplierId) || null;
  const district = districts.find(d => d.id === p.districtId) || null;
  const fotos = p.photos?.length ? p.photos : (p.photoUrls || []);
  const materiales = Array.isArray(p.material) ? p.material.join(", ") : (p.material || "");

  const redondo = (nombre, etiqueta, onClick, deshabilitado = false) => (
    <button type="button" onClick={onClick} disabled={deshabilitado} aria-label={etiqueta} title={etiqueta}
      style={{ width: 32, height: 32, borderRadius: 16, border: `1px solid ${paleta.border}`, background: paleta.card, display: "grid", placeItems: "center", cursor: deshabilitado ? "default" : "pointer", opacity: deshabilitado ? 0.4 : 1 }}>
      <Icono nombre={nombre} tamano={16} color={paleta.text} />
    </button>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: 16, color: paleta.text }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {redondo("anterior", t("escritorio.anterior"), onAnterior, !onAnterior)}
        {redondo("siguiente", t("escritorio.siguiente"), onSiguiente, !onSiguiente)}
        <span style={{ ...texto("pie"), color: paleta.dim, flex: 1, textAlign: "center" }}>{posicion ? t("ficha.posicion", posicion) : ""}</span>
        {onAlternarPanel && redondo(panelAmplio ? "siguiente" : "anterior", panelAmplio ? t("escritorio.achicarPanel") : t("escritorio.agrandarPanel"), onAlternarPanel)}
        {redondo("cerrar", t("escritorio.cerrarPanel"), onCerrar)}
      </div>

      {/* La foto manda: cuadrada, grande; abajo las otras tomas */}
      <div style={{ borderRadius: radios.grande, overflow: "hidden", aspectRatio: "1", background: "#000", position: "relative" }}>
        {/* Clic en la foto: a pantalla completa (Nati, 23/09: "que las fotos se puedan ver más grandes") */}
        <button type="button" onClick={() => fotos.length && onVerFoto?.(foto)} aria-label={t("escritorio.verFotoGrande")} disabled={!fotos.length}
          style={{ position: "absolute", inset: 0, padding: 0, border: "none", background: "#000", cursor: fotos.length ? "zoom-in" : "default" }}>
          {fotos.length ? <Miniatura p={p} i={foto} Foto={Foto} tLegacy={tLegacy} paleta={paleta} /> : <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center" }}><Icono nombre="foto" tamano={40} color="rgba(255,255,255,0.6)" /></div>}
        </button>
        <button type="button" onClick={() => guardar({ favorito: p.favorito ? 0 : 1 })} aria-pressed={!!p.favorito} aria-label={p.favorito ? t("ficha.quitarFavorito") : t("ficha.marcarFavorito")}
          style={{ position: "absolute", top: 10, right: 10, width: 36, height: 36, borderRadius: 18, border: "none", background: p.favorito ? paleta.accent : "rgba(10,14,23,0.55)", display: "grid", placeItems: "center", cursor: "pointer" }}>
          <Icono nombre="favorito" tamano={18} color="#fff" />
        </button>
      </div>
      {fotos.length > 1 && (
        <div style={{ display: "flex", gap: 6, overflowX: "auto" }}>
          {fotos.map((_, i) => (
            <button key={i} type="button" onClick={() => setFoto(i)} aria-label={`${t("ficha.fotos", { count: fotos.length })} · ${i + 1}`} aria-pressed={foto === i}
              style={{ width: 52, height: 52, flexShrink: 0, borderRadius: radios.chico, overflow: "hidden", padding: 0, border: `2px solid ${foto === i ? paleta.accent : "transparent"}`, background: paleta.surface, cursor: "pointer" }}>
              <Miniatura p={p} i={i} Foto={Foto} tLegacy={tLegacy} paleta={paleta} />
            </button>
          ))}
        </div>
      )}

      {district && <p style={{ ...texto("pie"), color: paleta.dim, margin: 0 }}>{district.name} · {t("ficha.capturado", { cuando: haceCuanto(p.createdAt) })}</p>}

      <Bloque titulo={t("ficha.seccionProducto")}>
        <Campo etiqueta={t("ficha.nombre")} valor={p.name} onChange={v => { if (v) guardar({ name: v }); }} />
        <Campo etiqueta={t("ficha.categoria")} valor={p.category} onChange={v => guardar({ category: v || null })} />
        <Campo etiqueta={t("ficha.materiales")} valor={materiales} onChange={v => guardar({ material: v ? v.split(",").map(x => x.trim()).filter(Boolean) : [] })} />
      </Bloque>

      <Bloque titulo={t("ficha.seccionCompra")}>
        <Campo etiqueta={`${t("ficha.precio")} ${moneda}`} valor={p.price} tipo="numero" onChange={v => guardar({ price: v == null ? null : String(v) })} />
        <Campo etiqueta={t("ficha.moq")} valor={p.moq} tipo="numero" onChange={v => guardar({ moq: v == null ? null : String(v) })} />
        {(p.moq || p.moqBase) && (
          <div style={{ padding: "8px 0 10px" }}>
            <Segmentado etiqueta={t("ficha.moqBase")} valor={p.moqBase || null} onChange={v => guardar({ moqBase: v })}
              opciones={[{ valor: "producto", texto: t("ficha.basePorProducto") }, { valor: "caja", texto: t("ficha.basePorCaja") }, { valor: "pedido", texto: t("ficha.basePorPedido") }]} />
          </div>
        )}
        {settings?.datosDeCompra?.piezasPorCaja !== false && <Campo etiqueta={t("ficha.piezasPorCaja")} valor={p.piezasPorCaja} tipo="numero" onChange={v => guardar({ piezasPorCaja: v })} />}
        {settings?.datosDeCompra?.cbmPorCaja !== false && <Campo etiqueta={t("ficha.cbmPorCaja")} valor={p.cbmPorCaja} tipo="numero" sufijo="CBM" onChange={v => guardar({ cbmPorCaja: v })} />}
      </Bloque>

      <section>
        <h3 style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: paleta.dim, margin: "4px 2px 8px" }}>{t("ficha.proveedor")}</h3>
        {supplier ? (
          <Fila onClick={() => onVerProveedor?.(supplier)} flecha
            miniatura={(supplier.cardPhoto || supplier.cardPhotoUrl) ? <img src={supplier.cardPhoto || supplier.cardPhotoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Icono nombre="proveedor" tamano={20} color={paleta.dim} />}
            titulo={supplier.company || `#${supplier.id}`} subtitulo={supplier.contact || supplier.boothNumber || ""} />
        ) : <p style={{ ...texto("cuerpo", { fontWeight: 400 }), color: paleta.dim, margin: "0 0 6px" }}>{t("ficha.sinProveedor")}</p>}
        <label style={{ display: "block", marginTop: 8 }}>
          <span style={{ ...texto("pie"), color: paleta.muted, display: "block", marginBottom: 4 }}>{t("ficha.cambiarProveedor")}</span>
          <select value={p.supplierId ?? ""} onChange={e => { const id = e.target.value === "" ? null : Number(e.target.value); const s = suppliers.find(x => x.id === id); guardar({ supplierId: id, supplierCompany: s?.company || null }); }}
            style={{ width: "100%", minHeight: 36, borderRadius: radios.chico, border: `1px solid ${paleta.border}`, background: paleta.card, color: paleta.text, fontFamily: "inherit", fontSize: 14, padding: "0 8px" }}>
            <option value="">{t("ficha.sinProveedor")}</option>
            {[...suppliers].sort((a, b) => (a.company || "").localeCompare(b.company || "")).map(s => <option key={s.id} value={s.id}>{s.company || `#${s.id}`}</option>)}
          </select>
        </label>
      </section>

      <Bloque titulo={t("ficha.notas")}>
        <Campo etiqueta={t("ficha.notas")} valor={p.notes} onChange={v => guardar({ notes: v })} multilinea apilado />
      </Bloque>

      <Boton variante="principal" ancho="total" icono="pedido" deshabilitado={!supplier} onClick={() => onAgregarAlPedido?.(p)}>{t("escritorio.agregarAlPedido")}</Boton>
      {!confirmando
        ? <Boton variante="fantasma" ancho="total" icono="borrar" onClick={() => setConfirmando(true)}>{t("ficha.eliminar")}</Boton>
        : (
          <div style={{ background: paleta.card, border: `1px solid ${paleta.red}`, borderRadius: radios.grande, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            <p style={{ ...texto("cuerpo", { fontWeight: 600 }), margin: 0 }}>{t("escritorio.eliminarSeguro")}</p>
            <p style={{ ...texto("pie"), color: paleta.muted, margin: 0 }}>{t("escritorio.eliminarTexto")}</p>
            <div style={{ display: "flex", gap: 8 }}>
              <Boton variante="peligro" onClick={() => { setConfirmando(false); onEliminar?.(p); }}>{t("comun.borrar")}</Boton>
              <Boton variante="secundario" onClick={() => setConfirmando(false)}>{t("comun.cancelar")}</Boton>
            </div>
          </div>
        )}
    </div>
  );
}
