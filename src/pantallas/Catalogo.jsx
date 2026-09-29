/**
 * El catálogo (propuesta-experiencia.md §3 y decisiones 3–7 del 16/09):
 *   · Hoy: el resumen del día y el botón "Revisar el día"; sin feria, un favorito viejo al azar.
 *   · Todo: grilla 4:3 por defecto (o lista), chips de filtro, búsqueda que encuentra productos y proveedores.
 *   · Proveedores: la lista, con favorito y cantidad de productos.
 * Sin cantidades ni pedido: eso vive en "Armar pedido" (decisión 4).
 *
 * Capa visible. La lógica de datos (borrar, favorito, navegar) llega por props desde App.
 */
import React, { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSistema } from "../sistema/SistemaProvider.jsx";
import { Boton, Chip, FilaDeChips, Segmentado, Fila, Precio, Icono, Esqueleto, Hoja, GrillaDeFotos, CeldaDeFoto, CarruselDeFotos, EstadoDeDatos, esperandoNube } from "../componentes/index.js";
import { palabrasDeBusqueda, coincideBusqueda } from "../lib/busqueda.js";
import { soloDeHoy, resumenDelDia, conEncabezadosDeDia } from "../lib/porDia.js";
import { elegirMiniatura, respaldoDe } from "../lib/miniaturas.js";
import { estadoIA } from "../lib/aiEstado.js";
import { proveedorVacio } from "../lib/proveedores.js";
import { haceCuanto } from "../idiomas/formato.js";

function Iniciales({ texto }) {
  const { paleta } = useSistema();
  const ini = (texto || "?").split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase();
  return <span style={{ fontWeight: 700, fontSize: 14, color: paleta.accentTexto }}>{ini}</span>;
}

export function Catalogo({
  products = [], suppliers = [], districts = [], activeDistrictId, activeDistrict, bajando = null, queueCount = 0, enLinea = true,
  Foto, t: tLegacy,
  onNavigate, onSwitchDistrict, onToggleFavorito, onToggleFavoritoProveedor, onRevisarDia, onEliminarVarios,
  pestana = "todo", onPestana, sinCuenta = false, onEntrar, estadoDatos = null, onReintentar,
}) {
  const { t } = useTranslation();
  const { paleta, alturas, radios, texto, espacios } = useSistema();
  const [buscando, setBuscando] = useState(false);
  const [consulta, setConsulta] = useState("");
  const [vista, setVista] = useState("grilla");
  const [filtro, setFiltro] = useState("todos"); // todos | favoritos | sinPrecio | sinProveedor | cat:<nombre>
  const [feriaAbierta, setFeriaAbierta] = useState(false);
  const [feria, setFeria] = useState(activeDistrictId ? "activa" : "todas");
  const [semilla, setSemilla] = useState(0);

  // Alcance: la feria activa o todas
  const enFeria = useMemo(() => (feria === "todas" ? products : products.filter(p => p.districtId === activeDistrictId)), [products, feria, activeDistrictId]);
  const palabras = useMemo(() => palabrasDeBusqueda(consulta), [consulta]);
  const buscados = useMemo(() => palabras.length ? enFeria.filter(p => coincideBusqueda([p.name, p.category, p.supplierCompany, p.notes, ...(p.material || [])], palabras)) : enFeria, [enFeria, palabras]);
  const filtrados = useMemo(() => {
    let r = buscados;
    if (filtro === "favoritos") r = r.filter(p => p.favorito);
    else if (filtro === "sinPrecio") r = r.filter(p => !p.price || isNaN(parseFloat(p.price)));
    else if (filtro === "sinProveedor") r = r.filter(p => !p.supplierId);
    else if (filtro.startsWith("cat:")) r = r.filter(p => p.category === filtro.slice(4));
    return [...r].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [buscados, filtro]);
  const categorias = useMemo(() => [...new Set(enFeria.map(p => p.category).filter(Boolean))].slice(0, 8), [enFeria]);
  const pendientes = useMemo(() => enFeria.filter(p => !p.ai_processed && estadoIA(p) !== "fallo").length, [enFeria]);
  const [avisoOculto, setAvisoOculto] = useState(false); // el cartel "procesando" se puede sacar (Nati, 21/09)

  const proveedoresBuscados = useMemo(() => {
    const base = (feria === "todas" ? suppliers : suppliers.filter(s => s.districtId === activeDistrictId)).filter(s => !proveedorVacio(s, products));
    const r = palabras.length ? base.filter(s => coincideBusqueda([s.company, s.contact, s.products, s.notes], palabras)) : base;
    return [...r].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [suppliers, feria, activeDistrictId, palabras]);
  const productosPorProveedor = useMemo(() => { const m = new Map(); for (const p of products) m.set(p.supplierId, (m.get(p.supplierId) || 0) + 1); return m; }, [products]);

  // Hoy
  const deHoy = useMemo(() => soloDeHoy(enFeria), [enFeria]);
  const resumen = useMemo(() => resumenDelDia(enFeria), [enFeria]);
  const favoritosViejos = useMemo(() => products.filter(p => p.favorito && p.photos?.[0]), [products]);
  const redescubierto = useMemo(() => favoritosViejos.length ? favoritosViejos[(semilla + favoritosViejos.length) % favoritosViejos.length] : null, [favoritosViejos, semilla]);
  const hayQueRevisar = deHoy.length > 0 && (resumen.sinPrecio > 0 || deHoy.some(p => !p.supplierId) || deHoy.some(p => p.favorito) || deHoy.length >= 3);

  // Selección múltiple para borrar (Nati, 22/09: "quise borrar y me di cuenta que falta selección múltiple")
  const [seleccion, setSeleccion] = useState(null); // null = normal · Set de ids = eligiendo
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false);
  const alternarSeleccion = (p) => setSeleccion(prev => { const n = new Set(prev || []); if (n.has(p.id)) n.delete(p.id); else n.add(p.id); return n; });
  const borrarSeleccion = () => { const ids = [...(seleccion || [])]; setConfirmandoBorrado(false); setSeleccion(null); if (ids.length) onEliminarVarios?.(ids); };
  const abrir = (p) => seleccion ? alternarSeleccion(p) : onNavigate?.("detail", p, filtrados); // el orden con los filtros puestos: la ficha desliza por estos vecinos (21/09)
  const nombreFeria = feria === "todas" ? t("catalogo.todasLasFerias") : (activeDistrict?.name || "");
  // Deslizar a los lados sobre el contenido cambia de pestaña (27/09, Nati: "que se pueda swipear entre uno y otro")
  const toqueRef = useRef(null);
  const alTocarContenido = (e) => { const t0 = e.touches[0]; toqueRef.current = { x: t0.clientX, y: t0.clientY }; };
  const alSoltarContenido = (e) => {
    const ini = toqueRef.current; toqueRef.current = null; if (!ini || seleccion) return;
    const t0 = e.changedTouches[0]; const dx = t0.clientX - ini.x, dy = t0.clientY - ini.y;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (dx < 0 && pestana === "todo") onPestana?.("proveedores");
    if (dx > 0 && pestana === "proveedores") onPestana?.("todo");
  };

  // Función, no componente: un componente definido adentro del render es un tipo nuevo cada vez y React
  // desmonta y vuelve a montar la imagen (Nati, 16/09: "las fotos titilan").
  const miniatura = (p, estilo) => {
    const src = elegirMiniatura(p) || respaldoDe(p); // copia local, o la dirección de la nube (17/09)
    if (!src) return <div style={{ width: "100%", height: "100%", background: paleta.surface, display: "grid", placeItems: "center", ...estilo }}><Icono nombre="foto" tamano={20} color={paleta.dim} /></div>;
    return Foto ? <Foto src={src} respaldo={respaldoDe(p)} t={tLegacy} estilo={{ width: "100%", height: "100%", objectFit: "cover", display: "block", ...estilo }} /> : <img src={src || respaldoDe(p)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", ...estilo }} />;
  };

  const celda = (p) => (
    <CeldaDeFoto key={p.id} onClick={() => abrir(p)} etiqueta={p.name || t("catalogo.procesandoNombre")} favorito={!!p.favorito} fotos={p.photos?.length || 0}
      estilo={seleccion ? { opacity: seleccion.has(p.id) ? 1 : 0.55, outline: seleccion.has(p.id) ? `3px solid ${paleta.accent}` : "none", outlineOffset: -3 } : undefined}
      insignia={seleccion ? <span style={{ width: 24, height: 24, borderRadius: 12, border: "2px solid #fff", background: seleccion.has(p.id) ? paleta.accent : "rgba(43,18,6,0.35)", display: "grid", placeItems: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.4)" }}>{seleccion.has(p.id) && <Icono nombre="listo" tamano={14} color="#fff" />}</span> : estadoIA(p) === "fallo" ? <span style={{ width: 22, height: 22, borderRadius: 6, background: "rgba(220,38,38,0.85)", display: "grid", placeItems: "center" }}><Icono nombre="error" tamano={13} color="#fff" /></span> : (!p.name && !p.ai_processed) ? <Esqueleto ancho={22} alto={22} radio={6} estilo={{ background: "rgba(241,245,249,0.7)" }} /> : null}>
      {miniatura(p)}
    </CeldaDeFoto>
  );
  // Hoy es un feed de publicaciones (Nati, 17/09): proveedor arriba, carrusel de fotos, estrella y precio, nombre.
  const publicacion = (p) => {
    const sup = suppliers.find(s => s.id === p.supplierId);
    const sinNombre = !p.name && !p.ai_processed;
    return (
      <article key={p.id} style={{ margin: `0 -${espacios.margenLateral}px`, background: paleta.card, borderTop: `1px solid ${paleta.border}`, borderBottom: `1px solid ${paleta.border}` }}>
        <header style={{ display: "flex", alignItems: "center", gap: 10, padding: `10px ${espacios.margenLateral}px` }}>
          <span style={{ width: 32, height: 32, borderRadius: 16, background: paleta.surface, border: `1px solid ${paleta.border}`, display: "grid", placeItems: "center", flexShrink: 0 }}><Icono nombre="proveedor" tamano={16} color={paleta.muted} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ ...texto("cuerpo", { fontWeight: 600 }), margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sup?.company || p.supplierCompany || t("catalogo.sinProveedor")}</p>
            <p style={{ ...texto("pie"), color: paleta.dim, margin: 0 }}>{haceCuanto(p.createdAt)}</p>
          </div>
        </header>
        <CarruselDeFotos fotos={p.photos || []} respaldos={p.photoUrls || []} Foto={Foto} tLegacy={tLegacy} onTocar={() => abrir(p)} etiqueta={p.name || t("catalogo.procesandoNombre")} />
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: `4px ${espacios.margenLateral - 8}px 0` }}>
          <button type="button" onClick={() => onToggleFavorito?.(p)} aria-pressed={!!p.favorito} aria-label={p.favorito ? t("ficha.quitarFavorito") : t("ficha.marcarFavorito")} style={{ width: alturas.tocable, height: alturas.tocable, border: "none", background: "none", display: "grid", placeItems: "center", cursor: "pointer", WebkitTapHighlightColor: "transparent" }}><Icono nombre="favorito" tamano={24} color={p.favorito ? paleta.accentTexto : paleta.text} /></button>
          <span style={{ flex: 1 }} />
          {p.price && <span style={{ ...texto("destacado"), color: paleta.green, fontVariantNumeric: "tabular-nums", paddingRight: 8 }}>USD {p.price}</span>}
        </div>
        <p style={{ ...texto("cuerpo", { fontWeight: 400 }), margin: 0, padding: `0 ${espacios.margenLateral}px 12px` }}>
          {sinNombre ? <Esqueleto ancho={160} alto={12} /> : <><b>{p.name || t("catalogo.procesandoNombre")}</b>{p.moq ? <span style={{ color: paleta.muted }}> · MOQ {p.moq}</span> : null}</>}
        </p>
      </article>
    );
  };

  const seccion = (txt) => <h3 style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: paleta.dim, margin: "8px 2px 2px" }}>{txt}</h3>;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: paleta.bg, color: paleta.text, fontFamily: "inherit" }}>
      {/* Barra superior (27/09, A1 elegida por Nati: "mucha info, muchas tipografías, poca jerarquía"): la feria es el
          título, el estado de los datos es un punto al lado (tocarlo dice qué pasa), tres íconos chicos sin tarjeta. */}
      <div style={{ padding: `calc(0px + 10px) ${espacios.margenLateral}px 0`, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, minHeight: alturas.tocable }}>
          {estadoDatos && <EstadoDeDatos estado={estadoDatos} onReintentar={onReintentar} onEntrar={onEntrar} soloPunto estilo={{ marginLeft: -6 }} />}
          <button type="button" onClick={() => setFeriaAbierta(true)} aria-label={t("catalogo.ferias")} style={{ flex: 1, minWidth: 0, display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "inherit", color: paleta.text, textAlign: "left" }}>
            <h1 style={{ ...texto("titulo"), fontSize: 22, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{nombreFeria}</h1>
            <Icono nombre="abajo" tamano={18} color={paleta.dim} />
          </button>
          {[["buscar", t("comun.buscar"), () => { setBuscando(v => !v); if (buscando) setConsulta(""); }, buscando], ["pedido", t("catalogo.pedidos"), () => onNavigate?.("pedidos"), false], ["ajustes", t("catalogo.ajustes"), () => onNavigate?.("settings"), false]].map(([icono, etiqueta, onClick, activo]) => (
            <button key={icono} type="button" onClick={onClick} aria-label={etiqueta} aria-pressed={icono === "buscar" ? activo : undefined} style={{ width: 40, height: 40, borderRadius: 20, border: "none", background: activo ? paleta.accentSoft : "transparent", display: "grid", placeItems: "center", cursor: "pointer" }}><Icono nombre={icono} tamano={22} color={activo ? paleta.accentTexto : paleta.muted} /></button>
          ))}
        </div>
        {buscando && (
          <input autoFocus value={consulta} onChange={e => setConsulta(e.target.value)} placeholder={t("catalogo.buscar")} aria-label={t("catalogo.buscar")}
            style={{ ...texto("cuerpo", { fontWeight: 400 }), minHeight: alturas.campo, borderRadius: radios.medio, border: `1px solid ${paleta.border}`, background: paleta.surface, color: paleta.text, padding: "0 14px", fontFamily: "inherit", outline: "none", width: "100%" }} />
        )}
        <div role="tablist" aria-label={t("catalogo.titulo")} style={{ display: "flex", borderBottom: `1px solid ${paleta.border}`, margin: `0 -${espacios.margenLateral}px`, padding: `0 ${espacios.margenLateral}px` }}>
          {[["todo", t("catalogo.todo")], ["proveedores", t("catalogo.proveedores")]].map(([valor, nombre]) => {
            const on = pestana === valor;
            return (
              <button key={valor} type="button" role="tab" aria-selected={on} onClick={() => onPestana?.(valor)} style={{ flex: 1, minHeight: 44, border: "none", background: "none", padding: 0, fontFamily: "inherit", fontSize: 15, fontWeight: on ? 700 : 500, color: on ? paleta.text : paleta.dim, cursor: "pointer", position: "relative", WebkitTapHighlightColor: "transparent" }}>
                {nombre}
                <span aria-hidden style={{ position: "absolute", left: "18%", right: "18%", bottom: -1, height: 3, borderRadius: 2, background: paleta.accent, transform: on ? "scaleX(1)" : "scaleX(0)", transition: "transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1)" }} />
              </button>
            );
          })}
        </div>
      </div>

      <div onTouchStart={alTocarContenido} onTouchEnd={alSoltarContenido} style={{ flex: 1, overflowY: "auto", overflowX: "hidden", overscrollBehavior: "contain", WebkitOverflowScrolling: "touch", padding: `6px ${espacios.margenLateral}px 110px`, display: "flex", flexDirection: "column", gap: espacios.entreFilas }}>

        {pestana === "todo" && (
          <>
            {/* Arriba de la grilla, una sola fila (decisión de Nati, 22/09: la lógica del feed; pantalla 3 del
                wireframe): la pastilla naranja "Revisar el día · N de hoy" reemplaza al cartel de procesando,
                al botón de vista y a la fila de revisar; favoritos queda como un filtro chico a la derecha. */}
            {seleccion ? (
              <div style={{ display: "flex", gap: 8, alignItems: "center", minHeight: 40 }}>
                {/* 27/09: el texto cede y los botones no se parten (antes salía "Elim inar") */}
                <span style={{ ...texto("pie", { fontWeight: 600 }), flex: 1, minWidth: 0, color: paleta.muted }}>{seleccion.size ? t("catalogo.seleccionados", { count: seleccion.size }) : t("catalogo.tocaParaSeleccionar")}</span>
                <Boton variante="peligro" icono="borrar" deshabilitado={seleccion.size === 0} onClick={() => setConfirmandoBorrado(true)} estilo={{ whiteSpace: "nowrap", flexShrink: 0 }}>{t("catalogo.eliminarSeleccion")}</Boton>
                <Boton variante="secundario" onClick={() => setSeleccion(null)} estilo={{ whiteSpace: "nowrap", flexShrink: 0 }}>{t("catalogo.cancelar")}</Boton>
              </div>
            ) : (
            <div style={{ display: "flex", gap: 8, alignItems: "center", minHeight: 40 }}>
              {/* 27/09 (Nati: "la pastilla naranja molesta, se ve feo"): un enlace tranquilo, sin relleno */}
              {deHoy.length > 0 && onRevisarDia ? (
                <button type="button" onClick={onRevisarDia} style={{ display: "inline-flex", alignItems: "center", gap: 6, minHeight: 40, padding: 0, border: "none", background: "transparent", color: paleta.accentTexto, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", minWidth: 0, ...texto("cuerpo", { fontWeight: 600 }) }}>
                  <Icono nombre="listo" tamano={16} color={paleta.accentTexto} /><b style={{ fontWeight: 600 }}>{t("catalogo.revisarElDia")}</b><span style={{ fontWeight: 400, color: paleta.muted }}> · {t("catalogo.deHoy", { count: deHoy.length })}</span><Icono nombre="siguiente" tamano={14} color={paleta.dim} />
                </button>
              ) : <span style={{ ...texto("pie"), color: paleta.dim }}>{t("catalogo.productos", { count: enFeria.length })}</span>}
              <span style={{ flex: 1 }} />
              {pendientes > 0 && <span role="status" aria-label={enLinea ? t("catalogo.procesandoCorto", { count: pendientes }) : t("catalogo.pendientes", { count: pendientes })} title={enLinea ? t("catalogo.procesandoCorto", { count: pendientes }) : t("catalogo.pendientes", { count: pendientes })} style={{ ...texto("pie"), color: paleta.dim, display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap", flexShrink: 0 }}><span aria-hidden style={{ width: 6, height: 6, borderRadius: 3, background: paleta.accent, display: "inline-block" }} />{pendientes}</span>}
              <button type="button" onClick={() => setFiltro(filtro === "favoritos" ? "todos" : "favoritos")} aria-pressed={filtro === "favoritos"} aria-label={t("catalogo.favoritos")} style={{ width: 36, height: 36, borderRadius: 18, border: `1px solid ${filtro === "favoritos" ? paleta.accent : paleta.border}`, background: filtro === "favoritos" ? paleta.accentSoft : paleta.surface, display: "grid", placeItems: "center", cursor: "pointer", flexShrink: 0 }}>
                <Icono nombre="favorito" tamano={16} color={filtro === "favoritos" ? paleta.accentTexto : paleta.dim} />
              </button>
              {onEliminarVarios && filtrados.length > 0 && (
                <button type="button" onClick={() => setSeleccion(new Set())} aria-label={t("catalogo.seleccionar")} style={{ width: 36, height: 36, borderRadius: 18, border: `1px solid ${paleta.border}`, background: paleta.surface, display: "grid", placeItems: "center", cursor: "pointer", flexShrink: 0 }}>
                  <Icono nombre="listo" tamano={16} color={paleta.dim} />
                </button>
              )}
            </div>
            )}

            {filtrados.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px 16px", display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
                {products.length === 0 ? (
                  <>
                    {/* Idea 2 de Buddy (Nati, 27/09): lo vacío es un botón, no un texto */}
                    {esperandoNube(estadoDatos) || bajando
                      ? <p style={{ ...texto("cuerpo"), color: paleta.muted, margin: 0 }}>{esperandoNube(estadoDatos) ? t(`datos.${estadoDatos.clave}`, estadoDatos) : t("catalogo.bajando")}</p>
                      : (
                        <>
                          <span style={{ width: 84, height: 84, borderRadius: 42, background: paleta.accentSoft, display: "grid", placeItems: "center" }}><Icono nombre="camara" tamano={36} color={paleta.accentTexto} /></span>
                          <Boton variante="principal" ancho="total" icono="camara" onClick={() => onNavigate?.("capture")} estilo={{ maxWidth: 320, minHeight: 56, fontSize: 17 }}>{t("catalogo.primeraFoto")}</Boton>
                          <p style={{ ...texto("pie"), color: paleta.dim, margin: 0 }}>{t("catalogo.primeraFotoPista")}</p>
                        </>
                      )}
                    {/* Regla 2 del protocolo: nunca "no tenés productos" mientras la app todavía no comprobó la nube */}
                    {!bajando && !esperandoNube(estadoDatos) && <Boton variante="principal" icono="camara" onClick={() => onNavigate?.("capture")}>{t("catalogo.vacioAccion")}</Boton>}
                    {/* Sin cuenta y sin productos (24/09, caso Lucas): quien ya tiene cuenta entra y recupera su catálogo */}
                    {!bajando && sinCuenta && onEntrar && (
                      <div style={{ marginTop: 18, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                        <p style={{ ...texto("pie"), color: paleta.muted, margin: 0, textAlign: "center" }}>{t("catalogo.sinCuentaTitulo")}</p>
                        <Boton variante="secundario" onClick={onEntrar}>{t("catalogo.entrar")}</Boton>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <p style={{ ...texto("cuerpo"), color: paleta.muted, margin: 0 }}>{t("catalogo.sinResultados")}</p>
                    {feria !== "todas" && <Boton variante="secundario" onClick={() => setFeria("todas")}>{t("catalogo.verTodasLasFerias")}</Boton>}
                  </>
                )}
              </div>
            )}

            {vista === "grilla" ? (
              <GrillaDeFotos>
                {conEncabezadosDeDia(filtrados).map(it => it.tipo === "dia"
                  ? <div key={it.clave} style={{ gridColumn: "1 / -1", padding: `0 ${espacios.margenLateral}px` }}>{seccion(`${it.etiqueta} · ${it.n}`)}</div>
                  : celda(it.p))}
              </GrillaDeFotos>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: espacios.entreFilas }}>
                {conEncabezadosDeDia(filtrados).map(it => it.tipo === "dia"
                  ? <div key={it.clave}>{seccion(`${it.etiqueta} · ${it.n}`)}</div>
                  : (() => { const p = it.p; const sup = suppliers.find(s => s.id === p.supplierId); const sinNombre = !p.name && !p.ai_processed; return (
                    <Fila key={p.id} onClick={() => abrir(p)}
                      miniatura={miniatura(p)}
                      titulo={sinNombre ? <Esqueleto ancho={140} alto={12} /> : (p.name || t("catalogo.procesandoNombre"))}
                      subtitulo={<>{p.favorito && <Icono nombre="favorito" tamano={12} color={paleta.accentTexto} />} {sup?.company || p.supplierCompany || "—"}</>}
                      derecha={p.price ? <Precio detalle={p.moq ? `MOQ ${p.moq}` : undefined}>USD {p.price}</Precio> : null} />
                  ); })())}
              </div>
            )}
          </>
        )}

        {/* ── PROVEEDORES ── */}
        {pestana === "proveedores" && (
          <>
            {proveedoresBuscados.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px 16px" }}>
                <p style={{ ...texto("cuerpo"), color: paleta.muted, margin: "0 0 4px" }}>{palabras.length ? t("catalogo.sinResultados") : t("catalogo.sinProveedores")}</p>
                {!palabras.length && <p style={{ ...texto("pie"), color: paleta.dim, margin: 0 }}>{t("catalogo.sinProveedoresPista")}</p>}
              </div>
            )}
            {/* 27/09 (C1, Nati: "está bueno que se vea en grilla también la lista de proveedores"): tarjetas de dos columnas,
                con la foto de la tarjeta o del primer producto, el nombre y cuántos productos tiene */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
              {proveedoresBuscados.map(s => {
                const tarjeta = s.cardPhoto || s.cardPhotoUrl || null;
                const primero = !tarjeta ? products.find(p => p.supplierId === s.id) : null;
                const n = productosPorProveedor.get(s.id) || 0;
                return (
                  <button key={s.id} type="button" onClick={() => onNavigate?.("supplier", s, proveedoresBuscados)} aria-label={s.company || `#${s.id}`}
                    style={{ textAlign: "left", padding: 0, border: `1px solid ${paleta.border}`, borderRadius: radios.grande, background: paleta.card, overflow: "hidden", cursor: "pointer", fontFamily: "inherit", color: paleta.text, boxShadow: paleta.sombraTarjeta, display: "flex", flexDirection: "column" }}>
                    <span style={{ display: "block", aspectRatio: "1.45", background: paleta.surface, position: "relative" }}>
                      {tarjeta ? (Foto ? <Foto src={tarjeta} respaldo={s.cardPhotoUrl || null} t={tLegacy} estilo={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : <img src={tarjeta} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />)
                        : primero ? <span style={{ display: "block", width: "100%", height: "100%" }}>{miniatura(primero)}</span>
                        : <span style={{ display: "grid", placeItems: "center", width: "100%", height: "100%" }}><Iniciales texto={s.company} /></span>}
                      {s.favorito ? <span style={{ position: "absolute", top: 8, right: 8, width: 24, height: 24, borderRadius: 12, background: paleta.accent, display: "grid", placeItems: "center" }}><Icono nombre="favorito" tamano={13} color="#fff" /></span> : null}
                    </span>
                    <span style={{ display: "flex", flexDirection: "column", gap: 2, padding: "8px 10px 10px" }}>
                      <span style={{ ...texto("cuerpo", { fontWeight: 600 }), display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.company || `#${s.id}`}</span>
                      <span style={{ ...texto("pie"), color: paleta.muted, display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{[s.boothNumber ? `${t("proveedor.stand")} ${s.boothNumber}` : null, t("catalogo.productos", { count: n })].filter(Boolean).join(" · ")}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Capturar, siempre a mano */}
      <div style={{ position: "fixed", right: espacios.margenLateral, bottom: "calc(20px + env(safe-area-inset-bottom, 0px))", zIndex: 10 }}>
        <Boton variante="principal" icono="camara" onClick={() => onNavigate?.("capture")} estilo={{ borderRadius: 999, paddingInline: 20, boxShadow: "0 10px 30px -10px rgba(234,90,34,0.6)" }}>{t("catalogo.capturar")}</Boton>
      </div>

      {/* Elegir feria */}
      <Hoja abierta={feriaAbierta} onCerrar={() => setFeriaAbierta(false)} titulo={t("catalogo.ferias")}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Fila onClick={() => { setFeria("todas"); setFeriaAbierta(false); }} seleccionada={feria === "todas"} titulo={t("catalogo.todasLasFerias")} subtitulo={t("catalogo.productos", { count: products.length })} />
          {[...districts].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).map(d => (
            <Fila key={d.id} onClick={() => { onSwitchDistrict?.(d.id); setFeria("activa"); setFeriaAbierta(false); }} seleccionada={feria === "activa" && d.id === activeDistrictId}
              miniatura={<Icono nombre="feria" tamano={22} color={paleta.muted} />} titulo={d.name} subtitulo={`${d.location ? d.location + " · " : ""}${t("catalogo.productos", { count: products.filter(p => p.districtId === d.id).length })}`} />
          ))}
          <Boton variante="secundario" ancho="total" onClick={() => { setFeriaAbierta(false); onNavigate?.("districts"); }}>{t("catalogo.ferias")} ›</Boton>
        </div>
      </Hoja>

      {/* Confirmar el borrado de varios: se puede deshacer unos segundos desde el aviso */}
      <Hoja abierta={confirmandoBorrado} onCerrar={() => setConfirmandoBorrado(false)} titulo={t("catalogo.eliminarVariosSeguro", { count: seleccion?.size || 0 })}>
        <p style={{ ...texto("cuerpo", { fontWeight: 400 }), color: paleta.muted, margin: "0 0 14px" }}>{t("catalogo.eliminarVariosTexto")}</p>
        <div style={{ display: "flex", gap: 8 }}>
          <Boton variante="secundario" ancho="total" onClick={() => setConfirmandoBorrado(false)} estilo={{ flex: 1 }}>{t("catalogo.cancelar")}</Boton>
          <Boton variante="peligro" ancho="total" icono="borrar" onClick={borrarSeleccion} estilo={{ flex: 1 }}>{t("catalogo.eliminarSeleccion")}</Boton>
        </div>
      </Hoja>
    </div>
  );
}
