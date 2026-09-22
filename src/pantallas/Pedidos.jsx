/**
 * Pedidos como feed (decisión de Nati, 22/09: la lógica del feed en toda la app; pantalla 7 del wireframe).
 * Un pedido es un proveedor. Cada pedido es una pantalla: la foto del primer producto de fondo y los números
 * encima (total, productos, bultos, CBM), verde cuando ya se mandó. Deslizar arriba pasa al pedido de otro
 * proveedor; después vienen los proveedores con favoritos y sin pedido ("Armar pedido"), y al final el total
 * de la feria con el Excel. El detalle (cantidades por bultos, proforma) sigue siendo la lista de Armar pedido.
 */
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSistema } from "../sistema/SistemaProvider.jsx";
import { Boton, Chip, FilaDeChips, Icono } from "../componentes/index.js";
import { totalesDePedido, totalesDeFeria, proveedoresSinPedido } from "../lib/pedidos.js";
import { elegirMiniatura, respaldoDe } from "../lib/miniaturas.js";
import { numero as fNumero, cbm as fCbm, fechaCorta } from "../idiomas/formato.js";

export function Pedidos({ pedidos = [], suppliers = [], products = [], districts = [], activeDistrictId = null, moneda = "USD", Foto, tLegacy, onBack, onAbrirPedido, onDescargarExcelFeria }) {
  const { t } = useTranslation();
  const { paleta } = useSistema();
  const [feria, setFeria] = useState(activeDistrictId ?? "todas");
  const [i, setI] = useState(0);
  const filtro = feria === "todas" ? null : feria;
  const dinero = (n) => `${moneda} ${fNumero(n, { maximumFractionDigits: 2 })}`;

  const conContenido = useMemo(() => pedidos.filter(p => (p.items || []).length > 0 && (filtro == null || p.districtId === filtro)).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)), [pedidos, filtro]);
  const sinPedido = useMemo(() => proveedoresSinPedido(suppliers, products, conContenido, filtro), [suppliers, products, conContenido, filtro]);
  const tot = totalesDeFeria(conContenido, products);
  const feriaActual = districts.find(d => d.id === filtro) || null;

  // Las pantallas del feed: los pedidos, los proveedores sin pedido, el total de la feria (o el vacío)
  const pantallas = useMemo(() => {
    const xs = [];
    for (const pedido of conContenido) { const prov = suppliers.find(s => s.id === pedido.supplierId); if (prov) xs.push({ tipo: "pedido", clave: `p${pedido.id}`, pedido, prov }); }
    for (const { proveedor, favoritos } of sinPedido) xs.push({ tipo: "sin", clave: `s${proveedor.id}`, prov: proveedor, favoritos });
    xs.push(conContenido.length > 0 ? { tipo: "total", clave: "total" } : { tipo: "vacio", clave: "vacio" });
    return xs;
  }, [conContenido, sinPedido, suppliers]);
  const total = pantallas.length;
  const actual = pantallas[Math.min(i, total - 1)];
  const prev = i > 0 ? pantallas[i - 1] : null;
  const next = i + 1 < total ? pantallas[i + 1] : null;
  const cambiarFeria = (f) => { setFeria(f); setI(0); };

  // El paginador vertical (anterior · esta · siguiente)
  const pagerRef = useRef(null);
  const timerRef = useRef(null);
  const navegandoRef = useRef(false);
  const centro = prev ? 1 : 0;
  useLayoutEffect(() => { const el = pagerRef.current; if (el) el.scrollTop = centro * el.clientHeight; navegandoRef.current = false; }, [i, centro, feria]);
  const decidir = (el) => {
    if (navegandoRef.current) return;
    const h = Math.max(1, el.clientHeight);
    const k = Math.round(el.scrollTop / h);
    if (k === centro) return;
    if (k < centro && prev) { navegandoRef.current = true; setI(i - 1); }
    else if (k > centro && next) { navegandoRef.current = true; setI(i + 1); }
  };
  const onScrollPager = (e) => {
    const el = e.currentTarget;
    const h = Math.max(1, el.clientHeight);
    if (Math.abs(el.scrollTop - Math.round(el.scrollTop / h) * h) < 2) decidir(el);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => decidir(el), 220);
  };
  useEffect(() => () => clearTimeout(timerRef.current), []);

  const productosDe = (pedido) => (pedido.items || []).map(it => products.find(p => p.id === it.productId)).filter(Boolean);
  const foto = (p, estilo) => {
    const src = p ? (elegirMiniatura(p) || respaldoDe(p)) : null;
    if (!src) return <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center" }}><Icono nombre="pedido" tamano={40} color="rgba(255,255,255,0.5)" /></div>;
    return Foto ? <Foto src={p.photos?.[0] || src} respaldo={respaldoDe(p)} t={tLegacy} estilo={{ width: "100%", height: "100%", objectFit: "cover", display: "block", ...estilo }} /> : <img src={p.photos?.[0] || src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", ...estilo }} />;
  };
  const tira = (xs) => xs.length > 0 && (
    <div style={{ display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none", marginTop: 8, paddingBottom: 2 }}>
      {xs.slice(0, 12).map(p => <div key={p.id} style={{ width: 56, height: 56, flexShrink: 0, borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.15)" }}>{foto(p)}</div>)}
    </div>
  );
  const pie = (children) => <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: `80px 18px calc(18px + env(safe-area-inset-bottom, 0px))`, background: "linear-gradient(to top, rgba(10,14,23,0.9) 60%, rgba(10,14,23,0))", color: "#fff", display: "flex", flexDirection: "column", gap: 4 }}>{children}</div>;
  const marco = (clave, fondo, children) => (
    <div key={clave} style={{ height: "100%", flexShrink: 0, scrollSnapAlign: "start", position: "relative", background: "#0B0E17" }}>
      <div style={{ position: "absolute", inset: 0 }}>{fondo}</div>
      {children}
    </div>
  );
  const pastillaBoton = (texto, onClick, { principal = false, icono } = {}) => (
    <button type="button" onClick={onClick} style={{ minHeight: 44, borderRadius: 999, border: principal ? "none" : "1px solid rgba(255,255,255,0.6)", background: principal ? paleta.accent : "rgba(10,14,23,0.35)", color: "#fff", fontFamily: "inherit", fontSize: 14, fontWeight: principal ? 700 : 600, padding: "0 16px", display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}>{icono && <Icono nombre={icono} tamano={16} color="#fff" />}{texto}</button>
  );

  const pantalla = (x, esta) => {
    if (x.tipo === "pedido") {
      const tp = totalesDePedido(x.pedido, products);
      const suyos = productosDe(x.pedido);
      const enviado = x.pedido.estado === "enviado" && x.pedido.enviadoEl;
      return marco(x.clave, foto(suyos[0]), <>
        {esta && <span style={{ position: "absolute", top: `calc(env(safe-area-inset-top, 0px) + 66px)`, right: 14, background: enviado ? "rgba(21,128,61,0.9)" : "rgba(10,14,23,0.55)", color: "#fff", borderRadius: 999, padding: "5px 11px", fontSize: 12, fontWeight: 700 }}>{enviado ? t("pedidos.enviado", { fecha: fechaCorta(x.pedido.enviadoEl) }) : t("pedidos.borrador")}</span>}
        {pie(<>
          <p style={{ margin: 0, fontSize: 24, fontWeight: 700, lineHeight: 1.15, overflowWrap: "anywhere" }}>{x.prov.favorito ? <><Icono nombre="favorito" tamano={18} color="#fff" /> </> : null}{x.prov.company || `#${x.prov.id}`}</p>
          <p style={{ margin: 0, fontSize: 17, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{tp.total ? dinero(tp.total) : "—"}<span style={{ fontWeight: 400, color: "rgba(255,255,255,0.75)" }}> · {t("pedidos.productos", { count: suyos.length })}{tp.bultos ? ` · ${fNumero(tp.bultos)} ${t("pedido.bultosCorto")}` : ` · ${fNumero(tp.unidades)} ${t("pedido.unidadesCorto")}`}{tp.cbm ? ` · ${fCbm(tp.cbm)}` : ""}</span></p>
          {tira(suyos)}
          {esta && <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>{pastillaBoton(t("pedidos.verDetalle"), () => onAbrirPedido?.(x.prov), { principal: true, icono: "pedido" })}</div>}
        </>)}
      </>);
    }
    if (x.tipo === "sin") {
      const suyos = products.filter(p => p.supplierId === x.prov.id);
      return marco(x.clave, foto(suyos.find(p => p.favorito) || suyos[0]), <>
        {esta && <span style={{ position: "absolute", top: `calc(env(safe-area-inset-top, 0px) + 66px)`, right: 14, background: "rgba(10,14,23,0.55)", color: "#fff", borderRadius: 999, padding: "5px 11px", fontSize: 12, fontWeight: 700 }}>{t("pedidos.sinPedido")}</span>}
        {pie(<>
          <p style={{ margin: 0, fontSize: 24, fontWeight: 700, lineHeight: 1.15, overflowWrap: "anywhere" }}>{x.prov.favorito ? <><Icono nombre="favorito" tamano={18} color="#fff" /> </> : null}{x.prov.company || `#${x.prov.id}`}</p>
          <p style={{ margin: 0, fontSize: 15, color: "rgba(255,255,255,0.8)" }}>{t("pedidos.sinPedido")}{x.favoritos ? ` · ${t("pedidos.favoritos", { count: x.favoritos })}` : ""}</p>
          {tira(suyos)}
          {esta && <div style={{ display: "flex", gap: 8, marginTop: 10 }}>{pastillaBoton(t("pedidos.armarPedido"), () => onAbrirPedido?.(x.prov), { principal: true, icono: "pedido" })}</div>}
        </>)}
      </>);
    }
    if (x.tipo === "total") {
      return marco(x.clave, null, (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 24px", textAlign: "center", gap: 6, color: "#fff" }}>
          <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: "rgba(255,255,255,0.7)" }}>{t("pedidos.totalFeria")}{feriaActual ? ` · ${feriaActual.name}` : ""}</span>
          <span style={{ fontSize: 40, fontWeight: 700, color: "#86EFAC", fontVariantNumeric: "tabular-nums" }}>{dinero(tot.total)}</span>
          <span style={{ fontSize: 15, color: "rgba(255,255,255,0.8)" }}>{[t("pedidos.productos", { count: conContenido.reduce((n, p) => n + (p.items || []).length, 0) }), tot.bultos ? `${fNumero(tot.bultos)} ${t("pedido.bultosCorto")}` : null, `${fNumero(tot.unidades)} ${t("pedido.unidadesCorto")}`, tot.cbm ? fCbm(tot.cbm) : null].filter(Boolean).join(" · ")}</span>
          {tot.cbm > 0 && <span style={{ fontSize: 14, color: "rgba(255,255,255,0.7)" }}>{t("pedido.contenedor", { porcentaje: tot.porcentajeContenedor })}</span>}
          {onDescargarExcelFeria && <div style={{ marginTop: 18 }}><Boton variante="principal" icono="excel" onClick={() => onDescargarExcelFeria(filtro, feriaActual)}>{t("pedidos.descargarExcel")}</Boton></div>}
        </div>
      ));
    }
    return marco(x.clave, null, (
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 28px", textAlign: "center", gap: 8, color: "#fff" }}>
        <Icono nombre="pedido" tamano={40} color="rgba(255,255,255,0.6)" />
        <span style={{ fontSize: 22, fontWeight: 700 }}>{t("pedidos.vacioTitulo")}</span>
        <span style={{ fontSize: 15, color: "rgba(255,255,255,0.75)", lineHeight: 1.4 }}>{t("pedidos.vacioTexto")}</span>
      </div>
    ));
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000", color: "#fff", fontFamily: "inherit", zIndex: 50 }}>
      <div ref={pagerRef} onScroll={onScrollPager} style={{ position: "absolute", inset: 0, overflowY: "auto", scrollSnapType: "y mandatory", scrollbarWidth: "none", overscrollBehavior: "contain", WebkitOverflowScrolling: "touch" }}>
        {prev && pantalla(prev, false)}
        {actual && pantalla(actual, true)}
        {next && pantalla(next, false)}
      </div>

      {/* Arriba: volver, la posición, y las ferias si hay más de una */}
      <div style={{ position: "absolute", top: `calc(env(safe-area-inset-top, 0px) + 12px)`, left: 0, right: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 14px" }}>
          <button type="button" onClick={onBack} aria-label={t("comun.volver")} style={{ width: 48, height: 48, borderRadius: 24, border: "none", background: "rgba(10,14,23,0.55)", display: "grid", placeItems: "center", cursor: "pointer", backdropFilter: "blur(6px)" }}><Icono nombre="volver" tamano={22} color="#fff" /></button>
          <span style={{ background: "rgba(10,14,23,0.55)", color: "#fff", borderRadius: 999, padding: "8px 14px", fontSize: 13, fontWeight: 700, fontVariantNumeric: "tabular-nums", backdropFilter: "blur(6px)" }}>{t("pedidos.titulo")}{conContenido.length > 0 && actual?.tipo === "pedido" ? ` · ${t("pedidos.posicion", { n: i + 1, total: conContenido.length })}` : ""}</span>
          <span style={{ width: 48 }} />
        </div>
        {districts.length > 1 && (
          <FilaDeChips estilo={{ padding: "0 14px" }}>
            <Chip activo={feria === "todas"} onClick={() => cambiarFeria("todas")} estilo={feria === "todas" ? undefined : { background: "rgba(10,14,23,0.55)", color: "#fff", borderColor: "transparent" }}>{t("pedidos.todasLasFerias")}</Chip>
            {districts.map(d => <Chip key={d.id} activo={feria === d.id} onClick={() => cambiarFeria(d.id)} estilo={feria === d.id ? undefined : { background: "rgba(10,14,23,0.55)", color: "#fff", borderColor: "transparent" }}>{d.name}</Chip>)}
          </FilaDeChips>
        )}
      </div>
    </div>
  );
}
