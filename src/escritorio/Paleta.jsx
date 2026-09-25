/**
 * La paleta ⌘K del escritorio (tanda A, pieza 5): busca productos, proveedores, vistas y acciones a la vez,
 * agrupados. Flechas para moverse, Enter ejecuta, Escape cierra. Nunca se abre mientras se escribe en un campo.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSistema } from "../sistema/SistemaProvider.jsx";
import { Icono } from "../componentes/index.js";
import { palabrasDeBusqueda, coincideBusqueda } from "../lib/busqueda.js";

export function Paleta({ abierta, onCerrar, productos = [], proveedores = [], vistas = [], acciones = [], onProducto, onProveedor, onVista }) {
  const { t } = useTranslation();
  const { paleta, radios, texto } = useSistema();
  const [consulta, setConsulta] = useState("");
  const [indice, setIndice] = useState(0);
  const ref = useRef(null);
  useEffect(() => { if (abierta) { setConsulta(""); setIndice(0); setTimeout(() => ref.current?.focus(), 0); } }, [abierta]);

  const items = useMemo(() => {
    const palabras = palabrasDeBusqueda(consulta);
    const hay = palabras.length > 0;
    const coincide = (campos) => !hay || coincideBusqueda(campos, palabras);
    const prov = proveedores.filter(s => coincide([s.company, s.contact])).slice(0, hay ? 5 : 3).map(s => ({ grupo: "proveedores", id: `s${s.id}`, texto: s.company || `#${s.id}`, detalle: t("escritorio.productos", { count: productos.filter(p => p.supplierId === s.id).length }), run: () => onProveedor?.(s) }));
    const prods = hay ? productos.filter(p => coincide([p.name, p.category, p.supplierCompany])).slice(0, 6).map(p => ({ grupo: "productos", id: `p${p.id}`, texto: p.name || t("catalogo.procesandoNombre"), detalle: proveedores.find(s => s.id === p.supplierId)?.company || "", run: () => onProducto?.(p) })) : [];
    const vis = vistas.filter(v => coincide([v.nombre])).slice(0, 5).map(v => ({ grupo: "vistas", id: `v${v.id}`, texto: v.nombre, run: () => onVista?.(v) }));
    const acc = acciones.filter(a => coincide([a.texto, a.alias || ""])).slice(0, hay ? 6 : 8).map(a => ({ grupo: "acciones", id: `a${a.id}`, texto: a.texto, tecla: a.tecla, run: a.run }));
    return [...prov, ...prods, ...vis, ...acc];
  }, [consulta, productos, proveedores, vistas, acciones]);

  useEffect(() => { setIndice(0); }, [consulta]);
  if (!abierta) return null;

  const ejecutar = (it) => { onCerrar?.(); it?.run?.(); };
  const alTeclear = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setIndice(i => Math.min(items.length - 1, i + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setIndice(i => Math.max(0, i - 1)); }
    else if (e.key === "Enter") { e.preventDefault(); if (items[indice]) ejecutar(items[indice]); }
    else if (e.key === "Escape") { e.preventDefault(); onCerrar?.(); }
    e.stopPropagation();
  };
  let grupoPrevio = null;
  return (
    <div role="dialog" aria-modal="true" aria-label={t("escritorio.paletaTitulo")} onClick={onCerrar} style={{ position: "fixed", inset: 0, zIndex: 70, background: "rgba(10,14,23,0.35)", display: "flex", justifyContent: "center", alignItems: "flex-start", paddingTop: "12vh" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 620, maxWidth: "92vw", background: paleta.card, border: `1px solid ${paleta.border}`, borderRadius: radios.grande, boxShadow: "0 24px 60px rgba(0,0,0,0.35)", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderBottom: `1px solid ${paleta.border}` }}>
          <Icono nombre="buscar" tamano={18} color={paleta.dim} />
          <input ref={ref} value={consulta} onChange={e => setConsulta(e.target.value)} onKeyDown={alTeclear} placeholder={t("escritorio.paletaPlaceholder")} aria-label={t("escritorio.paletaTitulo")}
            style={{ flex: 1, border: "none", outline: "none", background: "transparent", color: paleta.text, fontFamily: "inherit", fontSize: 17 }} />
          <kbd style={{ ...texto("pie"), color: paleta.dim, border: `1px solid ${paleta.border}`, borderRadius: 6, padding: "1px 6px" }}>esc</kbd>
        </div>
        <div role="listbox" style={{ maxHeight: "56vh", overflowY: "auto", padding: "6px 0" }}>
          {items.length === 0 && <p style={{ ...texto("cuerpo", { fontWeight: 400 }), color: paleta.muted, margin: 0, padding: "16px 14px" }}>{t("escritorio.paletaNada")}</p>}
          {items.map((it, i) => {
            const cabecera = it.grupo !== grupoPrevio ? <p key={`g-${it.grupo}`} style={{ margin: 0, padding: "8px 14px 2px", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: paleta.dim }}>{t(`escritorio.paletaGrupo.${it.grupo}`)}</p> : null;
            grupoPrevio = it.grupo;
            return (
              <React.Fragment key={it.id}>
                {cabecera}
                <div role="option" aria-selected={i === indice} onMouseEnter={() => setIndice(i)} onClick={() => ejecutar(it)}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", cursor: "pointer", background: i === indice ? paleta.accentSoft : "transparent" }}>
                  <span style={{ ...texto("cuerpo", { fontWeight: 500 }), flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.texto}</span>
                  {it.detalle && <span style={{ ...texto("pie"), color: paleta.dim }}>{it.detalle}</span>}
                  {it.tecla && <kbd style={{ ...texto("pie"), color: paleta.dim, border: `1px solid ${paleta.border}`, borderRadius: 6, padding: "0 6px", fontFamily: "ui-monospace, monospace" }}>{it.tecla}</kbd>}
                  {i === indice && <Icono nombre="siguiente" tamano={14} color={paleta.accentTexto} />}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
