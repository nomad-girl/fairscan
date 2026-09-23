/**
 * Pedidos en el escritorio: la lista de pedidos de la feria como tabla, con totales y el Excel
 * de la feria; un pedido abierto usa la pantalla "Armar pedido" que ya existía (su tabla de
 * computadora), con precio y piezas por caja editables en la fila (decisión A del 23/09).
 */
import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSistema } from "../sistema/SistemaProvider.jsx";
import { Boton, Icono } from "../componentes/index.js";
import { ArmarPedido } from "../pantallas/ArmarPedido.jsx";
import { totalesDePedido, totalesDeFeria, proveedoresSinPedido } from "../lib/pedidos.js";
import { numero as fNumero, cbm as fCbm, fechaCorta } from "../idiomas/formato.js";
import { Miniatura } from "./util.jsx";

export function SeccionPedidos({
  pedidos = [], suppliers = [], products = [], districts = [], activeDistrictId = null, moneda = "USD", Foto, tLegacy,
  abierto = null, onAbrir, onCerrar, onGuardar, onEnviar, onVerProducto, onActualizarProducto, onDescargarExcelFeria,
}) {
  const { t } = useTranslation();
  const { paleta, radios, texto } = useSistema();
  const [eligiendo, setEligiendo] = useState(false);
  const feria = districts.find(d => d.id === activeDistrictId) || null;

  const delaFeria = useMemo(() => pedidos.filter(o => activeDistrictId == null || o.districtId === activeDistrictId), [pedidos, activeDistrictId]);
  const conContenido = useMemo(() => delaFeria.filter(o => (o.items || []).some(i => Number(i.cantidad) > 0)).sort((a, b) => (b.actualizadoEl || b.enviadoEl || b.createdAt || 0) - (a.actualizadoEl || a.enviadoEl || a.createdAt || 0)), [delaFeria]);
  const tot = totalesDeFeria(conContenido, products);
  const candidatos = useMemo(() => proveedoresSinPedido(suppliers, products, pedidos, activeDistrictId), [suppliers, products, pedidos, activeDistrictId]);
  const dinero = (n) => `${moneda} ${fNumero(n, { maximumFractionDigits: 2 })}`;

  if (abierto) {
    const supplier = suppliers.find(s => s.id === abierto.supplierId);
    const pedido = pedidos.find(o => o.id === abierto.pedidoId);
    if (supplier && pedido) {
      return (
        <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
          <ArmarPedido supplier={supplier} pedido={pedido} products={products} moneda={moneda} feria={districts.find(d => d.id === pedido.districtId) || null} Foto={Foto} tLegacy={tLegacy} primero={abierto.primero || null}
            onBack={onCerrar} onGuardar={(cambios) => onGuardar?.(pedido.id, cambios)} onEnviar={(via) => onEnviar?.(pedido, supplier, via)} onNavigateProduct={onVerProducto} onActualizarProducto={onActualizarProducto} />
        </div>
      );
    }
  }

  const columnas = "minmax(180px, 1.4fr) minmax(120px, 1fr) 90px 100px 90px 120px minmax(140px, 1fr)";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "0 4px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <h1 style={{ ...texto("titulo"), margin: 0, flex: 1 }}>{t("escritorio.pedidos")}{feria ? ` · ${feria.name}` : ""}</h1>
        {!eligiendo
          ? <Boton variante="principal" icono="mas" onClick={() => setEligiendo(true)}>{t("escritorio.crearPedido")}</Boton>
          : (
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ ...texto("pie"), color: paleta.muted }}>{t("escritorio.elegirProveedor")}</span>
              <select autoFocus defaultValue="" onChange={e => { const s = suppliers.find(x => x.id === Number(e.target.value)); setEligiendo(false); if (s) onAbrir?.(s); }} onBlur={() => setEligiendo(false)}
                style={{ minHeight: 36, borderRadius: radios.chico, border: `1px solid ${paleta.accent}`, background: paleta.card, color: paleta.text, fontFamily: "inherit", fontSize: 14, padding: "0 8px", minWidth: 220 }}>
                <option value="" disabled>{t("escritorio.elegirProveedor")}</option>
                {candidatos.map(s => <option key={s.id} value={s.id}>{s.company || `#${s.id}`}</option>)}
              </select>
            </label>
          )}
      </div>

      {conContenido.length === 0 ? (
        <div style={{ background: paleta.card, border: `1px solid ${paleta.border}`, borderRadius: radios.grande, padding: "40px 20px", textAlign: "center" }}>
          <Icono nombre="pedido" tamano={32} color={paleta.dim} />
          <p style={{ ...texto("destacado"), margin: "12px 0 6px" }}>{t("escritorio.sinPedidos")}</p>
          <p style={{ ...texto("cuerpo", { fontWeight: 400 }), color: paleta.muted, margin: 0 }}>{t("escritorio.sinPedidosPista")}</p>
        </div>
      ) : (
        <div role="table" aria-label={t("escritorio.pedidos")} style={{ background: paleta.card, border: `1px solid ${paleta.border}`, borderRadius: radios.grande, overflow: "auto" }}>
          <div role="row" style={{ display: "grid", gridTemplateColumns: columnas, gap: 8, padding: "8px 12px", borderBottom: `1px solid ${paleta.border}`, minWidth: 840 }}>
            {[t("escritorio.columnaProveedor"), t("escritorio.columnaLineas"), t("escritorio.columnaBultos"), t("escritorio.columnaUnidades"), t("pedido.cbm"), t("escritorio.columnaTotal"), t("escritorio.columnaEstado")].map(h => (
              <span key={h} role="columnheader" style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: paleta.dim, whiteSpace: "nowrap" }}>{h}</span>
            ))}
          </div>
          {conContenido.map(o => {
            const s = suppliers.find(x => x.id === o.supplierId);
            const tp = totalesDePedido(o, products);
            const lineas = (o.items || []).filter(i => Number(i.cantidad) > 0);
            const fotos = lineas.map(i => products.find(p => p.id === i.productId)).filter(Boolean).slice(0, 4);
            const estado = o.estado === "enviado" && o.enviadoEl ? t("pedidos.enviado", { fecha: fechaCorta(o.enviadoEl) }) : t("pedidos.enCurso");
            return (
              <div key={o.id} role="row" onClick={() => s && onAbrir?.(s)} onKeyDown={e => { if (e.key === "Enter" && s) onAbrir?.(s); }} tabIndex={0}
                style={{ display: "grid", gridTemplateColumns: columnas, gap: 8, alignItems: "center", padding: "10px 12px", borderBottom: `1px solid ${paleta.border}`, cursor: "pointer", minWidth: 840 }}>
                <span role="cell" style={{ ...texto("cuerpo"), whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s?.favorito ? <><Icono nombre="favorito" tamano={12} color={paleta.accentTexto} /> </> : null}{s?.company || t("proveedor.titulo")}</span>
                <span role="cell" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  {fotos.map(p => <span key={p.id} style={{ width: 28, height: 28, borderRadius: 6, overflow: "hidden", background: paleta.surface, flexShrink: 0 }}><Miniatura p={p} Foto={Foto} tLegacy={tLegacy} paleta={paleta} /></span>)}
                  <span style={{ ...texto("pie"), color: paleta.muted, marginLeft: 4 }}>{t("escritorio.productos", { count: lineas.length })}</span>
                </span>
                <span role="cell" style={{ fontVariantNumeric: "tabular-nums" }}>{tp.bultos ? fNumero(tp.bultos) : "—"}</span>
                <span role="cell" style={{ fontVariantNumeric: "tabular-nums" }}>{tp.unidades ? fNumero(tp.unidades) : "—"}</span>
                <span role="cell" style={{ fontVariantNumeric: "tabular-nums" }}>{tp.cbm ? fCbm(tp.cbm) : "—"}</span>
                <span role="cell" style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600, color: tp.total ? paleta.green : paleta.dim }}>{tp.total ? dinero(tp.total) : "—"}</span>
                <span role="cell" style={{ ...texto("pie"), color: o.estado === "enviado" ? paleta.green : paleta.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{estado}</span>
              </div>
            );
          })}
          <div role="row" style={{ display: "grid", gridTemplateColumns: columnas, gap: 8, alignItems: "center", padding: "10px 12px", background: paleta.bg, minWidth: 840 }}>
            <span role="cell" style={{ ...texto("cuerpo", { fontWeight: 600 }) }}>{t("escritorio.totalFeria")}</span>
            <span role="cell" style={{ ...texto("pie"), color: paleta.muted }}>{t("escritorio.productos", { count: conContenido.reduce((n, o) => n + (o.items || []).filter(i => Number(i.cantidad) > 0).length, 0) })}</span>
            <span role="cell" style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>{tot.bultos ? fNumero(tot.bultos) : "—"}</span>
            <span role="cell" style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>{tot.unidades ? fNumero(tot.unidades) : "—"}</span>
            <span role="cell" style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>{tot.cbm ? fCbm(tot.cbm) : "—"}</span>
            <span role="cell" style={{ fontVariantNumeric: "tabular-nums", fontWeight: 700, color: paleta.green }}>{tot.total ? dinero(tot.total) : "—"}</span>
            <span role="cell" style={{ ...texto("pie"), color: paleta.muted }}>{tot.cbm > 0 ? t("pedido.contenedor", { porcentaje: tot.porcentajeContenedor }) : ""}</span>
          </div>
        </div>
      )}

      {conContenido.length > 0 && (
        <div><Boton variante="secundario" icono="excel" onClick={() => onDescargarExcelFeria?.(activeDistrictId, feria)}>{t("escritorio.excelFeria")}</Boton></div>
      )}
    </div>
  );
}
