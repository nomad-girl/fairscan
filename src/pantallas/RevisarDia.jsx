/**
 * Revisar el día (decisión 3 del 16/09, idea de Nati): una sesión guiada de a una
 * tarjeta. Primera parte: lo que falta (precio, proveedor) → tus favoritos de hoy →
 * cierre. Los repetidos de a pares y el redescubrimiento llegan en la segunda parte.
 *
 * Regla de toda la sesión: ignorar una tarjeta es tan fácil como responderla.
 * "Saltar" pesa igual que "Listo"; deslizar pasa a la siguiente; lo salteado no
 * queda como deuda en ningún lado.
 */
import React, { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSistema } from "../sistema/SistemaProvider.jsx";
import { Boton, Chip, FilaDeChips, Icono } from "../componentes/index.js";
import { elegirMiniatura } from "../lib/miniaturas.js";
import { fechaCorta } from "../idiomas/formato.js";

function horaDe(ts) { const d = new Date(ts || 0); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; }

export function RevisarDia({ productosDeHoy = [], suppliers = [], feria = null, esAnonima = false, pendientesSync = 0, Foto, t: tLegacy, onActualizarProducto, onCerrar, onCrearCuenta, onVerLosDeHoy }) {
  const { t } = useTranslation();
  const { paleta, alturas, radios, texto, espacios } = useSistema();

  // Las tarjetas se arman una vez al entrar; lo que se resuelva o se saltee no vuelve.
  const [tarjetas] = useState(() => {
    const t = [];
    for (const p of productosDeHoy) if (!p.price || isNaN(parseFloat(p.price))) t.push({ tipo: "precio", p });
    for (const p of productosDeHoy) if (!p.supplierId) t.push({ tipo: "proveedor", p });
    t.push({ tipo: "favoritos" });
    t.push({ tipo: "cierre" });
    return t;
  });
  const [i, setI] = useState(0);
  const [valor, setValor] = useState("");
  const [favs, setFavs] = useState(() => new Set(productosDeHoy.filter(p => p.favorito).map(p => p.id)));
  const [resueltos, setResueltos] = useState({ precios: 0, proveedores: 0 });
  const inicio = useRef(null);

  const actual = tarjetas[i];
  const total = tarjetas.length;
  const siguiente = () => { setValor(""); setI(n => Math.min(n + 1, total - 1)); };

  const proveedoresDeHoy = useMemo(() => {
    const ids = new Set(productosDeHoy.map(p => p.supplierId).filter(Boolean));
    const recientes = suppliers.filter(s => ids.has(s.id));
    const otros = suppliers.filter(s => !ids.has(s.id)).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 6);
    return [...recientes, ...otros];
  }, [productosDeHoy, suppliers]);

  const onDown = e => { inicio.current = e.clientX; };
  const onUp = e => { if (inicio.current !== null && Math.abs(e.clientX - inicio.current) > 90) siguiente(); inicio.current = null; };

  const Miniatura = ({ p, estilo }) => {
    const src = elegirMiniatura(p);
    return Foto ? <Foto src={src} respaldo={p.photoUrls?.[0] || null} t={tLegacy} estilo={{ width: "100%", height: "100%", objectFit: "cover", display: "block", ...estilo }} /> : <img src={src || p.photoUrls?.[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", ...estilo }} />;
  };

  const teclas = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ",", "0", "⌫"];
  const tocar = k => setValor(v => k === "⌫" ? v.slice(0, -1) : k === "," ? (v.includes(".") ? v : (v || "0") + ".") : v.replace(".", "").length < 7 ? v + k : v);

  const confirmarPrecio = () => { if (valor) { onActualizarProducto?.(actual.p.id, { price: valor.replace(/\.$/, "") }); setResueltos(r => ({ ...r, precios: r.precios + 1 })); } siguiente(); };
  const elegirProveedor = (s) => { onActualizarProducto?.(actual.p.id, { supplierId: s.id, supplierCompany: s.company }); setResueltos(r => ({ ...r, proveedores: r.proveedores + 1 })); siguiente(); };
  const alternarFav = (p) => { const n = new Set(favs); const on = !n.has(p.id); if (on) n.add(p.id); else n.delete(p.id); setFavs(n); onActualizarProducto?.(p.id, { favorito: on ? 1 : 0 }); };

  const sinPrecioAlFinal = productosDeHoy.filter(p => !p.price || isNaN(parseFloat(p.price))).length - resueltos.precios;
  const proveedoresHoy = new Set(productosDeHoy.map(p => p.supplierId).filter(Boolean)).size + resueltos.proveedores;

  const Tarjeta = ({ children }) => (
    <div onPointerDown={onDown} onPointerUp={onUp} style={{ background: paleta.card, border: `1px solid ${paleta.border}`, borderRadius: radios.grande + 2, boxShadow: paleta.sombraTarjeta, padding: 12, display: "flex", flexDirection: "column", gap: 10, touchAction: "pan-y" }}>{children}</div>
  );
  const Pregunta = ({ titulo, sub }) => <div style={{ textAlign: "center" }}><p style={{ ...texto("cuerpo", { fontWeight: 600 }), margin: 0 }}>{titulo}</p>{sub && <p style={{ ...texto("pie"), color: paleta.dim, margin: "2px 0 0" }}>{sub}</p>}</div>;
  const DosBotones = ({ onSaltar, onListo, listoTexto = t("revisar.listo"), listoActivo = true }) => (
    <>
      <div style={{ display: "flex", gap: 8 }}>
        <Boton variante="secundario" ancho="total" onClick={onSaltar} estilo={{ flex: 1, minHeight: 48 }}>{t("revisar.saltar")}</Boton>
        <Boton variante="secundario" ancho="total" onClick={onListo} deshabilitado={!listoActivo} estilo={{ flex: 1, minHeight: 48 }}>{listoTexto}</Boton>
      </div>
      <p style={{ ...texto("pie"), color: paleta.dim, textAlign: "center", margin: 0 }}>{t("revisar.deslizaParaPasar")}</p>
    </>
  );

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: paleta.bg, color: paleta.text, fontFamily: "inherit" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: `calc(env(safe-area-inset-top, 0px) + 8px) ${espacios.margenLateral}px 6px`, minHeight: alturas.tocable + 14 }}>
        <button type="button" onClick={onCerrar} aria-label={t("comun.cerrar")} style={{ width: alturas.icono, height: alturas.icono, borderRadius: radios.medio, border: `1px solid ${paleta.border}`, background: paleta.card, display: "grid", placeItems: "center", cursor: "pointer", boxShadow: paleta.sombraTarjeta }}><Icono nombre="cerrar" tamano={20} color={paleta.muted} /></button>
        <h1 style={{ ...texto("titulo"), margin: 0, flex: 1 }}>{t("revisar.titulo")}</h1>
        <span style={{ ...texto("pie"), color: paleta.dim }}>{actual?.tipo === "favoritos" || actual?.tipo === "cierre" ? t("revisar.ultimoPaso") : t("revisar.de", { n: i + 1, total })}</span>
      </div>
      <div aria-hidden style={{ margin: `0 ${espacios.margenLateral}px 10px`, height: 4, borderRadius: 2, background: paleta.border, overflow: "hidden" }}><div style={{ width: `${Math.round(((i + 1) / total) * 100)}%`, height: "100%", background: paleta.accent, transition: "width 250ms" }} /></div>

      <div style={{ flex: 1, overflowY: "auto", padding: `0 ${espacios.margenLateral}px 24px`, display: "flex", flexDirection: "column", gap: 12 }}>

        {actual?.tipo === "precio" && (
          <>
            <Pregunta titulo={t("revisar.aCuantoEstaba")} sub={`${actual.p.name || "—"} · ${suppliers.find(s => s.id === actual.p.supplierId)?.company || actual.p.supplierCompany || "—"} · ${horaDe(actual.p.createdAt)}`} />
            <Tarjeta>
              <div style={{ aspectRatio: "4/3", borderRadius: radios.medio, overflow: "hidden", background: paleta.surface }}><Miniatura p={actual.p} /></div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "0 4px" }}><span style={{ ...texto("pie"), color: paleta.dim }}>USD</span><b style={{ ...texto("grande"), color: valor ? paleta.green : paleta.dim, fontVariantNumeric: "tabular-nums" }}>{valor || "0"}</b></div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                {teclas.map(k => <button key={k} type="button" onClick={() => tocar(k)} aria-label={k === "⌫" ? t("comun.borrar") : k} style={{ minHeight: alturas.tocable, borderRadius: radios.chico, border: `1px solid ${paleta.border}`, background: paleta.bg, color: paleta.text, fontSize: 18, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{k}</button>)}
              </div>
              <DosBotones onSaltar={siguiente} onListo={confirmarPrecio} />
            </Tarjeta>
          </>
        )}

        {actual?.tipo === "proveedor" && (
          <>
            <Pregunta titulo={t("revisar.deQueProveedor")} sub={t("revisar.estabaEnEseStand", { hora: horaDe(actual.p.createdAt) })} />
            <Tarjeta>
              <div style={{ aspectRatio: "4/3", borderRadius: radios.medio, overflow: "hidden", background: paleta.surface }}><Miniatura p={actual.p} /></div>
              <p style={{ ...texto("cuerpo", { fontWeight: 600 }), margin: 0, textAlign: "center" }}>{actual.p.name || "—"}</p>
              <FilaDeChips estilo={{ flexWrap: "wrap", overflow: "visible", justifyContent: "center" }}>
                {proveedoresDeHoy.map(s => <Chip key={s.id} onClick={() => elegirProveedor(s)}>{s.company || `#${s.id}`}</Chip>)}
              </FilaDeChips>
              <DosBotones onSaltar={siguiente} onListo={siguiente} listoActivo={false} />
            </Tarjeta>
          </>
        )}

        {actual?.tipo === "favoritos" && (
          <>
            <Pregunta titulo={t("revisar.favoritosDeHoy")} sub={t("revisar.favoritosDeHoySub", { count: favs.size, total: productosDeHoy.length })} />
            {favs.size === 0 && <p style={{ ...texto("pie"), color: paleta.dim, textAlign: "center", margin: 0 }}>{t("revisar.sinFavoritos")}</p>}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
              {[...productosDeHoy].sort((a, b) => (favs.has(b.id) ? 1 : 0) - (favs.has(a.id) ? 1 : 0)).slice(0, favs.size ? Math.max(favs.size, 9) : 9).map(p => (
                <button key={p.id} type="button" onClick={() => alternarFav(p)} aria-pressed={favs.has(p.id)} aria-label={p.name || ""} style={{ position: "relative", aspectRatio: "1", borderRadius: radios.chico, overflow: "hidden", border: `2px solid ${favs.has(p.id) ? paleta.accent : paleta.border}`, background: paleta.card, padding: 0, cursor: "pointer", opacity: favs.has(p.id) ? 1 : 0.6 }}>
                  <Miniatura p={p} />
                  {favs.has(p.id) && <span style={{ position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: 6, background: "rgba(10,14,23,0.6)", display: "grid", placeItems: "center" }}><Icono nombre="favorito" tamano={13} color="#FDBA74" /></span>}
                </button>
              ))}
            </div>
            <FilaDeChips estilo={{ justifyContent: "center" }}><Chip onClick={onVerLosDeHoy}>{t("revisar.verLosDeHoy", { count: productosDeHoy.length })}</Chip></FilaDeChips>
            <Boton variante="principal" ancho="total" onClick={siguiente}>{t("revisar.cerrarElDia")}</Boton>
          </>
        )}

        {actual?.tipo === "cierre" && (
          <>
            <div style={{ textAlign: "center", padding: "22px 0 6px", display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ ...texto("enorme") }}>{t("revisar.diaCerrado")}</span>
              <span style={{ ...texto("cuerpo", { fontWeight: 400 }), color: paleta.muted }}>{feria ? `${feria} · ${fechaCorta(Date.now())}` : fechaCorta(Date.now())}</span>
              <span style={{ ...texto("cuerpo"), color: paleta.text }}>{t("revisar.resumenCierre", { productos: t("catalogo.productos", { count: productosDeHoy.length }), proveedores: t("cantidades.proveedores", { count: proveedoresHoy }) })}</span>
              <span style={{ ...texto("pie"), color: paleta.muted }}>{t("revisar.favoritosCierre", { count: favs.size })}{sinPrecioAlFinal > 0 ? ` · ${t("revisar.quedaronSinPrecio", { count: sinPrecioAlFinal })}` : ""}</span>
              <span style={{ ...texto("pie"), color: pendientesSync > 0 ? paleta.muted : paleta.green }}>{pendientesSync > 0 ? t("revisar.pendientesSync", { count: pendientesSync }) : t("revisar.todoSincronizado")}</span>
            </div>
            {esAnonima ? (
              <div style={{ background: paleta.card, border: `1px solid ${paleta.border}`, borderRadius: radios.grande, boxShadow: paleta.sombraTarjeta, padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                <p style={{ ...texto("cuerpo", { fontWeight: 600 }), margin: 0 }}>{t("revisar.tusProductosEnEsteTelefono", { count: productosDeHoy.length })}</p>
                <p style={{ ...texto("pie"), color: paleta.muted, margin: 0 }}>{t("revisar.creaCuenta")}</p>
                <Boton variante="principal" ancho="total" onClick={onCrearCuenta}>{t("revisar.crearCuenta")}</Boton>
                <Boton variante="fantasma" ancho="total" onClick={onCerrar}>{t("revisar.masTarde")}</Boton>
              </div>
            ) : (
              <Boton variante="principal" ancho="total" onClick={onCerrar}>{t("revisar.volverAlCatalogo")}</Boton>
            )}
          </>
        )}
      </div>
    </div>
  );
}
