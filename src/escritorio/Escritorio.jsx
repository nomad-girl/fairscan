/**
 * FairScan en la computadora: "el escritorio de trabajo" (wireframe del 23/09) más la tanda A (25/09,
 * https://claude.ai/artifact/DiB5J1GEzGjqzRSLkjFq6d): ordenar y columnas, selección múltiple con barra
 * flotante, vistas guardadas del equipo, filtros que se combinan, atajos y ⌘K, estados vacíos que enseñan.
 *
 *   · Cabecera: FairScan, la feria como filtro global, el buscador (⌘K), el estado de los datos y la cuenta.
 *   · Barra lateral: Catálogo (con sus vistas), Proveedores, Pedidos, Revisar el día, Exportar, Ajustes.
 *   · Centro: grilla de cinco fotos por fila o tabla editable; proveedores; pedidos.
 *   · Derecha: la ficha del producto o del proveedor elegido; con varios elegidos, el resumen de la selección.
 *
 * La compu no saca fotos. Capa visible: los datos y sus cambios llegan por props desde App.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSistema } from "../sistema/SistemaProvider.jsx";
import { Boton, Chip, Icono, EstadoDeDatos, esperandoNube } from "../componentes/index.js";
import { soloDeHoy } from "../lib/porDia.js";
import { proveedorVacio } from "../lib/proveedores.js";
import { MARCA } from "../sistema/tokens.js";
import { Miniatura } from "./util.jsx";
import { PanelProducto } from "./PanelProducto.jsx";
import { PanelProveedor } from "./PanelProveedor.jsx";
import { PanelSeleccion } from "./PanelSeleccion.jsx";
import { TablaDeProductos } from "./TablaDeProductos.jsx";
import { SeccionPedidos } from "./SeccionPedidos.jsx";
import { BarraDeSeleccion } from "./BarraDeSeleccion.jsx";
import { Paleta } from "./Paleta.jsx";
import { aplicarFiltros, ordenarProductos, cantidadDeFiltros, rangoEntre, CLAVES_FILTRO, COLUMNAS_OPCIONALES, COLUMNAS_DEFAULT } from "./filtros.js";
import { VISTAS_DE_FABRICA, cargarVistas, guardarVista, borrarVista, vistaModificada } from "./vistas.js";

const ANCHO_LATERAL = 220;
const ANCHO_PANEL = 360;
const ANCHO_PANEL_MIN = 320;
const CLAVE_ANCHO = "fairscan.escritorio.anchoPanel";
const CLAVE_BIENVENIDA = "fairscan.escritorio.bienvenida";
const ORDEN_DEFAULT = { campo: "createdAt", dir: "desc" };
const leerAncho = () => { try { const n = Number(localStorage.getItem(CLAVE_ANCHO)); return n >= ANCHO_PANEL_MIN ? n : ANCHO_PANEL; } catch { return ANCHO_PANEL; } };
const guardarAncho = (n) => { try { localStorage.setItem(CLAVE_ANCHO, String(n)); } catch { /* modo privado */ } };
const SECCIONES_TECLA = { "1": "catalogo", "2": "proveedores", "3": "pedidos", "4": "revisar", "5": "exportar" };
const BOOLEANOS = ["favorito", "sinProveedor", "sinPrecio", "conPrecio", "conProveedor"];

export function Escritorio({
  products = [], suppliers = [], districts = [], activeDistrictId = null, orders = [], moneda = "USD", settings, Foto, tLegacy,
  cuenta = {}, onEntrar, estadoDatos = null, onReintentar, equipoId = null,
  onSwitchDistrict, onActualizarProducto, onActualizarProveedor, onEliminarProducto,
  onActualizarVarios, onEliminarVarios, onAgregarAlPedidoVarios, onInvitar,
  onPedidoPara, onGuardarPedido, onEnviarProforma, onDescargarExcelFeria,
  renderExportar, renderAjustes,
}) {
  const { t } = useTranslation();
  const { paleta, radios, texto } = useSistema();

  // ── Alcance global: la feria elegida arriba ──
  const enFeria = useMemo(() => (activeDistrictId == null ? products : products.filter(p => p.districtId === activeDistrictId)), [products, activeDistrictId]);
  const deHoy = useMemo(() => soloDeHoy(enFeria), [enFeria]);
  const proveedores = useMemo(() => (activeDistrictId == null ? suppliers : suppliers.filter(s => s.districtId === activeDistrictId)).filter(s => !proveedorVacio(s, products)), [suppliers, activeDistrictId, products]);
  const categorias = useMemo(() => [...new Set(enFeria.map(p => p.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es")), [enFeria]);
  const pedidosConContenido = useMemo(() => orders.filter(o => (activeDistrictId == null || o.districtId === activeDistrictId) && (o.items || []).some(i => Number(i.cantidad) > 0)).length, [orders, activeDistrictId]);

  // ── Estado ──
  const [seccion, setSeccion] = useState(() => (soloDeHoy(enFeria).length > 0 ? "revisar" : "catalogo"));
  const [consulta, setConsulta] = useState("");
  const [vista, setVista] = useState("grilla");
  const [orden, setOrden] = useState(ORDEN_DEFAULT);
  const [columnas, setColumnas] = useState(null);
  const [filtros, setFiltros] = useState({});
  const [vistasGuardadas, setVistasGuardadas] = useState([]);
  const [vistaActiva, setVistaActiva] = useState(null);
  const [nombrandoVista, setNombrandoVista] = useState(false);
  const [nombreVista, setNombreVista] = useState("");
  const [seleccion, setSeleccion] = useState(null);
  const [seleccionados, setSeleccionados] = useState(() => new Set());
  const [ultimoTocado, setUltimoTocado] = useState(null);
  const [proveedorSel, setProveedorSel] = useState(null);
  const [pedidoAbierto, setPedidoAbierto] = useState(null);
  const [popover, setPopover] = useState(null); // "columnas" | "filtro" | { editando: clave }
  const [paletaAbierta, setPaletaAbierta] = useState(false);
  const [atajosAbiertos, setAtajosAbiertos] = useState(false);
  const [bienvenida, setBienvenida] = useState(() => { try { return !localStorage.getItem(CLAVE_BIENVENIDA); } catch { return false; } });
  const [anchoPanel, setAnchoPanel] = useState(leerAncho);
  const [fotoGrande, setFotoGrande] = useState(null);
  const arrastre = useRef(null);

  // ── Vistas del equipo ──
  useEffect(() => {
    let vivo = true;
    cargarVistas(equipoId, { alActualizar: v => { if (vivo) setVistasGuardadas(v); } }).then(v => { if (vivo) setVistasGuardadas(v); });
    return () => { vivo = false; };
  }, [equipoId]);
  const vistas = useMemo(() => [...VISTAS_DE_FABRICA.map(v => ({ ...v, nombre: t(`escritorio.vistaFabrica.${v.clave}`) })), ...vistasGuardadas], [vistasGuardadas, t]);
  const configActual = useMemo(() => ({ filtros, orden, columnas, vista }), [filtros, orden, columnas, vista]);
  const vistaActivaObj = vistas.find(v => v.id === vistaActiva) || null;
  const modificada = vistaActivaObj ? vistaModificada(vistaActivaObj, configActual) : false;

  const aplicarVista = (v) => {
    setFiltros(v.config?.filtros || {}); setOrden(v.config?.orden || ORDEN_DEFAULT); setColumnas(v.config?.columnas || null); setVista(v.config?.vista || "grilla");
    setVistaActiva(v.id); setSeccion("catalogo"); setSeleccion(null); setSeleccionados(new Set()); setProveedorSel(null); setPedidoAbierto(null); setPopover(null);
  };
  const guardarVistaActual = async (nombre) => {
    const v = await guardarVista(equipoId, { nombre, config: configActual, position: vistasGuardadas.length });
    setVistasGuardadas(prev => [...prev.filter(x => x.id !== v.id), v]); setVistaActiva(v.id); setNombrandoVista(false); setNombreVista("");
  };
  const guardarCambiosDeVista = async () => {
    if (!vistaActivaObj) return;
    if (vistaActivaObj.fabrica) { setNombrandoVista(true); setNombreVista(vistaActivaObj.nombre); return; }
    const v = await guardarVista(equipoId, { ...vistaActivaObj, config: configActual });
    setVistasGuardadas(prev => prev.map(x => (x.id === v.id ? v : x)));
  };
  const borrarVistaActiva = async () => {
    if (!vistaActivaObj || vistaActivaObj.fabrica) return;
    if (typeof window !== "undefined" && typeof window.confirm === "function" && !window.confirm(t("escritorio.borrarVistaSeguro", { nombre: vistaActivaObj.nombre }))) return;
    await borrarVista(equipoId, vistaActivaObj.id);
    setVistasGuardadas(prev => prev.filter(x => x.id !== vistaActivaObj.id)); setVistaActiva(null);
  };

  const irA = (s) => { setSeccion(s); setSeleccion(null); setSeleccionados(new Set()); setProveedorSel(null); setPedidoAbierto(null); setPopover(null); if (s !== "catalogo" && s !== "revisar") setVistaActiva(null); };

  // ── Lo que se ve en el centro ──
  const base = seccion === "revisar" ? deHoy : enFeria;
  const filtrados = useMemo(() => ordenarProductos(aplicarFiltros(base, filtros, { consulta, suppliers }), orden, suppliers), [base, filtros, consulta, suppliers, orden]);
  const descartados = useMemo(() => base.filter(p => p.descartado).length, [base]);
  const proveedoresBuscados = useMemo(() => {
    const q = consulta.trim().toLowerCase();
    const r = q ? proveedores.filter(s => [s.company, s.contact, s.products, s.notes].some(x => (x || "").toLowerCase().includes(q))) : proveedores;
    return [...r].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [proveedores, consulta]);
  const contarVista = (v) => aplicarFiltros(enFeria, v.config?.filtros || {}).length;

  const elegido = seleccion != null ? products.find(p => p.id === seleccion) || null : null;
  const productosElegidos = useMemo(() => (seleccionados.size ? products.filter(p => seleccionados.has(p.id)) : []), [seleccionados, products]);
  const hayVarios = seleccionados.size > 0;
  const proveedorElegido = proveedorSel != null ? suppliers.find(s => s.id === proveedorSel) || null : null;
  const idx = elegido ? filtrados.findIndex(p => p.id === elegido.id) : -1;
  const mover = (delta) => { setFotoGrande(null); if (!filtrados.length) return; const i = idx < 0 ? 0 : Math.min(filtrados.length - 1, Math.max(0, idx + delta)); setSeleccion(filtrados[i].id); };

  // ── Selección múltiple ──
  const alternar = (p, e) => {
    setSeleccionados(prev => {
      const n = new Set(prev);
      if (e?.shiftKey && ultimoTocado != null) { for (const id of rangoEntre(filtrados, ultimoTocado, p.id)) n.add(id); }
      else if (n.has(p.id)) n.delete(p.id); else n.add(p.id);
      return n;
    });
    setUltimoTocado(p.id); setSeleccion(null);
  };
  const alternarTodos = () => setSeleccionados(prev => (filtrados.length && filtrados.every(p => prev.has(p.id)) ? new Set() : new Set(filtrados.map(p => p.id))));
  const deseleccionar = () => { setSeleccionados(new Set()); setUltimoTocado(null); };
  const tocarProducto = (p, e) => { if (hayVarios || e?.shiftKey) alternar(p, e); else setSeleccion(p.id); };
  const idsAccion = () => (hayVarios ? [...seleccionados] : elegido ? [elegido.id] : []);
  const objetivos = () => { const ids = new Set(idsAccion()); return products.filter(p => ids.has(p.id)); };
  const accionFavorito = () => { const ids = idsAccion(); if (!ids.length) return; const todos = objetivos().every(p => p.favorito); onActualizarVarios?.(ids, { favorito: todos ? 0 : 1 }); };
  const accionDescartar = () => { const ids = idsAccion(); if (!ids.length) return; onActualizarVarios?.(ids, { descartado: 1 }); deseleccionar(); if (elegido && ids.includes(elegido.id)) mover(1); };
  const accionRestaurar = () => { const ids = idsAccion(); if (ids.length) onActualizarVarios?.(ids, { descartado: 0 }); };
  const accionProveedor = (id) => { const s = suppliers.find(x => x.id === id); onActualizarVarios?.(idsAccion(), { supplierId: id ?? null, supplierCompany: s?.company || null }); };
  const accionCategoria = (c) => onActualizarVarios?.(idsAccion(), { category: c });
  const accionBorrar = () => { const ids = idsAccion(); if (!ids.length) return; onEliminarVarios?.(ids); deseleccionar(); setSeleccion(null); };
  const accionPedido = async () => {
    const ids = idsAccion(); if (!ids.length) return;
    const r = await onAgregarAlPedidoVarios?.(ids);
    if (r?.abrir) { setPedidoAbierto({ ...r.abrir, primero: ids[0] }); setSeccion("pedidos"); setSeleccion(null); setProveedorSel(null); }
    deseleccionar();
  };

  // ── Panel: ancho y foto grande ──
  const maxAncho = () => Math.max(ANCHO_PANEL_MIN, Math.round((typeof window !== "undefined" ? window.innerWidth : 1400) * 0.62));
  const panelAmplio = anchoPanel >= ANCHO_PANEL + 120;
  const alternarPanel = () => { const n = panelAmplio ? ANCHO_PANEL : Math.min(maxAncho(), 620); setAnchoPanel(n); guardarAncho(n); };
  const empezarArrastre = (e) => {
    e.preventDefault(); arrastre.current = true;
    const moverAncho = (ev) => { const n = Math.min(maxAncho(), Math.max(ANCHO_PANEL_MIN, Math.round(window.innerWidth - ev.clientX))); setAnchoPanel(n); };
    const soltar = () => { arrastre.current = false; window.removeEventListener("mousemove", moverAncho); window.removeEventListener("mouseup", soltar); setAnchoPanel(n => { guardarAncho(n); return n; }); };
    window.addEventListener("mousemove", moverAncho); window.addEventListener("mouseup", soltar);
  };

  // ── Teclado (pieza 5): nunca mientras se escribe en un campo ──
  useEffect(() => {
    const al = (e) => {
      const tag = (e.target?.tagName || "").toLowerCase();
      const escribiendo = tag === "input" || tag === "textarea" || tag === "select" || e.target?.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPaletaAbierta(v => !v); return; }
      if (paletaAbierta) return;
      if (escribiendo) { if (e.key === "Escape") e.target.blur?.(); return; }
      if (fotoGrande != null && elegido) {
        const total = (elegido.photos?.length || elegido.photoUrls?.length || 1);
        if (e.key === "Escape") setFotoGrande(null);
        else if (e.key === "ArrowRight") setFotoGrande(i => (i + 1) % total);
        else if (e.key === "ArrowLeft") setFotoGrande(i => (i - 1 + total) % total);
        return;
      }
      if (e.key === "?") { e.preventDefault(); setAtajosAbiertos(v => !v); return; }
      if (atajosAbiertos) { if (e.key === "Escape") setAtajosAbiertos(false); return; }
      if (e.key === "Escape") { if (popover) setPopover(null); else if (nombrandoVista) setNombrandoVista(false); else if (hayVarios) deseleccionar(); else setSeleccion(null); return; }
      if (SECCIONES_TECLA[e.key] && !e.metaKey && !e.ctrlKey && !e.altKey) { irA(SECCIONES_TECLA[e.key]); return; }
      const enCat = seccion === "catalogo" || seccion === "revisar";
      if (!enCat && seccion !== "proveedores") return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "a" && enCat) { e.preventDefault(); setSeleccionados(new Set(filtrados.map(p => p.id))); return; }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      switch (e.key) {
        case "ArrowRight": case "ArrowDown": e.preventDefault(); mover(1); break;
        case "ArrowLeft": case "ArrowUp": e.preventDefault(); mover(-1); break;
        case " ": if (elegido) { e.preventDefault(); setFotoGrande(0); } break;
        case "f": case "F": accionFavorito(); break;
        case "x": case "X": accionDescartar(); break;
        case "p": case "P": accionPedido(); break;
        case "g": case "G": if (enCat) setVista("grilla"); break;
        case "t": case "T": if (enCat) setVista("tabla"); break;
        default: break;
      }
    };
    window.addEventListener("keydown", al);
    return () => window.removeEventListener("keydown", al);
  });

  // ── Navegación entre secciones ──
  const agregarAlPedido = async (p) => {
    const s = suppliers.find(x => x.id === p.supplierId); if (!s) return;
    const pedido = await onPedidoPara?.(s); if (!pedido) return;
    setPedidoAbierto({ supplierId: s.id, pedidoId: pedido.id, primero: p.id }); setSeccion("pedidos"); setSeleccion(null); setProveedorSel(null);
  };
  const abrirPedidoDe = async (s) => {
    const pedido = await onPedidoPara?.(s); if (!pedido) return;
    setPedidoAbierto({ supplierId: s.id, pedidoId: pedido.id, primero: null }); setSeccion("pedidos"); setSeleccion(null); setProveedorSel(null);
  };
  const verProveedor = (s) => { setSeccion("proveedores"); setProveedorSel(s.id); setSeleccion(null); setPedidoAbierto(null); };
  const verProducto = (p) => { setSeccion("catalogo"); setSeleccion(p.id); setProveedorSel(null); setPedidoAbierto(null); };
  const invitar = onInvitar || (() => irA("ajustes"));
  const cerrarBienvenida = () => { setBienvenida(false); try { localStorage.setItem(CLAVE_BIENVENIDA, "1"); } catch { /* modo privado */ } };

  // ── Filtros (pieza 4) ──
  const ponerFiltro = (clave, valor) => { setFiltros(prev => { const n = { ...prev }; if (valor == null || valor === false || (Array.isArray(valor) && !valor.length)) delete n[clave]; else n[clave] = valor; return n; }); setPopover(null); };
  const quitarFiltros = () => { setFiltros({}); setConsulta(""); };
  const textoFiltro = (clave, valor) => {
    const nombre = t(`escritorio.filtro.${clave}`);
    switch (clave) {
      case "proveedor": return `${nombre}: ${valor.map(id => suppliers.find(s => s.id === Number(id))?.company || "?").join(", ")}`;
      case "categoria": return `${nombre}: ${valor.join(", ")}`;
      case "precio": case "moq": return `${nombre}: ${valor.min != null ? `${t("escritorio.desde")} ${valor.min}` : ""} ${valor.max != null ? `${t("escritorio.hasta")} ${valor.max}` : ""}`.replace(/\s+/g, " ").trim();
      case "fotos": return t(`escritorio.fotosOpcion.${valor}`);
      case "capturado": return typeof valor === "string" ? `${nombre}: ${t(`escritorio.capturadoOpcion.${valor}`)}` : nombre;
      case "descartado": return t(`escritorio.descartadoOpcion.${valor}`);
      default: return nombre;
    }
  };
  const cajaFlotante = { position: "absolute", left: 0, top: "calc(100% + 6px)", zIndex: 9, background: paleta.card, border: `1px solid ${paleta.border}`, borderRadius: radios.medio, boxShadow: "0 10px 30px rgba(0,0,0,0.18)", padding: 10, minWidth: 220, display: "flex", flexDirection: "column", gap: 6 };
  const casilla = (marcado) => <span style={{ width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${marcado ? paleta.accent : paleta.dim}`, background: marcado ? paleta.accent : "transparent", display: "grid", placeItems: "center", flexShrink: 0 }}>{marcado && <Icono nombre="listo" tamano={11} color="#fff" />}</span>;
  const editorDeFiltro = (clave) => {
    const campo = { width: 90, minHeight: 32, borderRadius: radios.chico, border: `1px solid ${paleta.border}`, padding: "0 8px", fontFamily: "inherit", background: paleta.surface, color: paleta.text };
    const rango = (k) => (
      <form style={cajaFlotante} onClick={e => e.stopPropagation()} onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); const a = f.get("min"), b = f.get("max"); ponerFiltro(k, { min: a === "" ? null : Number(a), max: b === "" ? null : Number(b) }); }}>
        <span style={texto("pie", { fontWeight: 600 })}>{t(`escritorio.filtro.${k}`)}</span>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input name="min" type="number" step="any" defaultValue={filtros[k]?.min ?? ""} placeholder={t("escritorio.desde")} aria-label={`${t(`escritorio.filtro.${k}`)} ${t("escritorio.desde")}`} style={campo} />
          <input name="max" type="number" step="any" defaultValue={filtros[k]?.max ?? ""} placeholder={t("escritorio.hasta")} aria-label={`${t(`escritorio.filtro.${k}`)} ${t("escritorio.hasta")}`} style={campo} />
        </div>
        <Boton variante="principal" tipo="submit">{t("escritorio.aplicar")}</Boton>
      </form>
    );
    const opciones = (k, lista) => (
      <div style={cajaFlotante} onClick={e => e.stopPropagation()}>
        {lista.map(([valor, textoOp]) => <button key={String(valor)} type="button" onClick={() => ponerFiltro(k, valor)} style={{ textAlign: "left", border: "none", background: filtros[k] === valor ? paleta.accentSoft : "transparent", borderRadius: radios.chico, padding: "8px 10px", fontFamily: "inherit", fontSize: 14, color: paleta.text, cursor: "pointer" }}>{textoOp}</button>)}
      </div>
    );
    const multiple = (k, lista, actual = []) => (
      <div style={{ ...cajaFlotante, maxHeight: 320, overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        {lista.length === 0 && <span style={{ ...texto("pie"), color: paleta.dim }}>—</span>}
        {lista.map(([valor, textoOp]) => {
          const marcado = actual.map(String).includes(String(valor));
          return (
            <button key={String(valor)} type="button" role="checkbox" aria-checked={marcado}
              onClick={() => { const set = new Set(actual.map(String)); if (marcado) set.delete(String(valor)); else set.add(String(valor)); const arr = [...set].map(x => (k === "proveedor" ? Number(x) : x)); setFiltros(prev => { const n = { ...prev }; if (arr.length) n[k] = arr; else delete n[k]; return n; }); }}
              style={{ display: "flex", alignItems: "center", gap: 8, textAlign: "left", border: "none", background: "transparent", padding: "6px 8px", fontFamily: "inherit", fontSize: 14, color: paleta.text, cursor: "pointer" }}>
              {casilla(marcado)}{textoOp}
            </button>
          );
        })}
        <Boton variante="principal" onClick={() => setPopover(null)}>{t("comun.listo")}</Boton>
      </div>
    );
    switch (clave) {
      case "proveedor": return multiple("proveedor", proveedores.map(s => [s.id, s.company || `#${s.id}`]), filtros.proveedor || []);
      case "categoria": return multiple("categoria", categorias.map(c => [c, c]), filtros.categoria || []);
      case "precio": return rango("precio");
      case "moq": return rango("moq");
      case "fotos": return opciones("fotos", ["con", "sin", "varias"].map(v => [v, t(`escritorio.fotosOpcion.${v}`)]));
      case "capturado": return opciones("capturado", ["hoy", "semana"].map(v => [v, t(`escritorio.capturadoOpcion.${v}`)]));
      case "descartado": return opciones("descartado", ["solo", "todos"].map(v => [v, t(`escritorio.descartadoOpcion.${v}`)]));
      default: return null;
    }
  };
  const elegirFiltro = (clave) => { if (BOOLEANOS.includes(clave)) ponerFiltro(clave, true); else setPopover({ editando: clave }); };
  const filtrosActivos = CLAVES_FILTRO.filter(k => filtros[k] != null && filtros[k] !== false && !(Array.isArray(filtros[k]) && !filtros[k].length));
  const nFiltros = filtrosActivos.length + (consulta.trim() ? 1 : 0);

  // ── Barra lateral ──
  const itemLateral = (clave, icono, textoItem, cantidad) => {
    const activo = seccion === clave && !(clave === "catalogo" && vistaActiva);
    return (
      <button key={clave} type="button" onClick={() => { irA(clave); if (clave === "catalogo") { setVistaActiva(null); setFiltros({}); setOrden(ORDEN_DEFAULT); setColumnas(null); setVista("grilla"); } }} aria-current={activo ? "page" : undefined}
        style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 38, padding: "0 12px", borderRadius: radios.medio, border: "none", background: activo ? paleta.accentSoft : "transparent", color: activo ? paleta.accentTexto : paleta.muted, fontFamily: "inherit", fontSize: 14, fontWeight: activo ? 700 : 500, cursor: "pointer", textAlign: "left", width: "100%" }}>
        <Icono nombre={icono} tamano={18} color={activo ? paleta.accentTexto : paleta.muted} />
        <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{textoItem}</span>
        {cantidad != null && cantidad > 0 ? <span style={{ fontSize: 12, fontWeight: 600, color: activo ? paleta.accentTexto : paleta.dim, fontVariantNumeric: "tabular-nums" }}>{cantidad}</span> : null}
      </button>
    );
  };
  const itemVista = (v) => {
    const activo = vistaActiva === v.id && seccion === "catalogo";
    return (
      <button key={v.id} type="button" onClick={() => aplicarVista(v)} aria-current={activo ? "page" : undefined} title={v.nombre}
        style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 30, padding: "0 12px 0 40px", borderRadius: radios.medio, border: "none", background: activo ? paleta.accentSoft : "transparent", color: activo ? paleta.accentTexto : paleta.muted, fontFamily: "inherit", fontSize: 13, fontWeight: activo ? 700 : 500, cursor: "pointer", textAlign: "left", width: "100%" }}>
        <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{v.nombre}</span>
        <span style={{ fontSize: 11, color: activo ? paleta.accentTexto : paleta.dim, fontVariantNumeric: "tabular-nums" }}>{contarVista(v)}</span>
      </button>
    );
  };

  const conPanel = seccion === "catalogo" || seccion === "revisar" || seccion === "proveedores";
  const enCatalogo = seccion === "catalogo" || seccion === "revisar";
  const feriaActiva = districts.find(d => d.id === activeDistrictId) || null;
  const otraFeria = useMemo(() => {
    const cuenta = new Map(); for (const p of products) if (p.districtId != null && p.districtId !== activeDistrictId) cuenta.set(p.districtId, (cuenta.get(p.districtId) || 0) + 1);
    const mejor = [...cuenta.entries()].sort((a, b) => b[1] - a[1])[0]; if (!mejor) return null;
    const d = districts.find(x => x.id === mejor[0]); return d ? { ...d, cantidad: mejor[1] } : null;
  }, [products, districts, activeDistrictId]);

  // ── Grilla (pieza 2, decisión 2: la casilla al pasar el mouse, y siempre cuando hay una elegida) ──
  const grilla = (
    <div className="fs-grilla" data-hay={hayVarios ? "1" : "0"} style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 10 }}>
      {filtrados.map(p => {
        const activo = p.id === seleccion; const marcado = seleccionados.has(p.id);
        return (
          <div key={p.id} className="fs-celda" data-sel={marcado ? "1" : "0"} style={{ position: "relative", borderRadius: radios.medio, overflow: "hidden", aspectRatio: "1", background: paleta.surface, boxShadow: paleta.sombraTarjeta, outline: marcado || activo ? `3px solid ${paleta.accent}` : "none", outlineOffset: -3, opacity: p.descartado ? 0.6 : 1 }}>
            <button type="button" onClick={(e) => tocarProducto(p, e)} aria-pressed={activo} aria-label={p.name || t("catalogo.procesandoNombre")} style={{ position: "absolute", inset: 0, padding: 0, border: "none", background: "transparent", cursor: "pointer" }}>
              <Miniatura p={p} Foto={Foto} tLegacy={tLegacy} paleta={paleta} />
              <span style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "18px 8px 6px", background: "linear-gradient(to top, rgba(10,14,23,0.8), rgba(10,14,23,0))", color: "#fff", fontSize: 12, fontWeight: 600, textAlign: "left", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {p.name || t("catalogo.procesandoNombre")}{p.price ? <span style={{ fontWeight: 400, opacity: 0.85 }}> · {moneda} {p.price}</span> : null}
              </span>
            </button>
            <button type="button" className="fs-cb" role="checkbox" aria-checked={marcado} aria-label={`${t("escritorio.elegir")} ${p.name || ""}`.trim()} onClick={(e) => { e.stopPropagation(); alternar(p, e); }}
              style={{ position: "absolute", top: 6, left: 6, width: 22, height: 22, borderRadius: 6, border: `2px solid ${marcado ? paleta.accent : "#fff"}`, background: marcado ? paleta.accent : "rgba(10,14,23,0.45)", display: "grid", placeItems: "center", cursor: "pointer", padding: 0 }}>
              {marcado && <Icono nombre="listo" tamano={13} color="#fff" />}
            </button>
            {p.favorito ? <span style={{ position: "absolute", top: 6, right: 6, width: 22, height: 22, borderRadius: 11, background: paleta.accent, display: "grid", placeItems: "center", pointerEvents: "none" }}><Icono nombre="favorito" tamano={12} color="#fff" /></span> : null}
            {(p.photos?.length || 0) > 1 && <span style={{ position: "absolute", top: 34, left: 6, padding: "1px 6px", borderRadius: 999, background: "rgba(10,14,23,0.6)", color: "#fff", fontSize: 11, fontWeight: 600, pointerEvents: "none" }}>{p.photos.length}</span>}
          </div>
        );
      })}
    </div>
  );

  // ── Estados vacíos (pieza 6) ──
  const vacio = () => {
    if (esperandoNube(estadoDatos)) return <p style={{ ...texto("cuerpo", { fontWeight: 400 }), color: paleta.muted, margin: "24px 0" }}>{t(`datos.${estadoDatos.clave}`, estadoDatos)}</p>;
    if (base.length > 0 || nFiltros > 0) {
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 10, margin: "24px 0" }}>
          <p style={{ ...texto("cuerpo", { fontWeight: 400 }), color: paleta.muted, margin: 0 }}>{seccion === "revisar" && !nFiltros ? t("escritorio.revisarVacio") : t("escritorio.sinResultadosFiltros")}</p>
          {nFiltros > 0 && <Boton variante="secundario" onClick={quitarFiltros}>{t("escritorio.quitarFiltros")}</Boton>}
          {descartados > 0 && !filtros.descartado && <Boton variante="fantasma" icono="ojoCerrado" onClick={() => ponerFiltro("descartado", "solo")}>{t("escritorio.verDescartados")} · {descartados}</Boton>}
        </div>
      );
    }
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 12, margin: "40px auto", maxWidth: 520 }}>
        <p style={{ ...texto("titulo"), margin: 0 }}>{t("escritorio.feriaSinFotosTitulo", { feria: feriaActiva?.name || t("escritorio.todasLasFerias") })}</p>
        <p style={{ ...texto("cuerpo", { fontWeight: 400 }), color: paleta.muted, margin: 0 }}>{t("escritorio.feriaSinFotosTexto")}</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, width: "100%", opacity: 0.55 }}>
          {[0, 1, 2, 3].map(i => <span key={i} style={{ aspectRatio: "1", borderRadius: radios.medio, background: `repeating-linear-gradient(135deg, ${paleta.border} 0 6px, ${paleta.surface} 6px 12px)` }} />)}
        </div>
        <Boton variante="principal" icono="equipo" onClick={invitar}>{t("escritorio.invitarEquipo")}</Boton>
        {otraFeria && <Boton variante="fantasma" icono="feria" onClick={() => onSwitchDistrict?.(otraFeria.id)}>{t("escritorio.mirarOtraFeria", { feria: otraFeria.name, count: otraFeria.cantidad })}</Boton>}
      </div>
    );
  };

  // ── Centro: catálogo ──
  const titulo = seccion === "revisar" ? t("escritorio.revisarTitulo", { count: deHoy.length }) : vistaActivaObj ? vistaActivaObj.nombre : t("escritorio.catalogo");
  const etiquetaColumna = (c) => ({ proveedor: t("escritorio.columnaProveedor"), price: t("escritorio.columnaPrecio"), moq: t("escritorio.columnaMoq"), piezasPorCaja: t("ficha.piezasPorCaja"), cbmPorCaja: t("ficha.cbmPorCaja"), category: t("escritorio.columnaCategoria"), material: t("ficha.materiales"), createdAt: t("escritorio.columnaFecha"), notes: t("ficha.notas") }[c] || c);
  const centroCatalogo = (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <h1 style={{ ...texto("titulo"), margin: 0 }}>{titulo}</h1>
        {vistaActivaObj && !vistaActivaObj.fabrica && <Boton variante="fantasma" icono="borrar" onClick={borrarVistaActiva}>{t("escritorio.borrarVista")}</Boton>}
        {modificada && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, ...texto("pie"), color: paleta.muted }}>
            {t("escritorio.vistaModificada")} ·
            <button type="button" onClick={guardarCambiosDeVista} style={{ border: "none", background: "none", color: paleta.accentTexto, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>{vistaActivaObj.fabrica ? t("escritorio.guardarVista").replace("+ ", "") : t("escritorio.guardarCambios")}</button> ·
            <button type="button" onClick={() => aplicarVista(vistaActivaObj)} style={{ border: "none", background: "none", color: paleta.accentTexto, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>{t("escritorio.deshacerCambios")}</button>
          </span>
        )}
        <span style={{ marginLeft: "auto", display: "inline-flex", gap: 8, alignItems: "center" }}>
          <div role="group" aria-label={t("escritorio.verGrilla")} style={{ display: "inline-flex", border: `1px solid ${paleta.border}`, borderRadius: radios.medio, overflow: "hidden", background: paleta.card }}>
            {[["grilla", "foto", t("escritorio.verGrilla"), "G"], ["tabla", "pedido", t("escritorio.verTabla"), "T"]].map(([v, ic, et, k]) => (
              <button key={v} type="button" onClick={() => setVista(v)} aria-pressed={vista === v} aria-label={et} title={`${et} · ${k}`} style={{ width: 40, height: 36, border: "none", background: vista === v ? paleta.text : "transparent", display: "grid", placeItems: "center", cursor: "pointer" }}>
                <Icono nombre={ic} tamano={18} color={vista === v ? paleta.card : paleta.muted} />
              </button>
            ))}
          </div>
          {vista === "tabla" && (
            <span style={{ position: "relative" }} onClick={e => e.stopPropagation()}>
              <Boton variante="secundario" onClick={() => setPopover(p => (p === "columnas" ? null : "columnas"))}>{t("escritorio.columnas")} ▾</Boton>
              {popover === "columnas" && (
                <div role="group" aria-label={t("escritorio.columnas")} style={{ ...cajaFlotante, left: "auto", right: 0, gap: 2 }}>
                  <span style={{ ...texto("pie"), color: paleta.dim, marginBottom: 4 }}>{t("escritorio.columnasFijas")}</span>
                  {COLUMNAS_OPCIONALES.map(c => {
                    const activas = columnas || COLUMNAS_DEFAULT; const on = activas.includes(c);
                    return (
                      <button key={c} type="button" role="checkbox" aria-checked={on} onClick={() => setColumnas(on ? activas.filter(x => x !== c) : COLUMNAS_OPCIONALES.filter(x => activas.includes(x) || x === c))}
                        style={{ display: "flex", alignItems: "center", gap: 8, textAlign: "left", border: "none", background: "transparent", padding: "6px 8px", fontFamily: "inherit", fontSize: 14, color: paleta.text, cursor: "pointer" }}>
                        {casilla(on)}{etiquetaColumna(c)}
                      </button>
                    );
                  })}
                </div>
              )}
            </span>
          )}
        </span>
      </div>

      {/* Filtros como chips que se combinan */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        {filtrosActivos.map(k => <Chip key={k} activo onClick={() => ponerFiltro(k, null)} etiqueta={`${textoFiltro(k, filtros[k])} · ${t("comun.borrar")}`}>{textoFiltro(k, filtros[k])} ✕</Chip>)}
        <span style={{ position: "relative" }} onClick={e => e.stopPropagation()}>
          <button type="button" onClick={() => setPopover(p => (p === "filtro" ? null : "filtro"))} aria-expanded={popover === "filtro"} style={{ minHeight: 36, padding: "0 12px", borderRadius: 999, border: `1px dashed ${paleta.accent}`, background: "transparent", color: paleta.accentTexto, fontFamily: "inherit", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{t("escritorio.masFiltro")}</button>
          {popover === "filtro" && (
            <div role="menu" style={{ ...cajaFlotante, padding: 6, gap: 0 }}>
              {CLAVES_FILTRO.filter(k => filtros[k] == null).map(k => <button key={k} type="button" role="menuitem" onClick={() => elegirFiltro(k)} style={{ textAlign: "left", border: "none", background: "transparent", borderRadius: radios.chico, padding: "8px 10px", fontFamily: "inherit", fontSize: 14, color: paleta.text, cursor: "pointer" }}>{t(`escritorio.filtro.${k}`)}</button>)}
            </div>
          )}
          {popover && popover.editando && editorDeFiltro(popover.editando)}
        </span>
        {nFiltros > 0 && <button type="button" onClick={quitarFiltros} style={{ border: "none", background: "none", color: paleta.muted, fontFamily: "inherit", fontSize: 13, textDecoration: "underline", cursor: "pointer" }}>{t("escritorio.quitarFiltros")}</button>}
        <span style={{ marginLeft: "auto", ...texto("pie"), color: paleta.dim, fontVariantNumeric: "tabular-nums" }}>{t("escritorio.resultados", { count: filtrados.length })}{descartados > 0 && !filtros.descartado ? ` · ${t("escritorio.descartados", { count: descartados })}` : ""}</span>
      </div>

      {filtrados.length === 0 ? vacio() : vista === "tabla"
        ? <TablaDeProductos productos={filtrados} suppliers={suppliers} moneda={moneda} seleccionado={seleccion} seleccionados={seleccionados} orden={orden} columnas={columnas} settings={settings} Foto={Foto} tLegacy={tLegacy}
            onSeleccionar={tocarProducto} onAlternar={alternar} onAlternarTodos={alternarTodos}
            onOrden={(campo) => setOrden(o => ({ campo, dir: o.campo === campo ? (o.dir === "asc" ? "desc" : "asc") : (campo === "createdAt" ? "desc" : "asc") }))} onActualizar={onActualizarProducto} />
        : grilla}
    </div>
  );

  // ── Centro: proveedores ──
  const centroProveedores = (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <h1 style={{ ...texto("titulo"), margin: 0 }}>{t("escritorio.proveedores")} · {proveedoresBuscados.length}</h1>
      {proveedoresBuscados.length === 0 ? <p style={{ ...texto("cuerpo", { fontWeight: 400 }), color: paleta.muted, margin: "24px 0" }}>{consulta ? t("escritorio.sinResultados") : t("catalogo.sinProveedores")}</p> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
          {proveedoresBuscados.map(s => {
            const suyos = products.filter(p => p.supplierId === s.id); const tarjeta = s.cardPhoto || s.cardPhotoUrl || null; const activo = s.id === proveedorSel;
            return (
              <button key={s.id} type="button" onClick={() => { setProveedorSel(s.id); setSeleccion(null); }} aria-pressed={activo}
                style={{ padding: 0, border: `1px solid ${activo ? paleta.accent : paleta.border}`, borderRadius: radios.grande, overflow: "hidden", background: paleta.card, cursor: "pointer", textAlign: "left", boxShadow: activo ? `0 0 0 2px ${paleta.accentSoft}` : paleta.sombraTarjeta, fontFamily: "inherit" }}>
                <div style={{ aspectRatio: "1.6", background: paleta.surface, position: "relative" }}>
                  {tarjeta ? <img src={tarjeta} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block", background: "#0F172A" }} /> : suyos[0] ? <Miniatura p={suyos[0]} Foto={Foto} tLegacy={tLegacy} paleta={paleta} /> : <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center" }}><Icono nombre="proveedor" tamano={28} color={paleta.dim} /></div>}
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

  // ── Panel derecho ──
  const panelVacio = (textoVacio) => (
    <div style={{ padding: 24, color: paleta.dim, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginTop: 60 }}>
      <Icono nombre="ojo" tamano={28} color={paleta.dim} /><p style={{ ...texto("cuerpo", { fontWeight: 400 }), margin: 0 }}>{textoVacio}</p>
    </div>
  );
  const panel = hayVarios ? (
    <PanelSeleccion productos={productosElegidos} suppliers={suppliers} moneda={moneda} Foto={Foto} tLegacy={tLegacy} onFavorito={accionFavorito} onAgregarAlPedido={accionPedido} onDescartar={accionDescartar} onRestaurar={accionRestaurar} onBorrar={accionBorrar} onCerrar={deseleccionar} />
  ) : elegido ? (
    <PanelProducto producto={elegido} suppliers={suppliers} districts={districts} moneda={moneda} settings={settings} Foto={Foto} tLegacy={tLegacy}
      posicion={idx >= 0 ? { n: idx + 1, total: filtrados.length } : null}
      onAnterior={idx > 0 ? () => mover(-1) : undefined} onSiguiente={idx >= 0 && idx < filtrados.length - 1 ? () => mover(1) : undefined}
      onCerrar={() => setSeleccion(null)} onActualizar={onActualizarProducto} onEliminar={(p) => { setSeleccion(null); onEliminarProducto?.(p.id); }}
      onAgregarAlPedido={agregarAlPedido} onVerProveedor={verProveedor}
      onVerFoto={(i) => setFotoGrande(i)} panelAmplio={panelAmplio} onAlternarPanel={alternarPanel} />
  ) : seccion === "proveedores" && proveedorElegido ? (
    <PanelProveedor proveedor={proveedorElegido} products={products} moneda={moneda} Foto={Foto} tLegacy={tLegacy} onCerrar={() => setProveedorSel(null)} onActualizar={onActualizarProveedor} onVerProducto={(p) => setSeleccion(p.id)} onArmarPedido={abrirPedidoDe} />
  ) : panelVacio(seccion === "proveedores" ? t("escritorio.elegiProveedor") : t("escritorio.elegiUno"));

  // ── Acciones de la paleta ──
  const accionesPaleta = [
    { id: "fav", texto: t("escritorio.favorito"), tecla: "F", run: accionFavorito },
    { id: "desc", texto: t("escritorio.descartar"), tecla: "X", run: accionDescartar },
    { id: "ped", texto: t("escritorio.agregarAlPedido"), tecla: "P", run: accionPedido },
    { id: "grilla", texto: t("escritorio.verGrilla"), tecla: "G", run: () => { irA("catalogo"); setVista("grilla"); } },
    { id: "tabla", texto: t("escritorio.verTabla"), tecla: "T", run: () => { irA("catalogo"); setVista("tabla"); } },
    { id: "s1", texto: t("escritorio.catalogo"), tecla: "1", run: () => irA("catalogo") },
    { id: "s2", texto: t("escritorio.proveedores"), tecla: "2", run: () => irA("proveedores") },
    { id: "s3", texto: t("escritorio.pedidos"), tecla: "3", run: () => irA("pedidos") },
    { id: "s4", texto: t("escritorio.revisarDia"), tecla: "4", run: () => irA("revisar") },
    { id: "s5", texto: t("escritorio.exportar"), tecla: "5", run: () => irA("exportar") },
    { id: "s6", texto: t("escritorio.ajustes"), run: () => irA("ajustes") },
    { id: "guardar", texto: t("escritorio.guardarVista").replace("+ ", ""), run: () => { irA("catalogo"); setNombrandoVista(true); } },
    { id: "quitar", texto: t("escritorio.quitarFiltros"), run: quitarFiltros },
    { id: "descartados", texto: t("escritorio.verDescartados"), run: () => { irA("catalogo"); ponerFiltro("descartado", "solo"); } },
    { id: "atajos", texto: t("escritorio.atajosTitulo"), tecla: "?", run: () => setAtajosAbiertos(true) },
  ];

  const botonRedondo = (nombre, etiqueta, onClick) => <button type="button" onClick={onClick} aria-label={etiqueta} style={{ width: 32, height: 32, borderRadius: 16, border: `1px solid ${paleta.border}`, background: paleta.card, display: "grid", placeItems: "center", cursor: "pointer" }}><Icono nombre={nombre} tamano={16} color={paleta.text} /></button>;

  return (
    <div style={{ height: "100%", display: "grid", gridTemplateRows: "56px 1fr", gridTemplateColumns: `${ANCHO_LATERAL}px 1fr`, background: paleta.bg, color: paleta.text, fontFamily: "inherit", overflow: "hidden" }}>
      <style>{`.fs-celda .fs-cb{opacity:0;transition:opacity 120ms ease}.fs-celda:hover .fs-cb,.fs-celda[data-sel="1"] .fs-cb,.fs-grilla[data-hay="1"] .fs-cb{opacity:1}.fs-fila:hover{filter:brightness(0.985)}`}</style>

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
          <input type="search" value={consulta} onChange={e => setConsulta(e.target.value)} placeholder={t("escritorio.buscarOHacer")} aria-label={t("escritorio.buscar")}
            style={{ width: "100%", minHeight: 34, borderRadius: 999, border: `1px solid ${paleta.border}`, background: paleta.bg, color: paleta.text, fontFamily: "inherit", fontSize: 14, padding: "0 12px 0 32px", outline: "none" }} />
        </label>
        <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 8 }}>
          {estadoDatos && <EstadoDeDatos estado={estadoDatos} onReintentar={onReintentar} compacto estilo={{ maxWidth: 360 }} />}
          <span style={{ ...texto("pie"), color: paleta.muted, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cuenta.esAnonima || !cuenta.email ? t("escritorio.sinCuenta") : cuenta.email}</span>
          {(cuenta.esAnonima || !cuenta.email) && onEntrar ? <Boton variante="principal" onClick={onEntrar}>{t("escritorio.entrar")}</Boton> : (
            <button type="button" onClick={() => irA("ajustes")} aria-label={t("escritorio.ajustes")} style={{ width: 34, height: 34, borderRadius: 17, border: `1px solid ${paleta.border}`, background: paleta.accentSoft, color: paleta.accentTexto, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>{(cuenta.email || "?")[0].toUpperCase()}</button>
          )}
        </span>
      </header>

      {/* Barra lateral (pieza 3: las vistas debajo de Catálogo) */}
      <nav aria-label={t("escritorio.catalogo")} style={{ display: "flex", flexDirection: "column", gap: 2, padding: 10, background: paleta.card, borderRight: `1px solid ${paleta.border}`, overflowY: "auto" }}>
        {itemLateral("catalogo", "foto", t("escritorio.catalogo"), enFeria.filter(p => !p.descartado).length)}
        {vistas.map(itemVista)}
        {nombrandoVista ? (
          <form onSubmit={e => { e.preventDefault(); if (nombreVista.trim()) guardarVistaActual(nombreVista.trim()); }} style={{ display: "flex", gap: 4, padding: "2px 8px 6px 40px" }}>
            <input autoFocus value={nombreVista} onChange={e => setNombreVista(e.target.value)} placeholder={t("escritorio.nombreDeVista")} aria-label={t("escritorio.nombreDeVista")} onKeyDown={e => { if (e.key === "Escape") setNombrandoVista(false); }}
              style={{ flex: 1, minWidth: 0, minHeight: 30, borderRadius: radios.chico, border: `1px solid ${paleta.accent}`, padding: "0 8px", fontFamily: "inherit", fontSize: 13, background: paleta.surface, color: paleta.text, outline: "none" }} />
            <button type="submit" aria-label={t("comun.guardar")} style={{ width: 30, height: 30, borderRadius: radios.chico, border: "none", background: paleta.accent, display: "grid", placeItems: "center", cursor: "pointer" }}><Icono nombre="listo" tamano={14} color="#fff" /></button>
          </form>
        ) : (
          <button type="button" onClick={() => { irA("catalogo"); setNombrandoVista(true); }} style={{ textAlign: "left", border: "none", background: "transparent", color: paleta.accentTexto, fontFamily: "inherit", fontSize: 12, fontWeight: 600, padding: "4px 12px 6px 40px", cursor: "pointer" }}>{t("escritorio.guardarVista")}</button>
        )}
        {itemLateral("proveedores", "proveedor", t("escritorio.proveedores"), proveedores.length)}
        {itemLateral("pedidos", "pedido", t("escritorio.pedidos"), pedidosConContenido)}
        {itemLateral("revisar", "ojo", t("escritorio.revisarDia"), deHoy.length)}
        {itemLateral("exportar", "exportar", t("escritorio.exportar"))}
        <span style={{ flex: 1 }} />
        {itemLateral("ajustes", "ajustes", t("escritorio.ajustes"))}
        <button type="button" onClick={() => setAtajosAbiertos(true)} style={{ textAlign: "left", border: "none", background: "transparent", color: paleta.dim, fontFamily: "inherit", fontSize: 11, padding: "4px 12px", cursor: "pointer" }}>{t("escritorio.atajosTitulo")} · ?</button>
        <p style={{ ...texto("pie"), color: paleta.dim, margin: "4px 12px 4px", fontSize: 11 }}>{t("escritorio.soloTelefono")}</p>
      </nav>

      {/* Centro + panel */}
      <div style={{ display: "flex", minWidth: 0, minHeight: 0, position: "relative" }}>
        <main style={{ flex: 1, minWidth: 0, overflowY: "auto", padding: seccion === "pedidos" && pedidoAbierto ? 0 : 20, position: "relative" }} onClick={() => popover && setPopover(null)}>
          {bienvenida && products.length > 0 && seccion !== "ajustes" && (
            <div role="note" style={{ display: "flex", alignItems: "center", gap: 10, background: paleta.accentSoft, border: `1px solid ${paleta.border}`, borderRadius: radios.medio, padding: "8px 12px", marginBottom: 14, ...texto("pie"), color: paleta.text }}>
              <Icono nombre="ojo" tamano={16} color={paleta.accentTexto} /><span style={{ flex: 1 }}>{t("escritorio.bienvenida")}</span>
              <button type="button" onClick={cerrarBienvenida} aria-label={t("escritorio.cerrarBienvenida")} style={{ border: "none", background: "none", cursor: "pointer", display: "grid", placeItems: "center" }}><Icono nombre="cerrar" tamano={16} color={paleta.muted} /></button>
            </div>
          )}
          {cuenta.esAnonima && seccion !== "ajustes" && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, background: paleta.accentSoft, border: `1px solid ${paleta.border}`, borderRadius: radios.medio, padding: "8px 12px", marginBottom: 14, color: paleta.text, ...texto("pie") }}>
              <Icono nombre="error" tamano={16} color={paleta.accentTexto} /><span style={{ flex: 1 }}>{t("escritorio.sinCuentaAviso")}</span>
            </div>
          )}
          {enCatalogo && centroCatalogo}
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
          <aside aria-label={hayVarios ? t("escritorio.elegidos", { count: seleccionados.size }) : elegido ? t("ficha.datos") : proveedorElegido ? t("proveedor.datos") : t("escritorio.elegiUno")} style={{ width: anchoPanel, flexShrink: 0, overflowY: "auto", background: paleta.card, borderLeft: `1px solid ${paleta.border}`, position: "relative", transition: arrastre.current ? "none" : "width 180ms ease" }}>
            <div role="separator" aria-orientation="vertical" aria-label={t("escritorio.arrastrarPanel")} title={t("escritorio.arrastrarPanel")} onMouseDown={empezarArrastre} onDoubleClick={alternarPanel} style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 8, cursor: "col-resize", zIndex: 2 }} />
            {panel}
          </aside>
        )}
        {enCatalogo && hayVarios && (
          <BarraDeSeleccion cantidad={seleccionados.size} todosFavoritos={productosElegidos.every(p => p.favorito)} algunDescartado={productosElegidos.some(p => p.descartado)} proveedores={proveedores} categorias={categorias}
            onFavorito={accionFavorito} onProveedor={accionProveedor} onCategoria={accionCategoria} onAgregarAlPedido={accionPedido} onDescartar={accionDescartar} onRestaurar={accionRestaurar} onBorrar={accionBorrar} onCerrar={deseleccionar} />
        )}
      </div>

      <Paleta abierta={paletaAbierta} onCerrar={() => setPaletaAbierta(false)} productos={enFeria} proveedores={proveedores} vistas={vistas} acciones={accionesPaleta} onProducto={verProducto} onProveedor={verProveedor} onVista={aplicarVista} />

      {/* Los atajos */}
      {atajosAbiertos && (
        <div role="dialog" aria-modal="true" aria-label={t("escritorio.atajosTitulo")} onClick={() => setAtajosAbiertos(false)} style={{ position: "fixed", inset: 0, zIndex: 65, background: "rgba(10,14,23,0.35)", display: "grid", placeItems: "center" }}>
          <div onClick={e => e.stopPropagation()} style={{ width: 560, maxWidth: "92vw", background: paleta.card, border: `1px solid ${paleta.border}`, borderRadius: radios.grande, boxShadow: "0 24px 60px rgba(0,0,0,0.35)", padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center" }}><h2 style={{ ...texto("titulo"), margin: 0, flex: 1 }}>{t("escritorio.atajosTitulo")}</h2>{botonRedondo("cerrar", t("comun.cerrar"), () => setAtajosAbiertos(false))}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[["⌘K", "paleta"], ["← →", "navegar"], ["Espacio", "fotoGrande"], ["F", "favorito"], ["X", "descartar"], ["P", "pedido"], ["⇧ clic", "rango"], ["⌘A", "todos"], ["1 … 5", "secciones"], ["G / T", "vista"], ["Esc", "cerrar"], ["?", "ayuda"]].map(([k, c]) => (
                <div key={c} style={{ display: "flex", alignItems: "center", gap: 10, background: paleta.bg, borderRadius: radios.chico, padding: "8px 10px", ...texto("pie"), color: paleta.muted }}><kbd style={{ fontFamily: "ui-monospace, monospace", fontSize: 12, background: paleta.card, border: `1px solid ${paleta.border}`, borderBottomWidth: 2, borderRadius: 5, padding: "1px 6px", color: paleta.text, whiteSpace: "nowrap" }}>{k}</kbd>{t(`escritorio.atajo.${c}`)}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* La foto a pantalla completa */}
      {fotoGrande != null && elegido && (() => {
        const fs = elegido.photos?.length ? elegido.photos : (elegido.photoUrls || []);
        const i = Math.min(fotoGrande, Math.max(0, fs.length - 1));
        return (
          <div role="dialog" aria-modal="true" aria-label={elegido.name || t("ficha.producto")} onClick={() => setFotoGrande(null)} style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(5,8,15,0.94)", display: "grid", placeItems: "center" }}>
            <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", padding: "56px 80px" }}><Miniatura p={elegido} i={i} Foto={Foto} tLegacy={tLegacy} paleta={paleta} estilo={{ objectFit: "contain", width: "100%", height: "100%" }} /></div>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, color: "#fff" }} onClick={e => e.stopPropagation()}>
              <span style={{ fontSize: 16, fontWeight: 600, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{elegido.name || t("catalogo.procesandoNombre")}{elegido.price ? <span style={{ fontWeight: 400, opacity: 0.8 }}> · {moneda} {elegido.price}</span> : null}</span>
              {fs.length > 1 && <span style={{ fontSize: 13, opacity: 0.8 }}>{t("escritorio.fotoDe", { n: i + 1, total: fs.length })}</span>}
              <button type="button" onClick={() => setFotoGrande(null)} aria-label={t("escritorio.cerrarFoto")} style={{ width: 40, height: 40, borderRadius: 20, border: "none", background: "rgba(255,255,255,0.15)", display: "grid", placeItems: "center", cursor: "pointer" }}><Icono nombre="cerrar" tamano={20} color="#fff" /></button>
            </div>
            {fs.length > 1 && (<>
              <button type="button" onClick={e => { e.stopPropagation(); setFotoGrande((i - 1 + fs.length) % fs.length); }} aria-label={t("escritorio.fotoAnterior")} style={{ position: "absolute", left: 20, top: "50%", transform: "translateY(-50%)", width: 44, height: 44, borderRadius: 22, border: "none", background: "rgba(255,255,255,0.15)", display: "grid", placeItems: "center", cursor: "pointer" }}><Icono nombre="anterior" tamano={22} color="#fff" /></button>
              <button type="button" onClick={e => { e.stopPropagation(); setFotoGrande((i + 1) % fs.length); }} aria-label={t("escritorio.fotoSiguiente")} style={{ position: "absolute", right: 20, top: "50%", transform: "translateY(-50%)", width: 44, height: 44, borderRadius: 22, border: "none", background: "rgba(255,255,255,0.15)", display: "grid", placeItems: "center", cursor: "pointer" }}><Icono nombre="siguiente" tamano={22} color="#fff" /></button>
            </>)}
          </div>
        );
      })()}
    </div>
  );
}
