/**
 * El catálogo como tabla (escritorio). Tanda A (25/09): clic en la cabecera ordena, "Columnas" elige qué
 * se ve (Foto y Producto fijas a la izquierda), casilla por fila y en la cabecera para elegir varios,
 * Shift + clic elige el rango. Cada celda se edita con un clic; clic en la fila elige el producto para el panel.
 */
import React from "react";
import { useTranslation } from "react-i18next";
import { useSistema } from "../sistema/SistemaProvider.jsx";
import { Icono, Celda } from "../componentes/index.js";
import { haceCuanto } from "../idiomas/formato.js";
import { Miniatura } from "./util.jsx";
import { COLUMNAS_DEFAULT } from "./filtros.js";

const ANCHOS = { proveedor: "minmax(150px, 1fr)", price: "110px", moq: "90px", piezasPorCaja: "100px", cbmPorCaja: "100px", category: "minmax(120px, 0.9fr)", material: "minmax(130px, 0.9fr)", createdAt: "110px", notes: "minmax(160px, 1.2fr)" };
const ORDENABLES = new Set(["name", "proveedor", "price", "moq", "piezasPorCaja", "cbmPorCaja", "category", "createdAt"]);

export function TablaDeProductos({
  productos = [], suppliers = [], moneda = "USD", settings, Foto, tLegacy,
  seleccionado = null, seleccionados = null, orden = { campo: "createdAt", dir: "desc" }, columnas = null,
  onSeleccionar, onAlternar, onAlternarTodos, onOrden, onActualizar,
}) {
  const { t } = useTranslation();
  const { paleta, radios, texto } = useSistema();
  const empresaDe = (p) => suppliers.find(s => s.id === p.supplierId)?.company || p.supplierCompany || "";
  const visibles = (columnas || COLUMNAS_DEFAULT).filter(c => !(c === "piezasPorCaja" && settings?.datosDeCompra?.piezasPorCaja === false) && !(c === "cbmPorCaja" && settings?.datosDeCompra?.cbmPorCaja === false));
  const plantilla = `28px 48px minmax(200px, 1.8fr) ${visibles.map(c => ANCHOS[c] || "110px").join(" ")}`;
  const anchoMin = 380 + visibles.length * 110;
  const hay = seleccionados && seleccionados.size > 0;
  const todos = hay && productos.length > 0 && productos.every(p => seleccionados.has(p.id));

  const etiquetaCol = (c) => ({ name: t("escritorio.columnaProducto"), proveedor: t("escritorio.columnaProveedor"), price: `${t("escritorio.columnaPrecio")} ${moneda}`, moq: t("escritorio.columnaMoq"), piezasPorCaja: t("escritorio.columnaPiezas"), cbmPorCaja: t("escritorio.columnaCbm"), category: t("escritorio.columnaCategoria"), material: t("ficha.materiales"), createdAt: t("escritorio.columnaFecha"), notes: t("ficha.notas") }[c] || c);

  const cabecera = (c, etiqueta) => {
    const activa = orden?.campo === c;
    const ordenable = ORDENABLES.has(c);
    return (
      <button key={c} type="button" role="columnheader" aria-sort={activa ? (orden.dir === "asc" ? "ascending" : "descending") : "none"} onClick={() => ordenable && onOrden?.(c)} disabled={!ordenable}
        title={ordenable ? t("escritorio.ordenarPor", { columna: etiqueta }) : undefined}
        style={{ display: "flex", alignItems: "center", gap: 3, border: "none", background: "none", padding: 0, fontFamily: "inherit", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: activa ? paleta.accentTexto : paleta.dim, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", cursor: ordenable ? "pointer" : "default", textAlign: "left" }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{etiqueta}</span>
        {activa && <Icono nombre="abajo" tamano={12} color={paleta.accentTexto} style={{ transform: orden.dir === "asc" ? "rotate(180deg)" : "none" }} />}
      </button>
    );
  };

  const casilla = (marcada, onClick, etiqueta, parcial = false) => (
    <button type="button" role="checkbox" aria-checked={parcial ? "mixed" : marcada} aria-label={etiqueta} onClick={e => { e.stopPropagation(); onClick(e); }}
      style={{ width: 18, height: 18, borderRadius: 4, border: `1.5px solid ${marcada || parcial ? paleta.accent : paleta.dim}`, background: marcada || parcial ? paleta.accent : "transparent", display: "grid", placeItems: "center", cursor: "pointer", padding: 0 }}>
      {marcada && <Icono nombre="listo" tamano={12} color="#fff" />}
      {!marcada && parcial && <span style={{ width: 8, height: 2, background: "#fff", display: "block" }} />}
    </button>
  );

  const celdaDe = (p, c) => {
    switch (c) {
      case "proveedor": return <span role="cell" key={c} style={{ ...texto("pie"), color: paleta.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", padding: "0 6px" }}>{empresaDe(p) || t("escritorio.sinProveedor")}</span>;
      case "price": return <span role="cell" key={c}><Celda id={p.id} nombre={p.name} campo="price" etiqueta={t("ficha.precio")} valor={p.price} numerico alineado="right" onGuardar={onActualizar} /></span>;
      case "moq": return <span role="cell" key={c}><Celda id={p.id} nombre={p.name} campo="moq" etiqueta={t("ficha.moq")} valor={p.moq} numerico alineado="right" onGuardar={onActualizar} /></span>;
      case "piezasPorCaja": return <span role="cell" key={c}><Celda id={p.id} nombre={p.name} campo="piezasPorCaja" etiqueta={t("ficha.piezasPorCaja")} valor={p.piezasPorCaja} numerico alineado="right" onGuardar={onActualizar} /></span>;
      case "cbmPorCaja": return <span role="cell" key={c}><Celda id={p.id} nombre={p.name} campo="cbmPorCaja" etiqueta={t("ficha.cbmPorCaja")} valor={p.cbmPorCaja} numerico alineado="right" onGuardar={onActualizar} /></span>;
      case "category": return <span role="cell" key={c}><Celda id={p.id} nombre={p.name} campo="category" etiqueta={t("ficha.categoria")} valor={p.category} onGuardar={onActualizar} /></span>;
      case "material": return <span role="cell" key={c} style={{ ...texto("pie"), color: paleta.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", padding: "0 6px" }}>{Array.isArray(p.material) ? p.material.join(", ") : (p.material || "—")}</span>;
      case "createdAt": return <span role="cell" key={c} style={{ ...texto("pie"), color: paleta.dim, whiteSpace: "nowrap", padding: "0 6px" }}>{haceCuanto(p.createdAt)}</span>;
      case "notes": return <span role="cell" key={c}><Celda id={p.id} nombre={p.name} campo="notes" etiqueta={t("ficha.notas")} valor={p.notes} onGuardar={onActualizar} /></span>;
      default: return <span role="cell" key={c} />;
    }
  };

  const fijaIzq = (i) => ({ position: "sticky", left: i === 0 ? 0 : i === 1 ? 38 : 88, zIndex: 1, background: "inherit" });

  return (
    <div role="table" aria-label={t("escritorio.catalogo")} className="fs-tabla" data-hay={hay ? "1" : "0"} style={{ background: paleta.card, border: `1px solid ${paleta.border}`, borderRadius: radios.grande, overflow: "auto" }}>
      <div role="row" style={{ display: "grid", gridTemplateColumns: plantilla, gap: 6, padding: "8px 10px", borderBottom: `1px solid ${paleta.border}`, position: "sticky", top: 0, background: paleta.card, zIndex: 2, minWidth: anchoMin, alignItems: "center" }}>
        <span className="fs-cb" style={fijaIzq(0)}>{casilla(todos, () => onAlternarTodos?.(), t("escritorio.elegirTodos"), hay && !todos)}</span>
        <span role="columnheader" style={{ ...fijaIzq(1), fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: paleta.dim }}>{t("escritorio.columnaFoto")}</span>
        <span style={fijaIzq(2)}>{cabecera("name", t("escritorio.columnaProducto"))}</span>
        {visibles.map(c => cabecera(c, etiquetaCol(c)))}
      </div>
      {productos.map(p => {
        const elegido = p.id === seleccionado;
        const marcado = !!seleccionados?.has(p.id);
        return (
          <div key={p.id} role="row" aria-selected={elegido || marcado} onClick={(e) => onSeleccionar?.(p, e)} className="fs-fila" data-sel={marcado ? "1" : "0"}
            style={{ display: "grid", gridTemplateColumns: plantilla, gap: 8, alignItems: "center", minHeight: 56, padding: "6px 12px", borderBottom: `1px solid ${paleta.border}`, background: marcado || elegido ? paleta.accentSoft : paleta.card, cursor: "pointer", minWidth: anchoMin, boxShadow: elegido ? `inset 3px 0 0 ${paleta.accent}` : "none", opacity: p.descartado ? 0.55 : 1, fontSize: 15 }}>
            <span role="cell" className="fs-cb" style={fijaIzq(0)}>{casilla(marcado, (e) => onAlternar?.(p, e), `${t("escritorio.elegir")} ${p.name || ""}`.trim())}</span>
            <span role="cell" style={{ ...fijaIzq(1), width: 44, height: 44, borderRadius: radios.chico, overflow: "hidden", background: paleta.surface, position: "sticky" }}>
              <Miniatura p={p} Foto={Foto} tLegacy={tLegacy} paleta={paleta} />
              {p.favorito ? <span style={{ position: "absolute", top: 2, right: 2 }}><Icono nombre="favorito" tamano={11} color="#fff" /></span> : null}
            </span>
            <span role="cell" style={fijaIzq(2)}><Celda id={p.id} nombre={p.name} campo="name" etiqueta={t("ficha.nombre")} valor={p.name} onGuardar={onActualizar} /></span>
            {visibles.map(c => celdaDe(p, c))}
          </div>
        );
      })}
    </div>
  );
}
