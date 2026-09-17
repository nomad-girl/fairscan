/**
 * Revisar el día (decisión 3 del 16/09, idea de Nati; ajustado esa misma noche al probarlo):
 * un menú de "jueguitos" y se elige cuál jugar: repetidos probables, falta el precio, falta el
 * proveedor, mis favoritos. Cada uno es una ronda corta de a una tarjeta; al terminar se vuelve
 * al menú con los números actualizados. "Cerrar el día" es el último paso, y nunca es obligatorio.
 *
 * Reglas: ignorar una tarjeta es tan fácil como responderla ("Saltar" pesa igual que "Listo");
 * deslizar pasa a la siguiente; lo salteado no queda como deuda; y eliminar el producto está
 * siempre a mano (Nati: "que deje eliminar producto en todo momento con facilidad").
 */
import React, { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSistema } from "../sistema/SistemaProvider.jsx";
import { Boton, Chip, FilaDeChips, Fila, Icono } from "../componentes/index.js";
import { elegirMiniatura, respaldoDe } from "../lib/miniaturas.js";
import { fechaCorta } from "../idiomas/formato.js";
import { paresRepetidos } from "../lib/repetidos.js";

function horaDe(ts) { const d = new Date(ts || 0); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; }
const sinPrecio = (p) => !p.price || isNaN(parseFloat(p.price));

export function RevisarDia({ productosDeHoy = [], suppliers = [], feria = null, esAnonima = false, pendientesSync = 0, Foto, t: tLegacy, onActualizarProducto, onJuntar, onEliminar, onCerrar, onCrearCuenta, onVerLosDeHoy }) {
  const { t } = useTranslation();
  const { paleta, alturas, radios, texto, espacios } = useSistema();

  const [juego, setJuego] = useState(null); // null = menú · repetidos · precio · proveedor · favoritos · cierre
  const [ronda, setRonda] = useState(0);
  const [i, setI] = useState(0);
  const [valor, setValor] = useState("");
  const [borrados, setBorrados] = useState(() => new Set()); // eliminados o juntados en otro
  const [favs, setFavs] = useState(() => new Set(productosDeHoy.filter(p => p.favorito).map(p => p.id)));
  const inicio = useRef(null);

  const deHoy = useMemo(() => productosDeHoy.filter(p => !borrados.has(p.id)), [productosDeHoy, borrados]);
  const pares = useMemo(() => paresRepetidos(deHoy), [deHoy]);
  const faltaPrecio = useMemo(() => deHoy.filter(sinPrecio), [deHoy]);
  const faltaProveedor = useMemo(() => deHoy.filter(p => !p.supplierId), [deHoy]);

  // Las tarjetas de una ronda se arman al elegir el juego; lo que se resuelva o saltee no vuelve hasta la próxima ronda.
  const tarjetas = useMemo(() => {
    if (juego === "repetidos") return pares.map(par => ({ tipo: "repetidos", par }));
    if (juego === "precio") return faltaPrecio.map(p => ({ tipo: "precio", p }));
    if (juego === "proveedor") return faltaProveedor.map(p => ({ tipo: "proveedor", p }));
    if (juego === "favoritos") return [{ tipo: "favoritos" }];
    if (juego === "cierre") return [{ tipo: "cierre" }];
    return [];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [juego, ronda]);
  const actual = tarjetas[i];
  const total = tarjetas.length;

  const elegir = (j) => { setJuego(j); setRonda(r => r + 1); setI(0); setValor(""); };
  const volverAlMenu = () => { setJuego(null); setI(0); setValor(""); };
  const siguiente = () => { setValor(""); if (i + 1 >= total) volverAlMenu(); else setI(i + 1); };

  const proveedoresDeHoy = useMemo(() => {
    const ids = new Set(deHoy.map(p => p.supplierId).filter(Boolean));
    const recientes = suppliers.filter(s => ids.has(s.id));
    const otros = suppliers.filter(s => !ids.has(s.id)).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 6);
    return [...recientes, ...otros];
  }, [deHoy, suppliers]);

  const onDown = e => { inicio.current = e.clientX; };
  const onUp = e => { if (inicio.current !== null && Math.abs(e.clientX - inicio.current) > 90) siguiente(); inicio.current = null; };

  // Funciones de dibujo, no componentes: un componente definido adentro del render se desmonta en cada cambio (las fotos titilaban).
  const miniatura = (p, estilo) => {
    const src = elegirMiniatura(p) || respaldoDe(p); // copia local, o la dirección de la nube (17/09)
    return Foto ? <Foto src={src} respaldo={respaldoDe(p)} t={tLegacy} estilo={{ width: "100%", height: "100%", objectFit: "cover", display: "block", ...estilo }} /> : <img src={src || respaldoDe(p)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", ...estilo }} />;
  };
  const tarjeta = (contenido) => (
    <div onPointerDown={onDown} onPointerUp={onUp} style={{ background: paleta.card, border: `1px solid ${paleta.border}`, borderRadius: radios.grande + 2, boxShadow: paleta.sombraTarjeta, padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>{contenido}</div>
  );
  const pregunta = (titulo, sub) => <div style={{ textAlign: "center" }}><p style={{ ...texto("cuerpo", { fontWeight: 600 }), margin: 0 }}>{titulo}</p>{sub && <p style={{ ...texto("pie"), color: paleta.dim, margin: "2px 0 0" }}>{sub}</p>}</div>;
  const dosBotones = ({ onSaltar, onListo, listoTexto = t("revisar.listo"), saltarTexto = t("revisar.saltar"), listoActivo = true }) => (
    <>
      <div style={{ display: "flex", gap: 8 }}>
        <Boton variante="secundario" ancho="total" onClick={onSaltar} estilo={{ flex: 1, minHeight: 48 }}>{saltarTexto}</Boton>
        <Boton variante="secundario" ancho="total" onClick={onListo} deshabilitado={!listoActivo} estilo={{ flex: 1, minHeight: 48 }}>{listoTexto}</Boton>
      </div>
      <p style={{ ...texto("pie"), color: paleta.dim, textAlign: "center", margin: 0 }}>{t("revisar.deslizaParaPasar")}</p>
    </>
  );
  const eliminar = (p) => { onEliminar?.(p); setBorrados(prev => new Set([...prev, p.id])); siguiente(); };
  const cabeceraProducto = (p) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: 88, height: 88, borderRadius: radios.medio, overflow: "hidden", background: paleta.surface, flexShrink: 0 }}>{miniatura(p)}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ ...texto("cuerpo", { fontWeight: 600 }), margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name || "—"}</p>
        <p style={{ ...texto("pie"), color: paleta.muted, margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{suppliers.find(s => s.id === p.supplierId)?.company || p.supplierCompany || "—"} · {horaDe(p.createdAt)}</p>
      </div>
      <button type="button" onClick={() => eliminar(p)} aria-label={`${t("revisar.eliminar")} ${p.name || ""}`.trim()} style={{ width: alturas.tocable, height: alturas.tocable, borderRadius: radios.medio, border: `1px solid ${paleta.border}`, background: paleta.surface, display: "grid", placeItems: "center", cursor: "pointer", flexShrink: 0 }}><Icono nombre="borrar" tamano={18} color={paleta.red} /></button>
    </div>
  );

  const teclas = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ",", "0", "⌫"];
  const tocar = k => setValor(v => k === "⌫" ? v.slice(0, -1) : k === "," ? (v.includes(".") ? v : (v || "0") + ".") : v.replace(".", "").length < 7 ? v + k : v);
  const confirmarPrecio = () => { if (valor) onActualizarProducto?.(actual.p.id, { price: valor.replace(/\.$/, "") }); siguiente(); };
  const elegirProveedor = (s) => { onActualizarProducto?.(actual.p.id, { supplierId: s.id, supplierCompany: s.company }); siguiente(); };
  const alternarFav = (p) => { const n = new Set(favs); const on = !n.has(p.id); if (on) n.add(p.id); else n.delete(p.id); setFavs(n); onActualizarProducto?.(p.id, { favorito: on ? 1 : 0 }); };

  const proveedoresHoy = new Set(deHoy.map(p => p.supplierId).filter(Boolean)).size;
  const nombreJuego = { repetidos: t("revisar.juegoRepetidos"), precio: t("revisar.juegoPrecio"), proveedor: t("revisar.juegoProveedor"), favoritos: t("revisar.juegoFavoritos"), cierre: t("revisar.cerrarElDia") };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: paleta.bg, color: paleta.text, fontFamily: "inherit" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: `calc(env(safe-area-inset-top, 0px) + 8px) ${espacios.margenLateral}px 6px`, minHeight: alturas.tocable + 14 }}>
        <button type="button" onClick={juego ? volverAlMenu : onCerrar} aria-label={juego ? t("comun.volver") : t("comun.cerrar")} style={{ width: alturas.icono, height: alturas.icono, borderRadius: radios.medio, border: `1px solid ${paleta.border}`, background: paleta.card, display: "grid", placeItems: "center", cursor: "pointer", flexShrink: 0 }}><Icono nombre={juego ? "volver" : "cerrar"} tamano={20} color={paleta.muted} /></button>
        <h1 style={{ ...texto("titulo"), margin: 0, flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{juego ? nombreJuego[juego] : t("revisar.titulo")}</h1>
        {juego && total > 0 && actual?.tipo !== "favoritos" && actual?.tipo !== "cierre" && <span style={{ ...texto("pie"), color: paleta.dim }}>{t("revisar.de", { n: i + 1, total })}</span>}
      </div>
      {juego && total > 1 && <div aria-hidden style={{ margin: `0 ${espacios.margenLateral}px 10px`, height: 4, borderRadius: 2, background: paleta.border, overflow: "hidden" }}><div style={{ width: `${Math.round(((i + 1) / total) * 100)}%`, height: "100%", background: paleta.accent, transition: "width 200ms" }} /></div>}

      <div style={{ flex: 1, overflowY: "auto", padding: `0 ${espacios.margenLateral}px 24px`, display: "flex", flexDirection: "column", gap: 12 }}>

        {/* El menú: qué querés revisar */}
        {!juego && (
          <>
            {pregunta(t("revisar.elegirJuego"), [feria, t("catalogo.productos", { count: deHoy.length })].filter(Boolean).join(" · "))}
            <Fila onClick={pares.length ? () => elegir("repetidos") : undefined} flecha={pares.length > 0} miniatura={<Icono nombre="copiar" tamano={22} color={pares.length ? paleta.accentTexto : paleta.dim} />} titulo={t("revisar.juegoRepetidos")} subtitulo={pares.length ? t("revisar.pares", { count: pares.length }) : t("revisar.nadaPendiente")} />
            <Fila onClick={faltaPrecio.length ? () => elegir("precio") : undefined} flecha={faltaPrecio.length > 0} miniatura={<Icono nombre="editar" tamano={22} color={faltaPrecio.length ? paleta.accentTexto : paleta.dim} />} titulo={t("revisar.juegoPrecio")} subtitulo={faltaPrecio.length ? t("catalogo.productos", { count: faltaPrecio.length }) : t("revisar.nadaPendiente")} />
            <Fila onClick={faltaProveedor.length ? () => elegir("proveedor") : undefined} flecha={faltaProveedor.length > 0} miniatura={<Icono nombre="proveedor" tamano={22} color={faltaProveedor.length ? paleta.accentTexto : paleta.dim} />} titulo={t("revisar.juegoProveedor")} subtitulo={faltaProveedor.length ? t("catalogo.productos", { count: faltaProveedor.length }) : t("revisar.nadaPendiente")} />
            <Fila onClick={deHoy.length ? () => elegir("favoritos") : undefined} flecha={deHoy.length > 0} miniatura={<Icono nombre="favorito" tamano={22} color={paleta.accentTexto} />} titulo={t("revisar.juegoFavoritos")} subtitulo={t("revisar.favoritosDeHoySub", { count: favs.size, total: deHoy.length })} />
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
              <Boton variante="principal" ancho="total" onClick={() => elegir("cierre")}>{t("revisar.cerrarElDia")}</Boton>
              <Boton variante="fantasma" ancho="total" onClick={onCerrar}>{t("revisar.volverAlCatalogo")}</Boton>
            </div>
          </>
        )}

        {actual?.tipo === "repetidos" && (() => {
          const { a, b, minutos } = actual.par;
          const prov = suppliers.find(x => x.id === a.supplierId)?.company || a.supplierCompany || null;
          const juntarEstos = () => { onJuntar?.(a, b); setBorrados(prev => new Set([...prev, b.id])); siguiente(); };
          return (
            <>
              {pregunta(t("revisar.sonElMismo"), [minutos < 1 ? t("revisar.sacadasSeguidas") : t("revisar.repetidosSub", { count: minutos }), prov].filter(Boolean).join(" · "))}
              {tarjeta(<>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {[a, b].map(p => (
                    <div key={p.id} style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                      <div style={{ aspectRatio: "1", borderRadius: radios.medio, overflow: "hidden", background: paleta.surface }}>{miniatura(p)}</div>
                      <p style={{ ...texto("pie", { fontWeight: 600 }), margin: "4px 0 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name || "—"}</p>
                      <p style={{ ...texto("pie"), color: paleta.dim, margin: 0 }}>{horaDe(p.createdAt)}{p.price ? ` · USD ${p.price}` : ""}</p>
                      <Boton variante="fantasma" icono="borrar" onClick={() => eliminar(p)} etiqueta={`${t("revisar.eliminar")} ${p.name || ""}`.trim()}>{t("comun.borrar")}</Boton>
                    </div>
                  ))}
                </div>
                <p style={{ ...texto("pie"), color: paleta.dim, textAlign: "center", margin: 0 }}>{t("revisar.juntarPista")}</p>
                {dosBotones({ onSaltar: siguiente, onListo: juntarEstos, listoTexto: t("revisar.juntar"), saltarTexto: t("revisar.sonDistintos") })}
              </>)}
            </>
          );
        })()}

        {actual?.tipo === "precio" && (
          <>
            {pregunta(t("revisar.aCuantoEstaba"))}
            {tarjeta(<>
              {cabeceraProducto(actual.p)}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "0 4px" }}><span style={{ ...texto("pie"), color: paleta.dim }}>USD</span><b style={{ ...texto("grande"), color: valor ? paleta.green : paleta.dim, fontVariantNumeric: "tabular-nums" }}>{valor || "0"}</b></div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                {teclas.map(k => <button key={k} type="button" onClick={() => tocar(k)} aria-label={k === "⌫" ? t("comun.borrar") : k} style={{ minHeight: 42, borderRadius: radios.chico, border: `1px solid ${paleta.border}`, background: paleta.surface, color: paleta.text, fontSize: 20, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", WebkitTapHighlightColor: "transparent" }}>{k}</button>)}
              </div>
              {dosBotones({ onSaltar: siguiente, onListo: confirmarPrecio })}
            </>)}
          </>
        )}

        {actual?.tipo === "proveedor" && (
          <>
            {pregunta(t("revisar.deQueProveedor"), t("revisar.estabaEnEseStand", { hora: horaDe(actual.p.createdAt) }))}
            {tarjeta(<>
              {cabeceraProducto(actual.p)}
              <FilaDeChips estilo={{ flexWrap: "wrap", overflow: "visible", justifyContent: "center" }}>
                {proveedoresDeHoy.map(s => <Chip key={s.id} onClick={() => elegirProveedor(s)}>{s.company || `#${s.id}`}</Chip>)}
              </FilaDeChips>
              {dosBotones({ onSaltar: siguiente, onListo: siguiente, listoActivo: false })}
            </>)}
          </>
        )}

        {actual?.tipo === "favoritos" && (
          <>
            {pregunta(t("revisar.favoritosDeHoy"), t("revisar.favoritosDeHoySub", { count: favs.size, total: deHoy.length }))}
            {favs.size === 0 && <p style={{ ...texto("pie"), color: paleta.dim, textAlign: "center", margin: 0 }}>{t("revisar.sinFavoritos")}</p>}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
              {[...deHoy].sort((a, b) => (favs.has(b.id) ? 1 : 0) - (favs.has(a.id) ? 1 : 0)).map(p => (
                <button key={p.id} type="button" onClick={() => alternarFav(p)} aria-pressed={favs.has(p.id)} aria-label={p.name || ""} style={{ position: "relative", aspectRatio: "1", borderRadius: radios.chico, overflow: "hidden", border: `2px solid ${favs.has(p.id) ? paleta.accent : paleta.border}`, background: paleta.surface, padding: 0, cursor: "pointer", WebkitTapHighlightColor: "transparent" }}>
                  {miniatura(p)}
                  {favs.has(p.id) && <span style={{ position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: 6, background: "rgba(10,14,23,0.6)", display: "grid", placeItems: "center" }}><Icono nombre="favorito" tamano={13} color="#FDBA74" /></span>}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Boton variante="secundario" ancho="total" onClick={volverAlMenu} estilo={{ flex: 1 }}>{t("revisar.listo")}</Boton>
              <Boton variante="principal" ancho="total" onClick={() => elegir("cierre")} estilo={{ flex: 1 }}>{t("revisar.cerrarElDia")}</Boton>
            </div>
          </>
        )}

        {actual?.tipo === "cierre" && (
          <>
            <div style={{ textAlign: "center", padding: "22px 0 6px", display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ ...texto("enorme") }}>{t("revisar.diaCerrado")}</span>
              <span style={{ ...texto("cuerpo", { fontWeight: 400 }), color: paleta.muted }}>{feria ? `${feria} · ${fechaCorta(Date.now())}` : fechaCorta(Date.now())}</span>
              <span style={{ ...texto("cuerpo"), color: paleta.text }}>{t("revisar.resumenCierre", { productos: t("catalogo.productos", { count: deHoy.length }), proveedores: t("cantidades.proveedores", { count: proveedoresHoy }) })}</span>
              <span style={{ ...texto("pie"), color: paleta.muted }}>{t("revisar.favoritosCierre", { count: favs.size })}{faltaPrecio.length > 0 ? ` · ${t("revisar.quedaronSinPrecio", { count: faltaPrecio.length })}` : ""}</span>
              <span style={{ ...texto("pie"), color: pendientesSync > 0 ? paleta.muted : paleta.green }}>{pendientesSync > 0 ? t("revisar.pendientesSync", { count: pendientesSync }) : t("revisar.todoSincronizado")}</span>
            </div>
            {esAnonima ? (
              <div style={{ background: paleta.card, border: `1px solid ${paleta.border}`, borderRadius: radios.grande, boxShadow: paleta.sombraTarjeta, padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                <p style={{ ...texto("cuerpo", { fontWeight: 600 }), margin: 0 }}>{t("revisar.tusProductosEnEsteTelefono", { count: deHoy.length })}</p>
                <p style={{ ...texto("pie"), color: paleta.muted, margin: 0 }}>{t("revisar.creaCuenta")}</p>
                <Boton variante="principal" ancho="total" onClick={onCrearCuenta}>{t("revisar.crearCuenta")}</Boton>
                <Boton variante="fantasma" ancho="total" onClick={onCerrar}>{t("revisar.masTarde")}</Boton>
              </div>
            ) : (
              <Boton variante="principal" ancho="total" onClick={onCerrar}>{t("revisar.volverAlCatalogo")}</Boton>
            )}
            {onVerLosDeHoy && <Boton variante="fantasma" ancho="total" onClick={onVerLosDeHoy}>{t("revisar.verLosDeHoy", { count: deHoy.length })}</Boton>}
          </>
        )}
      </div>
    </div>
  );
}
