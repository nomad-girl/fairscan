/**
 * Revisar el día como feed (decisión 3 de Nati, 22/09: "un feed con filtros, no un menú de jueguitos").
 * Las fotos de hoy, una por pantalla, a pantalla entera. Deslizar arriba pasa a la siguiente; en cada una
 * se hace lo que falta desde el rail: favorito, precio (teclado en una hoja), proveedor (chips en una
 * hoja), eliminar. Los jueguitos de antes (repetidos, sin precio, sin proveedor, favoritos) son filtros
 * arriba, no pantallas. La pastilla roja dice qué le falta a la foto. Al final: "Día revisado".
 *
 * Reglas que siguen: saltar es deslizar, nada queda como deuda; eliminar siempre a mano.
 */
import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSistema } from "../sistema/SistemaProvider.jsx";
import { Boton, Chip, FilaDeChips, Icono, Hoja, PaginadorVertical } from "../componentes/index.js";
import { elegirMiniatura, respaldoDe } from "../lib/miniaturas.js";
import { fechaCorta } from "../idiomas/formato.js";
import { paresRepetidos } from "../lib/repetidos.js";

function horaDe(ts) { const d = new Date(ts || 0); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; }
const sinPrecio = (p) => !p.price || isNaN(parseFloat(p.price));

export function RevisarDia({ productosDeHoy = [], suppliers = [], feria = null, esAnonima = false, pendientesSync = 0, Foto, t: tLegacy, onActualizarProducto, onJuntar, onEliminar, onCerrar, onCrearCuenta, onVerLosDeHoy }) {
  const { t } = useTranslation();
  const { paleta, radios, texto } = useSistema();

  const [filtro, setFiltro] = useState("todos"); // todos · precio · proveedor · repetidos · favoritos
  const [i, setI] = useState(0);
  const [hoja, setHoja] = useState(null); // null · "precio" · "proveedor"
  const [valor, setValor] = useState("");
  const [borrados, setBorrados] = useState(() => new Set());
  const [favs, setFavs] = useState(() => new Set(productosDeHoy.filter(p => p.favorito).map(p => p.id)));
  const [precios, setPrecios] = useState({});     // lo cargado en esta sesión, para que la pantalla lo muestre al toque
  const [provs, setProvs] = useState({});

  const deHoy = useMemo(() => productosDeHoy.filter(p => !borrados.has(p.id)).map(p => ({ ...p, price: precios[p.id] ?? p.price, supplierId: provs[p.id]?.id ?? p.supplierId, supplierCompany: provs[p.id]?.company ?? p.supplierCompany, favorito: favs.has(p.id) ? 1 : 0 })), [productosDeHoy, borrados, precios, provs, favs]);
  const pares = useMemo(() => paresRepetidos(deHoy), [deHoy]);
  const faltaPrecio = useMemo(() => deHoy.filter(sinPrecio), [deHoy]);
  const faltaProveedor = useMemo(() => deHoy.filter(p => !p.supplierId), [deHoy]);
  const favoritos = useMemo(() => deHoy.filter(p => favs.has(p.id)), [deHoy, favs]);
  const parDe = (p) => pares.find(par => par.a.id === p.id || par.b.id === p.id);

  // La lista que se recorre según el filtro
  const lista = useMemo(() => {
    if (filtro === "precio") return faltaPrecio;
    if (filtro === "proveedor") return faltaProveedor;
    if (filtro === "repetidos") return pares.map(par => par.a);
    if (filtro === "favoritos") return favoritos;
    return deHoy;
  }, [filtro, deHoy, faltaPrecio, faltaProveedor, pares, favoritos]);
  const total = lista.length;
  const actual = lista[Math.min(i, Math.max(0, total - 1))] || null;
  const enCierre = i >= total; // la última pantalla: el día revisado
  const prev = i > 0 ? lista[i - 1] : null;
  const next = i + 1 < total ? lista[i + 1] : null;

  const cambiarFiltro = (f) => { setFiltro(f); setI(0); };


  const proveedoresDeHoy = useMemo(() => {
    const ids = new Set(deHoy.map(p => p.supplierId).filter(Boolean));
    const recientes = suppliers.filter(s => ids.has(s.id));
    const otros = suppliers.filter(s => !ids.has(s.id)).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 6);
    return [...recientes, ...otros];
  }, [deHoy, suppliers]);
  const nombreProveedor = (p) => suppliers.find(s => s.id === p.supplierId)?.company || p.supplierCompany || null;

  // Acciones del rail
  const original = (p) => productosDeHoy.find(x => x.id === p.id) || p;
  const alternarFav = (p) => { const n = new Set(favs); const on = !n.has(p.id); if (on) n.add(p.id); else n.delete(p.id); setFavs(n); onActualizarProducto?.(p.id, { favorito: on ? 1 : 0 }); };
  const eliminar = (p) => { onEliminar?.(original(p)); setBorrados(prevB => new Set([...prevB, p.id])); if (i >= lista.length - 1 && i > 0) setI(i - 1); };
  const teclas = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ",", "0", "⌫"];
  const tocar = k => setValor(v => k === "⌫" ? v.slice(0, -1) : k === "," ? (v.includes(".") ? v : (v || "0") + ".") : v.replace(".", "").length < 7 ? v + k : v);
  const confirmarPrecio = () => { if (valor && actual) { const precio = valor.replace(/\.$/, ""); onActualizarProducto?.(actual.id, { price: precio }); setPrecios(prevP => ({ ...prevP, [actual.id]: precio })); } setHoja(null); setValor(""); };
  const elegirProveedor = (s) => { if (actual) { onActualizarProducto?.(actual.id, { supplierId: s.id, supplierCompany: s.company }); setProvs(prevS => ({ ...prevS, [actual.id]: { id: s.id, company: s.company } })); } setHoja(null); };
  // Juntar recibe los productos originales (los de la lista de hoy son copias con lo cargado en la sesión)
  const juntarEstos = (par) => { onJuntar?.(original(par.a), original(par.b)); setBorrados(prevB => new Set([...prevB, par.b.id])); };

  const foto = (p, estilo) => {
    const src = elegirMiniatura(p) || respaldoDe(p);
    if (!src) return <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center" }}><Icono nombre="foto" tamano={40} color="rgba(255,255,255,0.6)" /></div>;
    return Foto ? <Foto src={p.photos?.[0] || src} respaldo={respaldoDe(p)} t={tLegacy} estilo={{ width: "100%", height: "100%", objectFit: "cover", display: "block", ...estilo }} /> : <img src={p.photos?.[0] || src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", ...estilo }} />;
  };
  const redondo = (nombre, etiqueta, onClick, { activo = false, presionado, texto: rotulo } = {}) => (
    <button type="button" onClick={onClick} aria-label={etiqueta} aria-pressed={presionado} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "none", border: "none", padding: 0, cursor: "pointer", color: "#fff", width: 56, fontFamily: "inherit" }}>
      <span style={{ width: 48, height: 48, borderRadius: 24, background: activo ? paleta.accent : "rgba(10,14,23,0.55)", display: "grid", placeItems: "center", backdropFilter: "blur(6px)" }}><Icono nombre={nombre} tamano={22} color="#fff" /></span>
      {rotulo && <span style={{ fontSize: 11, fontWeight: 600, textShadow: "0 1px 2px rgba(0,0,0,0.6)" }}>{rotulo}</span>}
    </button>
  );

  const proveedoresHoy = new Set(deHoy.map(p => p.supplierId).filter(Boolean)).size;

  // Una pantalla del feed
  const pantalla = (p, esta) => {
    const par = filtro === "repetidos" ? parDe(p) : null;
    const otro = par ? (par.a.id === p.id ? par.b : par.a) : null;
    const prov = nombreProveedor(p);
    const faltas = [sinPrecio(p) && t("revisar.sinPrecio"), !p.supplierId && t("revisar.sinProveedor")].filter(Boolean);
    return (
      <div key={p.id} style={{ height: "100%", flexShrink: 0, scrollSnapAlign: "start", position: "relative", background: "#0B0E17" }}>
        <div style={{ position: "absolute", inset: 0 }}>{foto(p)}</div>
        {esta && faltas.length > 0 && (
          <span style={{ position: "absolute", top: `calc(env(safe-area-inset-top, 0px) + 66px)`, right: 14, background: "rgba(220,38,38,0.9)", color: "#fff", borderRadius: 999, padding: "5px 11px", fontSize: 12, fontWeight: 700 }}>{faltas.join(" · ")}</span>
        )}
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: `80px 84px calc(18px + env(safe-area-inset-bottom, 0px)) 18px`, background: "linear-gradient(to top, rgba(10,14,23,0.9) 60%, rgba(10,14,23,0))", color: "#fff", display: "flex", flexDirection: "column", gap: 4 }}>
          <p style={{ margin: 0, fontSize: 24, fontWeight: 700, lineHeight: 1.15, overflowWrap: "anywhere" }}>{p.name || t("pedido.sinNombre")}</p>
          <p style={{ margin: 0, fontSize: 17, fontWeight: 600, color: sinPrecio(p) ? "#FCD34D" : "#fff" }}>{sinPrecio(p) ? t("revisar.tocaParaPrecio") : `USD ${p.price}`}</p>
          <p style={{ margin: 0, fontSize: 14, color: "rgba(255,255,255,0.8)" }}>{prov || t("revisar.sinProveedor")} · {horaDe(p.createdAt)}</p>
          {otro && esta && (
            <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 56, height: 56, borderRadius: 10, overflow: "hidden", flexShrink: 0, border: "1px solid rgba(255,255,255,0.4)" }}>{foto(otro)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.8)" }}>{t("revisar.sonElMismo")} {t("revisar.parecidoA").toLowerCase()}:</p>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{otro.name || t("pedido.sinNombre")} · {horaDe(otro.createdAt)}</p>
              </div>
              <button type="button" onClick={() => juntarEstos(par)} style={{ minHeight: 40, borderRadius: 999, border: "none", background: paleta.accent, color: "#fff", fontFamily: "inherit", fontSize: 13, fontWeight: 700, padding: "0 12px", cursor: "pointer", flexShrink: 0 }}>{t("revisar.juntar")}</button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const cierre = (
    <div key="cierre" style={{ height: "100%", flexShrink: 0, scrollSnapAlign: "start", position: "relative", background: "#0B0E17", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 24px", textAlign: "center", gap: 8 }}>
      <Icono nombre="listo" tamano={44} color="#86EFAC" />
      <span style={{ fontSize: 32, fontWeight: 700 }}>{t("revisar.diaCerrado")}</span>
      <span style={{ fontSize: 15, color: "rgba(255,255,255,0.75)" }}>{feria ? `${feria} · ${fechaCorta(Date.now())}` : fechaCorta(Date.now())}</span>
      <span style={{ fontSize: 16 }}>{t("revisar.resumenCierre", { productos: t("catalogo.productos", { count: deHoy.length }), proveedores: t("cantidades.proveedores", { count: proveedoresHoy }) })}</span>
      <span style={{ fontSize: 14, color: "rgba(255,255,255,0.75)" }}>{t("revisar.favoritosCierre", { count: favs.size })}{faltaPrecio.length > 0 ? ` · ${t("revisar.quedaronSinPrecio", { count: faltaPrecio.length })}` : ""}</span>
      <span style={{ fontSize: 14, color: pendientesSync > 0 ? "rgba(255,255,255,0.75)" : "#86EFAC" }}>{pendientesSync > 0 ? t("revisar.pendientesSync", { count: pendientesSync }) : t("revisar.todoSincronizado")}</span>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%", maxWidth: 360, marginTop: 18 }}>
        {esAnonima && (
          <>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{t("revisar.tusProductosEnEsteTelefono", { count: deHoy.length })}</p>
            <p style={{ margin: "0 0 6px", fontSize: 13, color: "rgba(255,255,255,0.75)" }}>{t("revisar.creaCuenta")}</p>
            <Boton variante="principal" ancho="total" onClick={onCrearCuenta}>{t("revisar.crearCuenta")}</Boton>
          </>
        )}
        <Boton variante={esAnonima ? "secundario" : "principal"} ancho="total" onClick={onCerrar}>{t("revisar.volverAlCatalogo")}</Boton>
        {onVerLosDeHoy && <Boton variante="fantasma" ancho="total" onClick={onVerLosDeHoy} estilo={{ color: "#fff" }}>{t("revisar.verLosDeHoy", { count: deHoy.length })}</Boton>}
      </div>
    </div>
  );

  const filtros = [
    ["todos", t("revisar.filtroTodos"), deHoy.length],
    ["precio", t("revisar.juegoPrecio"), faltaPrecio.length],
    ["proveedor", t("revisar.juegoProveedor"), faltaProveedor.length],
    ["repetidos", t("revisar.juegoRepetidos"), pares.length],
    ["favoritos", t("revisar.juegoFavoritos"), favoritos.length],
  ];

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000", color: "#fff", fontFamily: "inherit", zIndex: 50 }}>
      {total === 0 ? <div style={{ position: "absolute", inset: 0 }}>{cierre}</div> : (
        <PaginadorVertical clave={`${filtro}-${i}`}
          anterior={prev ? pantalla(prev, false) : null}
          actual={enCierre ? cierre : pantalla(actual, true)}
          siguiente={enCierre ? null : (next ? pantalla(next, false) : cierre)}
          onAnterior={() => i > 0 && setI(i - 1)} onSiguiente={() => !enCierre && setI(i + 1)} />
      )}

      {/* Arriba: salir, el progreso, y los filtros (los jueguitos de antes) */}
      <div style={{ position: "absolute", top: `calc(env(safe-area-inset-top, 0px) + 12px)`, left: 0, right: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 14px" }}>
          <button type="button" onClick={onCerrar} aria-label={t("comun.cerrar")} style={{ width: 48, height: 48, borderRadius: 24, border: "none", background: "rgba(10,14,23,0.55)", display: "grid", placeItems: "center", cursor: "pointer", backdropFilter: "blur(6px)" }}><Icono nombre="cerrar" tamano={22} color="#fff" /></button>
          <span style={{ background: paleta.accent, color: "#fff", borderRadius: 999, padding: "8px 14px", fontSize: 13, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{t("revisar.titulo")}{total > 0 && !enCierre ? ` · ${t("revisar.posicion", { n: Math.min(i + 1, total), total })}` : ""}</span>
          <span style={{ width: 48 }} />
        </div>
        <FilaDeChips estilo={{ padding: "0 14px" }}>
          {filtros.map(([k, nombre, n]) => <Chip key={k} activo={filtro === k} onClick={() => cambiarFiltro(k)} estilo={filtro === k ? undefined : { background: "rgba(10,14,23,0.55)", color: "#fff", borderColor: "transparent" }}>{nombre}{n ? ` · ${n}` : ""}</Chip>)}
        </FilaDeChips>
      </div>

      {/* A la derecha: lo que falta se hace acá */}
      {actual && !enCierre && (
        <div style={{ position: "absolute", right: 10, bottom: `calc(160px + env(safe-area-inset-bottom, 0px))`, display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
          {redondo("favorito", favs.has(actual.id) ? t("ficha.quitarFavorito") : t("ficha.marcarFavorito"), () => alternarFav(actual), { activo: favs.has(actual.id), presionado: favs.has(actual.id), texto: t("revisar.favorito") })}
          {redondo("editar", t("revisar.ponerPrecio"), () => { setValor(""); setHoja("precio"); }, { activo: sinPrecio(actual), texto: "$" })}
          {redondo("proveedor", t("revisar.elegirProveedor"), () => setHoja("proveedor"), { activo: !actual.supplierId, texto: t("proveedor.titulo") })}
          {redondo("borrar", `${t("revisar.eliminar")} ${actual.name || ""}`.trim(), () => eliminar(actual), { texto: t("comun.borrar") })}
        </div>
      )}

      {/* ¿A cuánto estaba? */}
      <Hoja abierta={hoja === "precio"} onCerrar={() => setHoja(null)} titulo={t("revisar.aCuantoEstaba")}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "0 4px" }}><span style={{ ...texto("pie"), color: paleta.dim }}>USD</span><b style={{ ...texto("grande"), color: valor ? paleta.green : paleta.dim, fontVariantNumeric: "tabular-nums" }}>{valor || "0"}</b></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
            {teclas.map(k => <button key={k} type="button" onClick={() => tocar(k)} aria-label={k === "⌫" ? t("comun.borrar") : k} style={{ minHeight: 44, borderRadius: radios.chico, border: `1px solid ${paleta.border}`, background: paleta.card, color: paleta.text, fontSize: 18, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{k}</button>)}
          </div>
          <Boton variante="principal" ancho="total" onClick={confirmarPrecio} deshabilitado={!valor}>{t("revisar.listo")}</Boton>
        </div>
      </Hoja>

      {/* ¿De qué proveedor era? */}
      <Hoja abierta={hoja === "proveedor"} onCerrar={() => setHoja(null)} titulo={t("revisar.deQueProveedor")}>
        {actual && <p style={{ ...texto("pie"), color: paleta.dim, margin: "0 0 10px" }}>{t("revisar.estabaEnEseStand", { hora: horaDe(actual.createdAt) })}</p>}
        <FilaDeChips estilo={{ flexWrap: "wrap", overflow: "visible" }}>
          {proveedoresDeHoy.map(s => <Chip key={s.id} onClick={() => elegirProveedor(s)}>{s.company || `#${s.id}`}</Chip>)}
        </FilaDeChips>
      </Hoja>
    </div>
  );
}
