/**
 * El catálogo (propuesta-experiencia.md §3 y decisiones 3–7 del 16/09):
 *   · Hoy: el resumen del día y el botón "Revisar el día"; sin feria, un favorito viejo al azar.
 *   · Todo: grilla 4:3 por defecto (o lista), chips de filtro, búsqueda que encuentra productos y proveedores.
 *   · Proveedores: la lista, con favorito y cantidad de productos.
 * Sin cantidades ni pedido: eso vive en "Armar pedido" (decisión 4).
 *
 * Capa visible. La lógica de datos (borrar, favorito, navegar) llega por props desde App.
 */
import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSistema } from "../sistema/SistemaProvider.jsx";
import { Boton, Chip, FilaDeChips, Segmentado, Fila, Precio, Icono, Esqueleto, Hoja, GrillaDeFotos, CeldaDeFoto, CarruselDeFotos } from "../componentes/index.js";
import { palabrasDeBusqueda, coincideBusqueda } from "../lib/busqueda.js";
import { soloDeHoy, resumenDelDia, conEncabezadosDeDia } from "../lib/porDia.js";
import { elegirMiniatura, respaldoDe } from "../lib/miniaturas.js";
import { estadoIA } from "../lib/aiEstado.js";
import { haceCuanto } from "../idiomas/formato.js";

function Iniciales({ texto }) {
  const { paleta } = useSistema();
  const ini = (texto || "?").split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase();
  return <span style={{ fontWeight: 700, fontSize: 14, color: paleta.accentTexto }}>{ini}</span>;
}

export function Catalogo({
  products = [], suppliers = [], districts = [], activeDistrictId, activeDistrict, bajando = null, queueCount = 0, enLinea = true,
  Foto, t: tLegacy,
  onNavigate, onSwitchDistrict, onToggleFavorito, onToggleFavoritoProveedor, onRevisarDia,
  pestana = "todo", onPestana,
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

  const proveedoresBuscados = useMemo(() => {
    const base = feria === "todas" ? suppliers : suppliers.filter(s => s.districtId === activeDistrictId);
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

  const abrir = (p) => onNavigate?.("detail", p);
  const nombreFeria = feria === "todas" ? t("catalogo.todasLasFerias") : (activeDistrict?.name || "");

  // Función, no componente: un componente definido adentro del render es un tipo nuevo cada vez y React
  // desmonta y vuelve a montar la imagen (Nati, 16/09: "las fotos titilan").
  const miniatura = (p, estilo) => {
    const src = elegirMiniatura(p) || respaldoDe(p); // copia local, o la dirección de la nube (17/09)
    if (!src) return <div style={{ width: "100%", height: "100%", background: paleta.surface, display: "grid", placeItems: "center", ...estilo }}><Icono nombre="foto" tamano={20} color={paleta.dim} /></div>;
    return Foto ? <Foto src={src} respaldo={respaldoDe(p)} t={tLegacy} estilo={{ width: "100%", height: "100%", objectFit: "cover", display: "block", ...estilo }} /> : <img src={src || respaldoDe(p)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", ...estilo }} />;
  };

  const celda = (p) => (
    <CeldaDeFoto key={p.id} onClick={() => abrir(p)} etiqueta={p.name || t("catalogo.procesandoNombre")} favorito={!!p.favorito} fotos={p.photos?.length || 0}
      insignia={estadoIA(p) === "fallo" ? <span style={{ width: 22, height: 22, borderRadius: 6, background: "rgba(220,38,38,0.85)", display: "grid", placeItems: "center" }}><Icono nombre="error" tamano={13} color="#fff" /></span> : (!p.name && !p.ai_processed) ? <Esqueleto ancho={22} alto={22} radio={6} estilo={{ background: "rgba(241,245,249,0.7)" }} /> : null}>
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
      {/* Barra superior: título · feria · buscar · ajustes */}
      <div style={{ padding: `calc(env(safe-area-inset-top, 0px) + 8px) ${espacios.margenLateral}px 6px`, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minHeight: alturas.tocable }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ ...texto("titulo"), margin: 0 }}>{t("catalogo.titulo")}</h1>
            <button type="button" onClick={() => setFeriaAbierta(true)} style={{ ...texto("pie"), color: paleta.accentTexto, background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 4, minHeight: 24 }}>{nombreFeria} <Icono nombre="siguiente" tamano={14} color={paleta.accentTexto} /></button>
          </div>
          <button type="button" onClick={() => { setBuscando(v => !v); if (buscando) setConsulta(""); }} aria-label={t("comun.buscar")} aria-pressed={buscando} style={{ width: alturas.icono, height: alturas.icono, borderRadius: radios.medio, border: `1px solid ${buscando ? paleta.accent : paleta.border}`, background: buscando ? paleta.accentSoft : paleta.card, display: "grid", placeItems: "center", cursor: "pointer", boxShadow: paleta.sombraTarjeta }}><Icono nombre="buscar" tamano={20} color={buscando ? paleta.accentTexto : paleta.muted} /></button>
          <button type="button" onClick={() => onNavigate?.("pedidos")} aria-label={t("catalogo.pedidos")} style={{ width: alturas.icono, height: alturas.icono, borderRadius: radios.medio, border: `1px solid ${paleta.border}`, background: paleta.card, display: "grid", placeItems: "center", cursor: "pointer", boxShadow: paleta.sombraTarjeta }}><Icono nombre="pedido" tamano={20} color={paleta.muted} /></button>
          <button type="button" onClick={() => onNavigate?.("settings")} aria-label={t("catalogo.ajustes")} style={{ width: alturas.icono, height: alturas.icono, borderRadius: radios.medio, border: `1px solid ${paleta.border}`, background: paleta.card, display: "grid", placeItems: "center", cursor: "pointer", boxShadow: paleta.sombraTarjeta }}><Icono nombre="ajustes" tamano={20} color={paleta.muted} /></button>
        </div>
        {buscando && (
          <input autoFocus value={consulta} onChange={e => setConsulta(e.target.value)} placeholder={t("catalogo.buscar")} aria-label={t("catalogo.buscar")}
            style={{ ...texto("cuerpo", { fontWeight: 400 }), minHeight: alturas.campo, borderRadius: radios.medio, border: `1px solid ${paleta.border}`, background: paleta.surface, color: paleta.text, padding: "0 14px", fontFamily: "inherit", outline: "none", width: "100%" }} />
        )}
        <Segmentado etiqueta={t("catalogo.titulo")} valor={pestana} onChange={onPestana} opciones={[{ valor: "hoy", texto: t("catalogo.hoy") }, { valor: "todo", texto: t("catalogo.todo") }, { valor: "proveedores", texto: t("catalogo.proveedores") }]} />
      </div>

      <div style={{ flex: 1, overflowY: "auto", overscrollBehavior: "contain", WebkitOverflowScrolling: "touch", padding: `6px ${espacios.margenLateral}px 110px`, display: "flex", flexDirection: "column", gap: espacios.entreFilas }}>

        {/* ── HOY ── */}
        {pestana === "hoy" && (
          <>
            {deHoy.length > 0 ? (
              <>
                <div style={{ background: paleta.card, border: `1px solid ${paleta.border}`, borderRadius: radios.grande, boxShadow: paleta.sombraTarjeta, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 2 }}>
                  <b style={{ ...texto("destacado") }}>{t("catalogo.resumenHoy", { productos: t("catalogo.productos", { count: resumen.productos }), proveedores: t("cantidades.proveedores", { count: resumen.proveedores }) })}</b>
                  <span style={{ ...texto("pie"), color: paleta.dim }}>{nombreFeria}</span>
                </div>
                {hayQueRevisar
                  ? <Boton variante="principal" ancho="total" onClick={onRevisarDia}>{t("catalogo.revisarElDia")} · {t("catalogo.revisarMinutos", { count: Math.max(1, Math.ceil((resumen.sinPrecio + deHoy.filter(p => !p.supplierId).length + 2) / 3)) })}</Boton>
                  : <Boton variante="secundario" ancho="total" icono="listo" deshabilitado>{t("catalogo.todoRevisado")}</Boton>}
                {/* El feed del día (Nati, 16/09: "todos quieren ver su feed del día"): las fotos, sin tocar nada */}
                {deHoy.map(p => publicacion(p))}
              </>
            ) : (
              <>
                <div style={{ ...texto("pie"), color: paleta.dim, textAlign: "center", padding: "6px 0" }}>{t("catalogo.sinCapturasHoy")}</div>
                {redescubierto && (() => {
                  const sup = suppliers.find(s => s.id === redescubierto.supplierId);
                  const dist = districts.find(d => d.id === redescubierto.districtId);
                  return (
                    <div style={{ background: paleta.card, border: `1px solid ${paleta.border}`, borderRadius: radios.grande, boxShadow: paleta.sombraTarjeta, overflow: "hidden" }}>
                      <div style={{ padding: "10px 14px 0", ...texto("pie"), color: paleta.dim }}>{t("catalogo.deHace", { feria: dist?.name || "—", tiempo: haceCuanto(redescubierto.createdAt).replace(/^hace /, "") })}</div>
                      <button type="button" onClick={() => abrir(redescubierto)} style={{ display: "block", width: "100%", aspectRatio: "4/3", border: "none", padding: 0, margin: "8px 0 0", background: paleta.surface, cursor: "pointer" }}>{miniatura(redescubierto)}</button>
                      <div style={{ padding: "10px 14px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
                        <p style={{ ...texto("cuerpo", { fontWeight: 600 }), margin: 0 }}>{redescubierto.name}</p>
                        <p style={{ ...texto("pie"), color: paleta.muted, margin: 0 }}><Icono nombre="favorito" tamano={13} color={paleta.accentTexto} /> {sup?.company || redescubierto.supplierCompany || "—"}{redescubierto.price ? ` · USD ${redescubierto.price}` : ""} · {t("catalogo.nuncaLoPediste")}</p>
                        <div style={{ display: "flex", gap: 8 }}>
                          {sup && <Boton variante="secundario" onClick={() => onNavigate?.("supplier", sup)} estilo={{ flex: 1 }}>{t("catalogo.verProveedor")}</Boton>}
                          <Boton variante="secundario" onClick={() => setSemilla(s => s + 1)} estilo={{ flex: 1 }}>{t("catalogo.otro")}</Boton>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </>
            )}
          </>
        )}

        {/* ── TODO ── */}
        {pestana === "todo" && (
          <>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <FilaDeChips estilo={{ flex: 1 }}>
                <Chip activo={filtro === "todos"} onClick={() => setFiltro("todos")}>{t("catalogo.todo")}</Chip>
                <Chip activo={filtro === "favoritos"} onClick={() => setFiltro(filtro === "favoritos" ? "todos" : "favoritos")}><Icono nombre="favorito" tamano={14} color={filtro === "favoritos" ? paleta.accentTexto : paleta.dim} />{t("catalogo.favoritos")}</Chip>
                <Chip activo={filtro === "sinPrecio"} onClick={() => setFiltro(filtro === "sinPrecio" ? "todos" : "sinPrecio")}>{t("catalogo.sinPrecio")}</Chip>
                {categorias.map(c => <Chip key={c} activo={filtro === `cat:${c}`} onClick={() => setFiltro(filtro === `cat:${c}` ? "todos" : `cat:${c}`)}>{c}</Chip>)}
              </FilaDeChips>
              <button type="button" onClick={() => setVista(v => (v === "grilla" ? "lista" : "grilla"))} aria-label={vista === "grilla" ? t("catalogo.lista") : t("catalogo.grilla")} style={{ width: alturas.chip, height: alturas.chip, borderRadius: radios.pildora, border: `1px solid ${paleta.border}`, background: paleta.surface, display: "grid", placeItems: "center", cursor: "pointer", flexShrink: 0 }}>
                <Icono nombre={vista === "grilla" ? "opciones" : "foto"} tamano={18} color={paleta.dim} />
              </button>
            </div>

            {pendientes > 0 && (
              <div role="status" style={{ display: "inline-flex", alignItems: "center", gap: 8, alignSelf: "flex-start", background: paleta.card, border: `1px solid ${paleta.border}`, borderRadius: radios.pildora, padding: "6px 12px", ...texto("pie"), color: paleta.muted }}>
                <span aria-hidden style={{ width: 8, height: 8, borderRadius: 4, background: paleta.accent, display: "inline-block" }} />
                {enLinea ? t("catalogo.procesando", { count: pendientes }) : t("catalogo.pendientes", { count: pendientes })}
              </div>
            )}

            {filtrados.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px 16px", display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
                {products.length === 0 ? (
                  <>
                    <p style={{ ...texto("cuerpo"), color: paleta.muted, margin: 0 }}>{bajando ? t("catalogo.bajando") : t("catalogo.vacioTitulo")}</p>
                    {!bajando && <Boton variante="principal" icono="camara" onClick={() => onNavigate?.("capture")}>{t("catalogo.vacioAccion")}</Boton>}
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
            {proveedoresBuscados.map(s => (
              <Fila key={s.id} onClick={() => onNavigate?.("supplier", s)} flecha
                miniatura={(s.cardPhoto || s.cardPhotoUrl) ? (Foto ? <Foto src={s.cardPhoto || s.cardPhotoUrl} respaldo={s.cardPhotoUrl || null} t={tLegacy} estilo={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <img src={s.cardPhoto || s.cardPhotoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />) : <Iniciales texto={s.company} />}
                titulo={<>{s.favorito ? <><Icono nombre="favorito" tamano={13} color={paleta.accentTexto} /> </> : null}{s.company || `#${s.id}`}</>}
                subtitulo={`${s.contact ? s.contact + " · " : ""}${t("catalogo.productos", { count: productosPorProveedor.get(s.id) || 0 })}`} />
            ))}
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
    </div>
  );
}
