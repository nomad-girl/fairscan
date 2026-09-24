/**
 * FairScan en la computadora: "el escritorio de trabajo" (wireframe aprobado por Nati el 23/09,
 * https://claude.ai/artifact/9Rn2vFb363SEppLi9i3yp6, las siete recomendaciones).
 *
 *   · Cabecera: FairScan, la feria como filtro global, el buscador y la cuenta.
 *   · Barra lateral: Catálogo, Proveedores, Pedidos, Revisar el día, Exportar, Equipo, Ajustes.
 *   · Centro: la grilla grande de fotos (cinco por fila) o la tabla editable; los proveedores; los pedidos.
 *   · Derecha: el panel con la ficha del producto (o del proveedor) elegido, editable en el lugar.
 *   · Al entrar: Revisar el día si hoy llegó algo del equipo; si no, el catálogo.
 *
 * La compu no saca fotos: la cámara queda en el teléfono. Capa visible: los datos y sus
 * cambios llegan por props desde App, igual que en las pantallas del teléfono.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSistema } from "../sistema/SistemaProvider.jsx";
import { Boton, Chip, Icono, EstadoDeDatos, esperandoNube } from "../componentes/index.js";
import { palabrasDeBusqueda, coincideBusqueda } from "../lib/busqueda.js";
import { soloDeHoy } from "../lib/porDia.js";
import { proveedorVacio } from "../lib/proveedores.js";
import { MARCA } from "../sistema/tokens.js";
import { Miniatura } from "./util.jsx";
import { PanelProducto } from "./PanelProducto.jsx";
import { PanelProveedor } from "./PanelProveedor.jsx";
import { TablaDeProductos } from "./TablaDeProductos.jsx";
import { SeccionPedidos } from "./SeccionPedidos.jsx";

const ANCHO_LATERAL = 220;
const ANCHO_PANEL = 360;
const ANCHO_PANEL_MIN = 320;
const CLAVE_ANCHO = "fairscan.escritorio.anchoPanel";
const leerAncho = () => { try { const n = Number(localStorage.getItem(CLAVE_ANCHO)); return n >= ANCHO_PANEL_MIN ? n : ANCHO_PANEL; } catch { return ANCHO_PANEL; } };
const guardarAncho = (n) => { try { localStorage.setItem(CLAVE_ANCHO, String(n)); } catch { /* modo privado */ } };

export function Escritorio({
  products = [], suppliers = [], districts = [], activeDistrictId = null, orders = [], moneda = "USD", settings, Foto, tLegacy,
  cuenta = {}, onEntrar, estadoDatos = null, onReintentar,
  onSwitchDistrict, onActualizarProducto, onActualizarProveedor, onEliminarProducto,
  onPedidoPara, onGuardarPedido, onEnviarProforma, onDescargarExcelFeria,
  renderExportar, renderAjustes,
}) {
  const { t } = useTranslation();
  const { paleta, radios, texto } = useSistema();

  // Alcance global: la feria elegida arriba (decisión 5)
  const enFeria = useMemo(() => (activeDistrictId == null ? products : products.filter(p => p.districtId === activeDistrictId)), [products, activeDistrictId]);
  const deHoy = useMemo(() => soloDeHoy(enFeria), [enFeria]);
  const proveedores = useMemo(() => (activeDistrictId == null ? suppliers : suppliers.filter(s => s.districtId === activeDistrictId)).filter(s => !proveedorVacio(s, products)), [suppliers, activeDistrictId, products]);
  const pedidosConContenido = useMemo(() => orders.filter(o => (activeDistrictId == null || o.districtId === activeDistrictId) && (o.items || []).some(i => Number(i.cantidad) > 0)).length, [orders, activeDistrictId]);

  // Al entrar: Revisar el día si hay fotos de hoy, si no el catálogo (decisión 7)
  const [seccion, setSeccion] = useState(() => (soloDeHoy(enFeria).length > 0 ? "revisar" : "catalogo"));
  const [consulta, setConsulta] = useState("");
  const [filtro, setFiltro] = useState("todos"); // todos | favoritos | sinPrecio | sinProveedor
  const [proveedorFiltro, setProveedorFiltro] = useState("");
  const [vista, setVista] = useState("grilla"); // grilla | tabla (decisión 3)
  const [seleccion, setSeleccion] = useState(null); // id de producto en el panel
  const [proveedorSel, setProveedorSel] = useState(null); // id de proveedor en el panel
  const [pedidoAbierto, setPedidoAbierto] = useState(null); // { supplierId, pedidoId, primero }
  // El panel de la derecha se agranda (Nati, 23/09: la foto más protagonista): botón, o arrastrando el borde. Se recuerda.
  const [anchoPanel, setAnchoPanel] = useState(leerAncho);
  const [fotoGrande, setFotoGrande] = useState(null); // índice de la foto del producto elegido a pantalla completa
  const arrastre = useRef(null);
  const maxAncho = () => Math.max(ANCHO_PANEL_MIN, Math.round((typeof window !== "undefined" ? window.innerWidth : 1400) * 0.62));
  const panelAmplio = anchoPanel >= ANCHO_PANEL + 120;
  const alternarPanel = () => { const n = panelAmplio ? ANCHO_PANEL : Math.min(maxAncho(), 620); setAnchoPanel(n); guardarAncho(n); };
  const empezarArrastre = (e) => {
    e.preventDefault();
    arrastre.current = true;
    const mover = (ev) => { const n = Math.min(maxAncho(), Math.max(ANCHO_PANEL_MIN, Math.round(window.innerWidth - ev.clientX))); setAnchoPanel(n); };
    const soltar = () => { arrastre.current = false; window.removeEventListener("mousemove", mover); window.removeEventListener("mouseup", soltar); setAnchoPanel(n => { guardarAncho(n); return n; }); };
    window.addEventListener("mousemove", mover); window.addEventListener("mouseup", soltar);
  };

  const irA = (s) => { setSeccion(s); setSeleccion(null); setProveedorSel(null); setPedidoAbierto(null); };

  // Lo que se ve en el centro
  const palabras = useMemo(() => palabrasDeBusqueda(consulta), [consulta]);
  const base = seccion === "revisar" ? deHoy : enFeria;
  const filtrados = useMemo(() => {
    let r = palabras.length ? base.filter(p => coincideBusqueda([p.name, p.category, p.supplierCompany, p.notes, ...(p.material || [])], palabras)) : base;
    if (filtro === "favoritos") r = r.filter(p => p.favorito);
    else if (filtro === "sinPrecio") r = r.filter(p => !p.price || isNaN(parseFloat(p.price)));
    else if (filtro === "sinProveedor") r = r.filter(p => !p.supplierId);
    if (proveedorFiltro) r = r.filter(p => p.supplierId === Number(proveedorFiltro));
    return [...r].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [base, palabras, filtro, proveedorFiltro]);
  const proveedoresBuscados = useMemo(() => {
    const r = palabras.length ? proveedores.filter(s => coincideBusqueda([s.company, s.contact, s.products, s.notes], palabras)) : proveedores;
    return [...r].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [proveedores, palabras]);
  const cuentaPor = (f) => (f === "favoritos" ? base.filter(p => p.favorito) : f === "sinPrecio" ? base.filter(p => !p.price || isNaN(parseFloat(p.price))) : f === "sinProveedor" ? base.filter(p => !p.supplierId) : base).length;

  const elegido = seleccion != null ? products.find(p => p.id === seleccion) || null : null;
  const proveedorElegido = proveedorSel != null ? suppliers.find(s => s.id === proveedorSel) || null : null;
  const idx = elegido ? filtrados.findIndex(p => p.id === elegido.id) : -1;
  const mover = (delta) => { setFotoGrande(null); if (!filtrados.length) return; const i = idx < 0 ? 0 : Math.min(filtrados.length - 1, Math.max(0, idx + delta)); setSeleccion(filtrados[i].id); };

  // Flechas del teclado recorren la grilla; Escape cierra el panel. Nunca mientras se escribe en un campo.
  useEffect(() => {
    const al = (e) => {
      const tag = (e.target?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select" || e.target?.isContentEditable) return;
      if (fotoGrande != null && elegido) {
        const total = (elegido.photos?.length || elegido.photoUrls?.length || 1);
        if (e.key === "Escape") setFotoGrande(null);
        else if (e.key === "ArrowRight") setFotoGrande(i => (i + 1) % total);
        else if (e.key === "ArrowLeft") setFotoGrande(i => (i - 1 + total) % total);
        return;
      }
      if (seccion !== "catalogo" && seccion !== "revisar" && seccion !== "proveedores") return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); mover(1); }
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); mover(-1); }
      else if (e.key === "Escape") { setSeleccion(null); }
    };
    window.addEventListener("keydown", al);
    return () => window.removeEventListener("keydown", al);
  });

  const agregarAlPedido = async (p) => {
    const s = suppliers.find(x => x.id === p.supplierId);
    if (!s) return;
    const pedido = await onPedidoPara?.(s);
    if (!pedido) return;
    setPedidoAbierto({ supplierId: s.id, pedidoId: pedido.id, primero: p.id });
    setSeccion("pedidos"); setSeleccion(null); setProveedorSel(null);
  };
  const abrirPedidoDe = async (s) => {
    const pedido = await onPedidoPara?.(s);
    if (!pedido) return;
    setPedidoAbierto({ supplierId: s.id, pedidoId: pedido.id, primero: null });
    setSeccion("pedidos"); setSeleccion(null); setProveedorSel(null);
  };
  const verProveedor = (s) => { setSeccion("proveedores"); setProveedorSel(s.id); setSeleccion(null); setPedidoAbierto(null); };
  const verProducto = (p) => { setSeccion("catalogo"); setSeleccion(p.id); setProveedorSel(null); setPedidoAbierto(null); };

  const itemLateral = (clave, icono, textoItem, cantidad) => {
    const activo = seccion === clave;
    return (
      <button key={clave} type="button" onClick={() => irA(clave)} aria-current={activo ? "page" : undefined}
        style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 40, padding: "0 12px", borderRadius: radios.medio, border: "none", background: activo ? paleta.accentSoft : "transparent", color: activo ? paleta.accentTexto : paleta.muted, fontFamily: "inherit", fontSize: 14, fontWeight: activo ? 700 : 500, cursor: "pointer", textAlign: "left", width: "100%" }}>
        <Icono nombre={icono} tamano={18} color={activo ? paleta.accentTexto : paleta.muted} />
        <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{textoItem}</span>
        {cantidad != null && cantidad > 0 ? <span style={{ fontSize: 12, fontWeight: 600, color: activo ? paleta.accentTexto : paleta.dim, fontVariantNumeric: "tabular-nums" }}>{cantidad}</span> : null}
      </button>
    );
  };

  const chip = (clave, textoChip) => <Chip key={clave} activo={filtro === clave} onClick={() => setFiltro(clave)}>{textoChip} · {cuentaPor(clave)}</Chip>;

  const conPanel = seccion === "catalogo" || seccion === "revisar" || seccion === "proveedores";

  const grilla = (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 10 }}>
      {filtrados.map(p => {
        const activo = p.id === seleccion;
        return (
          <button key={p.id} type="button" onClick={() => setSeleccion(p.id)} aria-pressed={activo} aria-label={p.name || t("catalogo.procesandoNombre")}
            style={{ position: "relative", padding: 0, border: "none", borderRadius: radios.medio, overflow: "hidden", aspectRatio: "1", background: paleta.surface, cursor: "pointer", outline: activo ? `3px solid ${paleta.accent}` : "none", outlineOffset: -3, boxShadow: paleta.sombraTarjeta }}>
            <Miniatura p={p} Foto={Foto} tLegacy={tLegacy} paleta={paleta} />
            {p.favorito ? <span style={{ position: "absolute", top: 6, right: 6, width: 22, height: 22, borderRadius: 11, background: paleta.accent, display: "grid", placeItems: "center" }}><Icono nombre="favorito" tamano={12} color="#fff" /></span> : null}
            {(p.photos?.length || 0) > 1 && <span style={{ position: "absolute", top: 6, left: 6, padding: "1px 6px", borderRadius: 999, background: "rgba(10,14,23,0.6)", color: "#fff", fontSize: 11, fontWeight: 600 }}>{p.photos.length}</span>}
            <span style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "18px 8px 6px", background: "linear-gradient(to top, rgba(10,14,23,0.8), rgba(10,14,23,0))", color: "#fff", fontSize: 12, fontWeight: 600, textAlign: "left", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {p.name || t("catalogo.procesandoNombre")}{p.price ? <span style={{ fontWeight: 400, opacity: 0.85 }}> · {moneda} {p.price}</span> : null}
            </span>
          </button>
        );
      })}
    </div>
  );

  const centroCatalogo = (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <h1 style={{ ...texto("titulo"), margin: 0, marginRight: "auto" }}>{seccion === "revisar" ? t("escritorio.revisarTitulo", { count: deHoy.length }) : t("escritorio.catalogo")}</h1>
        <div role="group" aria-label={t("escritorio.verGrilla")} style={{ display: "inline-flex", border: `1px solid ${paleta.border}`, borderRadius: radios.medio, overflow: "hidden", background: paleta.card }}>
          {[["grilla", "foto", t("escritorio.verGrilla")], ["tabla", "pedido", t("escritorio.verTabla")]].map(([v, ic, et]) => (
            <button key={v} type="button" onClick={() => setVista(v)} aria-pressed={vista === v} aria-label={et} title={et}
              style={{ width: 40, height: 36, border: "none", background: vista === v ? paleta.text : "transparent", display: "grid", placeItems: "center", cursor: "pointer" }}>
              <Icono nombre={ic} tamano={18} color={vista === v ? paleta.card : paleta.muted} />
            </button>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        {chip("todos", t("escritorio.todos"))}
        {chip("favoritos", t("escritorio.favoritos"))}
        {chip("sinPrecio", t("escritorio.sinPrecio"))}
        {chip("sinProveedor", t("escritorio.sinProveedor"))}
        <select value={proveedorFiltro} onChange={e => setProveedorFiltro(e.target.value)} aria-label={t("escritorio.proveedor")}
          style={{ minHeight: 36, borderRadius: 999, border: `1px solid ${proveedorFiltro ? paleta.accent : paleta.border}`, background: paleta.card, color: paleta.text, fontFamily: "inherit", fontSize: 13, padding: "0 10px", maxWidth: 240 }}>
          <option value="">{t("escritorio.todosLosProveedores")}</option>
          {proveedores.map(s => <option key={s.id} value={s.id}>{s.company || `#${s.id}`}</option>)}
        </select>
      </div>
      {enFeria.length === 0 && products.length > 0 && activeDistrictId != null && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, background: paleta.card, border: `1px solid ${paleta.border}`, borderRadius: radios.medio, padding: "10px 14px" }}>
          <span style={{ ...texto("cuerpo", { fontWeight: 400 }), color: paleta.muted, flex: 1 }}>{t("escritorio.feriaVacia")} {t("escritorio.productos", { count: products.length })} en otras ferias.</span>
          <Boton variante="secundario" icono="feria" onClick={() => onSwitchDistrict?.(null)}>{t("escritorio.verTodasLasFerias")}</Boton>
        </div>
      )}
      {filtrados.length === 0 ? (
        <p style={{ ...texto("cuerpo", { fontWeight: 400 }), color: paleta.muted, margin: "24px 0" }}>
          {esperandoNube(estadoDatos) ? t(`datos.${estadoDatos.clave}`, estadoDatos) : palabras.length ? t("escritorio.sinResultados") : seccion === "revisar" ? t("escritorio.revisarVacio") : t("escritorio.vacio")}
        </p>
      ) : vista === "tabla"
        ? <TablaDeProductos productos={filtrados} suppliers={suppliers} moneda={moneda} seleccionado={seleccion} settings={settings} Foto={Foto} tLegacy={tLegacy} onSeleccionar={p => setSeleccion(p.id)} onActualizar={onActualizarProducto} />
        : grilla}
    </div>
  );

  const centroProveedores = (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <h1 style={{ ...texto("titulo"), margin: 0 }}>{t("escritorio.proveedores")} · {proveedoresBuscados.length}</h1>
      {proveedoresBuscados.length === 0 ? <p style={{ ...texto("cuerpo", { fontWeight: 400 }), color: paleta.muted, margin: "24px 0" }}>{palabras.length ? t("escritorio.sinResultados") : t("catalogo.sinProveedores")}</p> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
          {proveedoresBuscados.map(s => {
            const suyos = products.filter(p => p.supplierId === s.id);
            const tarjeta = s.cardPhoto || s.cardPhotoUrl || null;
            const activo = s.id === proveedorSel;
            return (
              <button key={s.id} type="button" onClick={() => { setProveedorSel(s.id); setSeleccion(null); }} aria-pressed={activo}
                style={{ padding: 0, border: `1px solid ${activo ? paleta.accent : paleta.border}`, borderRadius: radios.grande, overflow: "hidden", background: paleta.card, cursor: "pointer", textAlign: "left", boxShadow: activo ? `0 0 0 2px ${paleta.accentSoft}` : paleta.sombraTarjeta, fontFamily: "inherit" }}>
                <div style={{ aspectRatio: "1.6", background: paleta.surface, position: "relative" }}>
                  {tarjeta ? <img src={tarjeta} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block", background: "#0F172A" }} />
                    : suyos[0] ? <Miniatura p={suyos[0]} Foto={Foto} tLegacy={tLegacy} paleta={paleta} />
                    : <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center" }}><Icono nombre="proveedor" tamano={28} color={paleta.dim} /></div>}
                  {s.favorito ? <span style={{ position: "absolute", top: 6, right: 6, width: 22, height: 22, borderRadius: 11, background: paleta.accent, display: "grid", placeItems: "center" }}><Icono nombre="favorito" tamano={12} color="#fff" /></span> : null}
                </div>
                <div style={{ padding: "8px 10px 10px" }}>
                  <p style={{ ...texto("cuerpo", { fontWeight: 600 }), margin: 0, color: paleta.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.company || `#${s.id}`}</p>
                  <p style={{ ...texto("pie"), margin: 0, color: paleta.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{[s.contact, t("escritorio.productos", { count: suyos.length })].filter(Boolean).join(" · ")}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  const panelVacio = (textoVacio) => (
    <div style={{ padding: 24, color: paleta.dim, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginTop: 60 }}>
      <Icono nombre="ojo" tamano={28} color={paleta.dim} />
      <p style={{ ...texto("cuerpo", { fontWeight: 400 }), margin: 0 }}>{textoVacio}</p>
    </div>
  );

  const panel = elegido ? (
    <PanelProducto producto={elegido} suppliers={suppliers} districts={districts} moneda={moneda} settings={settings} Foto={Foto} tLegacy={tLegacy}
      posicion={idx >= 0 ? { n: idx + 1, total: filtrados.length } : null}
      onAnterior={idx > 0 ? () => mover(-1) : undefined} onSiguiente={idx >= 0 && idx < filtrados.length - 1 ? () => mover(1) : undefined}
      onCerrar={() => setSeleccion(null)} onActualizar={onActualizarProducto} onEliminar={(p) => { setSeleccion(null); onEliminarProducto?.(p.id); }}
      onAgregarAlPedido={agregarAlPedido} onVerProveedor={verProveedor}
      onVerFoto={(i) => setFotoGrande(i)} panelAmplio={panelAmplio} onAlternarPanel={alternarPanel} />
  ) : seccion === "proveedores" && proveedorElegido ? (
    <PanelProveedor proveedor={proveedorElegido} products={products} moneda={moneda} Foto={Foto} tLegacy={tLegacy} onCerrar={() => setProveedorSel(null)}
      onActualizar={onActualizarProveedor} onVerProducto={(p) => setSeleccion(p.id)} onArmarPedido={abrirPedidoDe} />
  ) : panelVacio(seccion === "proveedores" ? t("escritorio.elegiProveedor") : t("escritorio.elegiUno"));

  return (
    <div style={{ height: "100%", display: "grid", gridTemplateRows: "56px 1fr", gridTemplateColumns: `${ANCHO_LATERAL}px 1fr`, background: paleta.bg, color: paleta.text, fontFamily: "inherit", overflow: "hidden" }}>
      {/* Cabecera */}
      <header style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 14, padding: "0 16px", background: paleta.card, borderBottom: `1px solid ${paleta.border}` }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 800, fontSize: 18, color: MARCA.naranja, width: ANCHO_LATERAL - 16 }}><Icono nombre="camara" tamano={20} color={MARCA.naranja} />FairScan</span>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Icono nombre="feria" tamano={16} color={paleta.muted} />
          <select value={activeDistrictId ?? ""} onChange={e => onSwitchDistrict?.(e.target.value === "" ? null : Number(e.target.value))} aria-label={t("escritorio.feria")}
            style={{ minHeight: 34, borderRadius: 999, border: `1px solid ${paleta.border}`, background: paleta.accentSoft, color: paleta.accentTexto, fontFamily: "inherit", fontSize: 13, fontWeight: 600, padding: "0 10px", maxWidth: 220 }}>
            <option value="">{t("escritorio.todasLasFerias")}</option>
            {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </label>
        <label style={{ flex: 1, maxWidth: 480, position: "relative" }}>
          <span style={{ position: "absolute", left: 10, top: 9 }}><Icono nombre="buscar" tamano={16} color={paleta.dim} /></span>
          <input type="search" value={consulta} onChange={e => setConsulta(e.target.value)} placeholder={t("escritorio.buscar")} aria-label={t("escritorio.buscar")}
            style={{ width: "100%", minHeight: 34, borderRadius: 999, border: `1px solid ${paleta.border}`, background: paleta.bg, color: paleta.text, fontFamily: "inherit", fontSize: 14, padding: "0 12px 0 32px", outline: "none" }} />
        </label>
        <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 8 }}>
          {estadoDatos && <EstadoDeDatos estado={estadoDatos} onReintentar={onReintentar} compacto estilo={{ maxWidth: 360 }} />}
          <span style={{ ...texto("pie"), color: paleta.muted, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cuenta.esAnonima || !cuenta.email ? t("escritorio.sinCuenta") : cuenta.email}</span>
          {(cuenta.esAnonima || !cuenta.email) && onEntrar ? <Boton variante="principal" onClick={onEntrar}>{t("escritorio.entrar")}</Boton> : (
            <button type="button" onClick={() => irA("ajustes")} aria-label={t("escritorio.ajustes")} style={{ width: 34, height: 34, borderRadius: 17, border: `1px solid ${paleta.border}`, background: paleta.accentSoft, color: paleta.accentTexto, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
              {(cuenta.email || "?")[0].toUpperCase()}
            </button>
          )}
        </span>
      </header>

      {/* Barra lateral */}
      <nav aria-label={t("escritorio.catalogo")} style={{ display: "flex", flexDirection: "column", gap: 2, padding: 10, background: paleta.card, borderRight: `1px solid ${paleta.border}`, overflowY: "auto" }}>
        {itemLateral("catalogo", "foto", t("escritorio.catalogo"), enFeria.length)}
        {itemLateral("proveedores", "proveedor", t("escritorio.proveedores"), proveedores.length)}
        {itemLateral("pedidos", "pedido", t("escritorio.pedidos"), pedidosConContenido)}
        {itemLateral("revisar", "ojo", t("escritorio.revisarDia"), deHoy.length)}
        {itemLateral("exportar", "exportar", t("escritorio.exportar"))}
        <span style={{ flex: 1 }} />
        {itemLateral("ajustes", "ajustes", t("escritorio.ajustes"))}
        <p style={{ ...texto("pie"), color: paleta.dim, margin: "8px 12px 4px", fontSize: 11 }}>{t("escritorio.soloTelefono")}</p>
      </nav>

      {/* Centro + panel */}
      <div style={{ display: "flex", minWidth: 0, minHeight: 0 }}>
        <main style={{ flex: 1, minWidth: 0, overflowY: "auto", padding: seccion === "pedidos" && pedidoAbierto ? 0 : 20 }}>
          {cuenta.esAnonima && seccion !== "ajustes" && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, background: paleta.accentSoft, border: `1px solid ${paleta.border}`, borderRadius: radios.medio, padding: "8px 12px", marginBottom: 14, color: paleta.text, ...texto("pie") }}>
              <Icono nombre="error" tamano={16} color={paleta.accentTexto} /><span style={{ flex: 1 }}>{t("escritorio.sinCuentaAviso")}</span>
            </div>
          )}
          {(seccion === "catalogo" || seccion === "revisar") && centroCatalogo}
          {seccion === "proveedores" && centroProveedores}
          {seccion === "pedidos" && (
            <SeccionPedidos pedidos={orders} suppliers={suppliers} products={products} districts={districts} activeDistrictId={activeDistrictId} moneda={moneda} Foto={Foto} tLegacy={tLegacy}
              abierto={pedidoAbierto} onAbrir={abrirPedidoDe} onCerrar={() => setPedidoAbierto(null)} onGuardar={onGuardarPedido} onEnviar={onEnviarProforma}
              onVerProducto={verProducto} onActualizarProducto={onActualizarProducto} onDescargarExcelFeria={onDescargarExcelFeria} />
          )}
          {seccion === "exportar" && <div style={{ maxWidth: 720, margin: "0 auto", height: "100%" }}>{renderExportar?.(() => irA("catalogo"))}</div>}
          {seccion === "ajustes" && <div style={{ maxWidth: 720, margin: "0 auto", height: "100%" }}>{renderAjustes?.(() => irA("catalogo"), () => irA("exportar"))}</div>}
        </main>
        {conPanel && (
          <aside aria-label={elegido ? t("ficha.datos") : proveedorElegido ? t("proveedor.datos") : t("escritorio.elegiUno")} style={{ width: anchoPanel, flexShrink: 0, overflowY: "auto", background: paleta.card, borderLeft: `1px solid ${paleta.border}`, position: "relative", transition: arrastre.current ? "none" : "width 180ms ease" }}>
            <div role="separator" aria-orientation="vertical" aria-label={t("escritorio.arrastrarPanel")} title={t("escritorio.arrastrarPanel")} onMouseDown={empezarArrastre} onDoubleClick={alternarPanel}
              style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 8, cursor: "col-resize", zIndex: 2 }} />
            {panel}
          </aside>
        )}
      </div>

      {/* La foto a pantalla completa: clic en la foto del panel; flechas para las otras tomas; Escape o X para cerrar */}
      {fotoGrande != null && elegido && (() => {
        const fs = elegido.photos?.length ? elegido.photos : (elegido.photoUrls || []);
        const i = Math.min(fotoGrande, Math.max(0, fs.length - 1));
        return (
          <div role="dialog" aria-modal="true" aria-label={elegido.name || t("ficha.producto")} onClick={() => setFotoGrande(null)}
            style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(5,8,15,0.94)", display: "grid", placeItems: "center" }}>
            <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", padding: "56px 80px" }}>
              <Miniatura p={elegido} i={i} Foto={Foto} tLegacy={tLegacy} paleta={paleta} estilo={{ objectFit: "contain", width: "100%", height: "100%" }} />
            </div>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, color: "#fff" }} onClick={e => e.stopPropagation()}>
              <span style={{ fontSize: 16, fontWeight: 600, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{elegido.name || t("catalogo.procesandoNombre")}{elegido.price ? <span style={{ fontWeight: 400, opacity: 0.8 }}> · {moneda} {elegido.price}</span> : null}</span>
              {fs.length > 1 && <span style={{ fontSize: 13, opacity: 0.8 }}>{t("escritorio.fotoDe", { n: i + 1, total: fs.length })}</span>}
              <button type="button" onClick={() => setFotoGrande(null)} aria-label={t("escritorio.cerrarFoto")} style={{ width: 40, height: 40, borderRadius: 20, border: "none", background: "rgba(255,255,255,0.15)", display: "grid", placeItems: "center", cursor: "pointer" }}><Icono nombre="cerrar" tamano={20} color="#fff" /></button>
            </div>
            {fs.length > 1 && (
              <>
                <button type="button" onClick={e => { e.stopPropagation(); setFotoGrande((i - 1 + fs.length) % fs.length); }} aria-label={t("escritorio.fotoAnterior")} style={{ position: "absolute", left: 20, top: "50%", transform: "translateY(-50%)", width: 44, height: 44, borderRadius: 22, border: "none", background: "rgba(255,255,255,0.15)", display: "grid", placeItems: "center", cursor: "pointer" }}><Icono nombre="anterior" tamano={22} color="#fff" /></button>
                <button type="button" onClick={e => { e.stopPropagation(); setFotoGrande((i + 1) % fs.length); }} aria-label={t("escritorio.fotoSiguiente")} style={{ position: "absolute", right: 20, top: "50%", transform: "translateY(-50%)", width: 44, height: 44, borderRadius: 22, border: "none", background: "rgba(255,255,255,0.15)", display: "grid", placeItems: "center", cursor: "pointer" }}><Icono nombre="siguiente" tamano={22} color="#fff" /></button>
              </>
            )}
          </div>
        );
      })()}
    </div>
  );
}
