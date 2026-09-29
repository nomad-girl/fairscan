/**
 * Ferias (wireframe A aprobado por Nati el 30/09/2026: https://claude.ai/artifact/PjUB2M3sCHqoVj7N3jgFSW).
 * Reemplaza a la pantalla vieja con emojis. Una fila por feria: nombre, ciudad y fechas, cuántos productos y
 * proveedores tiene; la que está en uso lleva la tilde amarilla (sello = hallazgo). Tocar la fila la pone en uso y
 * vuelve al catálogo (es lo que se hace casi siempre); el lápiz abre la hoja para editar; "Nueva feria" abre la
 * misma hoja vacía. Eliminar está al final de la hoja, en rojo, y siempre con resguardo: la hoja dice qué tiene la
 * feria y ofrece mover todo a otra feria (por defecto) o borrarlo escribiendo el nombre. La feria en uso también se
 * puede eliminar: la app pasa a otra. Antes, borrar una feria borraba en silencio todos sus productos y proveedores.
 *
 * Las fechas se guardan en el campo `dates` que ya viaja a la nube, como "AAAA-MM-DD/AAAA-MM-DD" (una o las dos
 * pueden faltar); lo que ya estaba escrito a mano ("15-19 Abr") se muestra tal cual. Así no hace falta tocar la base
 * ni la sincronización, y un teléfono con la versión vieja sigue viendo algo legible.
 */
import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSistema } from "../sistema/SistemaProvider.jsx";
import { Boton, Hoja, Icono } from "../componentes/index.js";
import { useVolverConGesto } from "../sistema/useVolverConGesto.js";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** "2026-09-19/2026-09-22" → { desde, hasta }; texto libre → null */
export function partirFechas(dates) {
  if (!dates || typeof dates !== "string") return { desde: "", hasta: "" };
  const [a = "", b = ""] = dates.split("/");
  if ((a && !ISO.test(a)) || (b && !ISO.test(b))) return null;
  return { desde: a, hasta: b };
}

/** { desde, hasta } → "2026-09-19/2026-09-22" ("" si no hay ninguna) */
export function unirFechas({ desde = "", hasta = "" }) {
  if (!desde && !hasta) return "";
  return `${desde}/${hasta}`;
}

/** Cómo se lee: "19 al 22 de septiembre", "28 de sep al 2 de oct", "octubre 2025" si es texto libre se devuelve igual */
export function fechasLegibles(dates, idioma = "es-AR") {
  const partes = partirFechas(dates);
  if (partes === null) return dates;
  const { desde, hasta } = partes;
  if (!desde && !hasta) return "";
  const f = (s) => new Date(`${s}T12:00:00`);
  const dia = (d) => d.toLocaleDateString(idioma, { day: "numeric" });
  const mes = (d) => d.toLocaleDateString(idioma, { month: "long" });
  const diaMes = (d) => d.toLocaleDateString(idioma, { day: "numeric", month: "short" }).replace(".", "");
  const es = idioma.startsWith("es");
  if (desde && hasta) {
    const a = f(desde), b = f(hasta);
    if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) {
      return es ? `${dia(a)} al ${dia(b)} de ${mes(a)}` : `${mes(a)} ${dia(a)}–${dia(b)}`;
    }
    return es ? `${diaMes(a)} al ${diaMes(b)}` : `${diaMes(a)} – ${diaMes(b)}`;
  }
  const d = f(desde || hasta);
  return es ? `${desde ? "desde el" : "hasta el"} ${dia(d)} de ${mes(d)}` : `${desde ? "from" : "until"} ${diaMes(d)}`;
}

export function Ferias({ districts = [], activeDistrictId = null, products = [], suppliers = [], onActivate, onAdd, onUpdate, onDelete, onBack }) {
  const { t, i18n } = useTranslation();
  const { paleta, alturas, radios, texto, espacios } = useSistema();
  const { ref: raizRef, estilo: estiloGesto } = useVolverConGesto(onBack, { borde: 40 });
  const [hoja, setHoja] = useState(null);           // null · { modo: "nueva" } · { modo: "editar", id }
  const [borrador, setBorrador] = useState({ name: "", location: "", desde: "", hasta: "" });
  const [eliminando, setEliminando] = useState(null); // null · { id, moverA: id|null, borrar: bool, confirmacion: "" }

  const conteo = useMemo(() => {
    const m = new Map();
    for (const d of districts) m.set(d.id, { productos: 0, proveedores: 0 });
    for (const p of products) if (m.has(p.districtId)) m.get(p.districtId).productos++;
    for (const s of suppliers) if (m.has(s.districtId)) m.get(s.districtId).proveedores++;
    return m;
  }, [districts, products, suppliers]);

  const abrirNueva = () => { setBorrador({ name: "", location: "", desde: "", hasta: "" }); setHoja({ modo: "nueva" }); };
  const abrirEditar = (d) => {
    const partes = partirFechas(d.dates) || { desde: "", hasta: "" };
    setBorrador({ name: d.name || "", location: d.location || "", desde: partes.desde, hasta: partes.hasta, textoLibre: partirFechas(d.dates) === null ? d.dates : "" });
    setHoja({ modo: "editar", id: d.id });
  };
  const cerrarHoja = () => { setHoja(null); setEliminando(null); };

  const guardar = () => {
    const name = borrador.name.trim();
    if (!name) return;
    // Si la feria tenía fechas escritas a mano y no se tocaron las nuevas, se conservan
    const dates = (!borrador.desde && !borrador.hasta && borrador.textoLibre) ? borrador.textoLibre : unirFechas(borrador);
    const cambios = { name, location: borrador.location.trim(), dates, emoji: null };
    if (hoja?.modo === "editar") onUpdate?.(hoja.id, cambios); else onAdd?.(cambios);
    cerrarHoja();
  };

  const feriaEnHoja = hoja?.modo === "editar" ? districts.find(d => d.id === hoja.id) : null;
  const otras = feriaEnHoja ? districts.filter(d => d.id !== feriaEnHoja.id) : [];
  const cuenta = feriaEnHoja ? conteo.get(feriaEnHoja.id) : null;
  const tieneContenido = cuenta ? cuenta.productos + cuenta.proveedores > 0 : false;

  const empezarEliminar = () => setEliminando({ id: feriaEnHoja.id, moverA: otras[0]?.id ?? null, borrar: otras.length === 0, confirmacion: "" });
  const confirmarEliminar = () => {
    if (!eliminando) return;
    if (eliminando.borrar && tieneContenido && eliminando.confirmacion.trim() !== (feriaEnHoja?.name || "").trim()) return;
    onDelete?.(eliminando.id, { moverA: eliminando.borrar ? null : eliminando.moverA });
    cerrarHoja();
  };

  const campo = (clave, etiqueta, extra = {}) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, minWidth: 0 }}>
      <label htmlFor={`feria-${clave}`} style={{ ...texto("pie", { fontWeight: 600 }), color: paleta.muted }}>{etiqueta}</label>
      <input id={`feria-${clave}`} value={borrador[clave] ?? ""} onChange={e => setBorrador(b => ({ ...b, [clave]: e.target.value }))}
        style={{ height: 48, borderRadius: radios.medio, border: `1px solid ${paleta.border}`, background: paleta.surface, color: paleta.text, fontFamily: "inherit", fontSize: 16, padding: "0 14px", width: "100%", boxSizing: "border-box", outline: "none", fontVariantNumeric: "tabular-nums" }} {...extra} />
    </div>
  );

  const fila = (d) => {
    const enUso = d.id === activeDistrictId;
    const c = conteo.get(d.id) || { productos: 0, proveedores: 0 };
    const lugarFechas = [d.location, fechasLegibles(d.dates, i18n.language)].filter(Boolean).join(" · ");
    return (
      <div key={d.id} style={{ background: paleta.card, borderRadius: radios.grande, boxShadow: paleta.sombraTarjeta, border: `2px solid ${enUso ? paleta.accent : "transparent"}`, display: "flex", alignItems: "center", gap: 8, padding: "0 10px 0 0" }}>
        <button type="button" onClick={() => onActivate?.(d.id)} aria-label={t("ferias.usarFeria", { nombre: d.name })} aria-pressed={enUso}
          style={{ flex: 1, minWidth: 0, textAlign: "left", background: "none", border: "none", padding: "14px 6px 14px 16px", cursor: "pointer", fontFamily: "inherit", color: paleta.text, display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <span style={{ ...texto("destacado"), overflowWrap: "anywhere" }}>{d.name}</span>
            {enUso && <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 999, background: paleta.sello, color: paleta.selloTexto, fontSize: 11, fontWeight: 700, flexShrink: 0 }}><Icono nombre="listo" tamano={12} color={paleta.selloTexto} />{t("ferias.enUso")}</span>}
          </span>
          {lugarFechas && <span style={{ ...texto("cuerpo", { fontWeight: 400 }), color: paleta.muted }}>{lugarFechas}</span>}
          <span style={{ ...texto("pie"), color: paleta.dim, fontVariantNumeric: "tabular-nums" }}>
            {c.productos + c.proveedores === 0 ? t("ferias.sinProductos") : `${t("cantidades.productos", { count: c.productos })} · ${t("cantidades.proveedores", { count: c.proveedores })}`}
          </span>
        </button>
        <button type="button" onClick={() => abrirEditar(d)} aria-label={t("ferias.editarNombre", { nombre: d.name })}
          style={{ width: alturas.icono, height: alturas.icono, borderRadius: alturas.icono / 2, border: `1px solid ${paleta.border}`, background: paleta.card, display: "grid", placeItems: "center", cursor: "pointer", flexShrink: 0 }}>
          <Icono nombre="editar" tamano={18} color={paleta.text} />
        </button>
      </div>
    );
  };

  return (
    <div ref={raizRef} style={{ height: "100%", display: "flex", flexDirection: "column", background: paleta.bg, color: paleta.text, fontFamily: "inherit", ...estiloGesto }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: `8px ${espacios.margenLateral}px 8px`, minHeight: alturas.tocable + 16 }}>
        <button type="button" onClick={onBack} aria-label={t("comun.volver")} style={{ width: alturas.icono, height: alturas.icono, borderRadius: radios.medio, border: `1px solid ${paleta.border}`, background: paleta.card, display: "grid", placeItems: "center", cursor: "pointer" }}><Icono nombre="volver" tamano={22} color={paleta.text} /></button>
        <h1 style={{ ...texto("titulo"), margin: 0, flex: 1 }}>{t("ferias.titulo")}</h1>
      </div>

      <div style={{ flex: 1, overflowY: "auto", overscrollBehavior: "contain", WebkitOverflowScrolling: "touch", padding: `0 ${espacios.margenLateral}px 16px`, display: "flex", flexDirection: "column", gap: espacios.entreFilas, maxWidth: 720, width: "100%", margin: "0 auto", boxSizing: "border-box" }}>
        <p style={{ ...texto("pie"), color: paleta.muted, margin: "0 0 2px" }}>{t("ferias.ayuda")}</p>
        {districts.map(fila)}
      </div>

      <div style={{ padding: `12px ${espacios.margenLateral}px calc(18px + env(safe-area-inset-bottom, 0px))`, maxWidth: 720, width: "100%", margin: "0 auto", boxSizing: "border-box" }}>
        <Boton variante="principal" ancho="total" icono="mas" onClick={abrirNueva}>{t("ferias.nuevaFeria")}</Boton>
      </div>

      <Hoja abierta={!!hoja} onCerrar={cerrarHoja} titulo={hoja?.modo === "editar" ? t("ferias.editarFeria") : t("ferias.nuevaFeriaTitulo")} altura="completa">
        {hoja && !eliminando && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 4 }}>
            {campo("name", t("ferias.nombre"), { placeholder: t("ferias.nombrePlaceholder"), autoFocus: hoja.modo === "nueva" })}
            {campo("location", t("ferias.ciudad"), { placeholder: t("ferias.ubicacionPlaceholder") })}
            <div style={{ display: "flex", gap: 10 }}>
              {campo("desde", t("ferias.empieza"), { type: "date" })}
              {campo("hasta", t("ferias.termina"), { type: "date" })}
            </div>
            <p style={{ ...texto("pie"), color: paleta.dim, margin: 0 }}>{t("ferias.fechasAyuda")}</p>
            <Boton variante="principal" ancho="total" onClick={guardar} deshabilitado={!borrador.name.trim()}>{hoja.modo === "editar" ? t("ferias.guardar") : t("ferias.crear")}</Boton>
            {feriaEnHoja && (
              <>
                <div style={{ height: 1, background: paleta.border, margin: "6px 0" }} />
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                    <span style={{ ...texto("cuerpo", { fontWeight: 600 }) }}>{t("ferias.eliminarEsta")}</span>
                    <span style={{ ...texto("pie"), color: paleta.dim }}>{tieneContenido ? t("ferias.tiene", { productos: t("cantidades.productos", { count: cuenta.productos }), proveedores: t("cantidades.proveedores", { count: cuenta.proveedores }) }) : t("ferias.estaVacia")}</span>
                  </div>
                  <Boton variante="peligro" icono="borrar" onClick={empezarEliminar}>{t("ferias.eliminar")}</Boton>
                </div>
              </>
            )}
          </div>
        )}
        {hoja && eliminando && feriaEnHoja && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 4 }}>
            <h2 style={{ ...texto("titulo"), margin: 0 }}>{t("ferias.eliminarTitulo", { nombre: feriaEnHoja.name })}</h2>
            {tieneContenido ? (
              <>
                <p style={{ ...texto("cuerpo", { fontWeight: 400 }), color: paleta.muted, margin: 0, lineHeight: 1.45 }}>{t("ferias.queHacemos", { productos: t("cantidades.productos", { count: cuenta.productos }), proveedores: t("cantidades.proveedores", { count: cuenta.proveedores }) })}</p>
                {otras.length > 0 && (
                  <button type="button" onClick={() => setEliminando(e => ({ ...e, borrar: false }))} aria-pressed={!eliminando.borrar}
                    style={{ textAlign: "left", padding: "14px 16px", borderRadius: radios.grande, border: `2px solid ${!eliminando.borrar ? paleta.accent : paleta.border}`, background: !eliminando.borrar ? paleta.accentSoft : paleta.card, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", color: paleta.text }}>
                    <span style={{ width: 22, height: 22, borderRadius: 11, border: `2px solid ${!eliminando.borrar ? paleta.accent : paleta.border}`, background: !eliminando.borrar ? paleta.accent : "transparent", display: "grid", placeItems: "center", flexShrink: 0 }}>{!eliminando.borrar && <span style={{ width: 8, height: 8, borderRadius: 4, background: paleta.selloTexto }} />}</span>
                    <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <span style={{ ...texto("cuerpo", { fontWeight: 700 }) }}>{t("ferias.moverAOtra")}</span>
                      <span style={{ ...texto("pie"), color: paleta.muted }}>{t("ferias.moverAyuda")}</span>
                    </span>
                  </button>
                )}
                {otras.length > 0 && !eliminando.borrar && (
                  <div style={{ marginLeft: 34, display: "flex", flexDirection: "column", gap: 6 }}>
                    <label htmlFor="feria-destino" style={{ ...texto("pie", { fontWeight: 600 }), color: paleta.muted }}>{t("ferias.aCual")}</label>
                    <select id="feria-destino" value={eliminando.moverA ?? ""} onChange={e => setEliminando(x => ({ ...x, moverA: Number(e.target.value) }))}
                      style={{ height: 48, borderRadius: radios.medio, border: `1px solid ${paleta.border}`, background: paleta.surface, color: paleta.text, fontFamily: "inherit", fontSize: 16, padding: "0 12px" }}>
                      {otras.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </select>
                  </div>
                )}
                <button type="button" onClick={() => setEliminando(e => ({ ...e, borrar: true }))} aria-pressed={eliminando.borrar}
                  style={{ textAlign: "left", padding: "14px 16px", borderRadius: radios.grande, border: `2px solid ${eliminando.borrar ? paleta.red : paleta.border}`, background: eliminando.borrar ? paleta.redSoft : paleta.card, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", color: paleta.text }}>
                  <span style={{ width: 22, height: 22, borderRadius: 11, border: `2px solid ${eliminando.borrar ? paleta.red : paleta.border}`, background: eliminando.borrar ? paleta.red : "transparent", display: "grid", placeItems: "center", flexShrink: 0 }}>{eliminando.borrar && <span style={{ width: 8, height: 8, borderRadius: 4, background: "#fff" }} />}</span>
                  <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ ...texto("cuerpo", { fontWeight: 700 }), color: paleta.red }}>{t("ferias.borrarTambien")}</span>
                    <span style={{ ...texto("pie"), color: paleta.muted }}>{t("ferias.borrarAyuda")}</span>
                  </span>
                </button>
                {eliminando.borrar && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label htmlFor="feria-confirmacion" style={{ ...texto("pie", { fontWeight: 600 }), color: paleta.muted }}>{t("ferias.escribiNombre", { nombre: feriaEnHoja.name })}</label>
                    <input id="feria-confirmacion" value={eliminando.confirmacion} onChange={e => setEliminando(x => ({ ...x, confirmacion: e.target.value }))} autoComplete="off"
                      style={{ height: 48, borderRadius: radios.medio, border: `1px solid ${paleta.red}`, background: paleta.surface, color: paleta.text, fontFamily: "inherit", fontSize: 16, padding: "0 14px", outline: "none" }} />
                  </div>
                )}
              </>
            ) : (
              <p style={{ ...texto("cuerpo", { fontWeight: 400 }), color: paleta.muted, margin: 0 }}>{t("ferias.vaciaSeBorra")}</p>
            )}
            {feriaEnHoja.id === activeDistrictId && otras.length > 0 && (
              <p style={{ ...texto("pie"), color: paleta.dim, margin: 0 }}>{t("ferias.pasaA", { nombre: (otras.find(o => o.id === eliminando.moverA) || otras[0]).name })}</p>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <Boton variante="secundario" ancho="total" onClick={() => setEliminando(null)}>{t("ferias.cancelar")}</Boton>
              <Boton variante="peligro" ancho="total" icono="borrar" onClick={confirmarEliminar}
                deshabilitado={eliminando.borrar && tieneContenido && eliminando.confirmacion.trim() !== (feriaEnHoja.name || "").trim()}>{t("ferias.eliminarLaFeria")}</Boton>
            </div>
          </div>
        )}
      </Hoja>
    </div>
  );
}
