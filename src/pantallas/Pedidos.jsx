/**
 * Pedidos: la pantalla del consolidado (decisión 4 del 16/09). Por feria, un pedido por
 * proveedor con su estado (en curso, proforma enviada), los proveedores con favoritos y sin
 * pedido como "Armar ›", y abajo el total de la feria y cuánto contenedor va juntando.
 * Es su propia pantalla, no una pestaña del catálogo: el catálogo es feria, esto es casa.
 */
import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSistema } from "../sistema/SistemaProvider.jsx";
import { Boton, Chip, FilaDeChips, Fila, Precio, Icono } from "../componentes/index.js";
import { totalesDePedido, totalesDeFeria, proveedoresSinPedido } from "../lib/pedidos.js";
import { numero as fNumero, cbm as fCbm, fechaCorta } from "../idiomas/formato.js";

export function Pedidos({ pedidos = [], suppliers = [], products = [], districts = [], activeDistrictId = null, moneda = "USD", onBack, onAbrirPedido, onDescargarExcelFeria }) {
  const { t } = useTranslation();
  const { paleta, alturas, radios, texto, espacios } = useSistema();
  const [feria, setFeria] = useState(activeDistrictId ?? "todas");
  const filtro = feria === "todas" ? null : feria;
  const dinero = (n) => `${moneda} ${fNumero(n, { maximumFractionDigits: 2 })}`;

  const conContenido = useMemo(() => pedidos.filter(p => (p.items || []).length > 0 && (filtro == null || p.districtId === filtro)).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)), [pedidos, filtro]);
  const sinPedido = useMemo(() => proveedoresSinPedido(suppliers, products, conContenido, filtro), [suppliers, products, conContenido, filtro]);
  const tot = totalesDeFeria(conContenido, products);
  const feriaActual = districts.find(d => d.id === filtro) || null;
  const vacio = conContenido.length === 0 && sinPedido.length === 0;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: paleta.bg, color: paleta.text, fontFamily: "inherit" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: `calc(0px + 8px) ${espacios.margenLateral}px 8px`, minHeight: alturas.tocable + 16 }}>
        <button type="button" onClick={onBack} aria-label={t("comun.volver")} style={{ width: alturas.icono, height: alturas.icono, borderRadius: radios.medio, border: `1px solid ${paleta.border}`, background: paleta.card, display: "grid", placeItems: "center", cursor: "pointer", flexShrink: 0 }}><Icono nombre="volver" tamano={20} color={paleta.muted} /></button>
        <h1 style={{ ...texto("titulo"), margin: 0, flex: 1 }}>{t("pedidos.titulo")}</h1>
      </div>

      <div style={{ flex: 1, overflowY: "auto", overscrollBehavior: "contain", WebkitOverflowScrolling: "touch", padding: `0 ${espacios.margenLateral}px 40px`, display: "flex", flexDirection: "column", gap: espacios.entreFilas, maxWidth: 720, width: "100%", margin: "0 auto", boxSizing: "border-box" }}>
        {districts.length > 1 && (
          <FilaDeChips>
            <Chip activo={feria === "todas"} onClick={() => setFeria("todas")}>{t("pedidos.todasLasFerias")}</Chip>
            {districts.map(d => <Chip key={d.id} activo={feria === d.id} onClick={() => setFeria(d.id)}>{d.name}</Chip>)}
          </FilaDeChips>
        )}

        {vacio && (
          <div style={{ textAlign: "center", padding: "40px 16px" }}>
            <Icono nombre="pedido" tamano={32} color={paleta.dim} />
            <p style={{ ...texto("destacado"), margin: "12px 0 6px" }}>{t("pedidos.vacioTitulo")}</p>
            <p style={{ ...texto("cuerpo", { fontWeight: 400 }), color: paleta.muted, margin: 0 }}>{t("pedidos.vacioTexto")}</p>
          </div>
        )}

        {conContenido.map(pedido => {
          const prov = suppliers.find(s => s.id === pedido.supplierId);
          if (!prov) return null;
          const tp = totalesDePedido(pedido, products);
          const estado = pedido.estado === "enviado" && pedido.enviadoEl ? t("pedidos.enviado", { fecha: fechaCorta(pedido.enviadoEl) }) : t("pedidos.enCurso");
          const sub = [tp.bultos ? `${fNumero(tp.bultos)} ${t("pedido.bultosCorto")}` : `${fNumero(tp.unidades)} ${t("pedido.unidadesCorto")}`, tp.cbm ? fCbm(tp.cbm) : null, estado].filter(Boolean).join(" · ");
          return <Fila key={pedido.id} onClick={() => onAbrirPedido?.(prov)} flecha titulo={<>{prov.favorito ? <><Icono nombre="favorito" tamano={13} color={paleta.accentTexto} /> </> : null}{prov.company || `#${prov.id}`}</>} subtitulo={sub} derecha={<Precio>{tp.total ? dinero(tp.total) : "—"}</Precio>} />;
        })}

        {sinPedido.map(({ proveedor, favoritos }) => (
          <Fila key={`sin-${proveedor.id}`} onClick={() => onAbrirPedido?.(proveedor)} flecha titulo={<>{proveedor.favorito ? <><Icono nombre="favorito" tamano={13} color={paleta.accentTexto} /> </> : null}{proveedor.company || `#${proveedor.id}`}</>}
            subtitulo={`${t("pedidos.sinPedido")}${favoritos ? ` · ${t("pedidos.favoritos", { count: favoritos })}` : ""}`}
            derecha={<span style={{ ...texto("pie", { fontWeight: 600 }), color: paleta.accentTexto }}>{t("pedidos.armar")}</span>} />
        ))}

        {conContenido.length > 0 && (
          <div style={{ background: paleta.card, border: `1px solid ${paleta.border}`, borderRadius: radios.grande, padding: "12px 14px", boxShadow: paleta.sombraTarjeta, display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
              <span style={{ ...texto("cuerpo", { fontWeight: 600 }) }}>{t("pedidos.totalFeria")}</span>
              <span style={{ ...texto("titulo"), color: paleta.green, fontVariantNumeric: "tabular-nums" }}>{dinero(tot.total)}</span>
            </div>
            <p style={{ ...texto("pie"), color: paleta.muted, margin: 0 }}>{[tot.bultos ? `${fNumero(tot.bultos)} ${t("pedido.bultosCorto")}` : null, `${fNumero(tot.unidades)} ${t("pedido.unidadesCorto")}`, tot.cbm ? fCbm(tot.cbm) : null].filter(Boolean).join(" · ")}</p>
            {tot.cbm > 0 && <p style={{ ...texto("pie"), color: paleta.muted, margin: 0 }}>{t("pedido.contenedor", { porcentaje: tot.porcentajeContenedor })}</p>}
            {onDescargarExcelFeria && <Boton variante="secundario" ancho="total" icono="excel" onClick={() => onDescargarExcelFeria(filtro, feriaActual)}>{t("pedidos.descargarExcel")}</Boton>}
          </div>
        )}
      </div>
    </div>
  );
}
