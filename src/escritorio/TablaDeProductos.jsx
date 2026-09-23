/**
 * El catálogo como tabla (escritorio, decisión 3 de Nati del 23/09): una fila por producto con
 * miniatura, y cada celda se edita con un clic. Para completar datos en serie, que es lo que
 * Lucas hace en la compu. Clic en la fila (fuera de una celda editable) elige el producto para
 * el panel de la derecha.
 */
import React from "react";
import { useTranslation } from "react-i18next";
import { useSistema } from "../sistema/SistemaProvider.jsx";
import { Icono, Celda } from "../componentes/index.js";
import { haceCuanto } from "../idiomas/formato.js";
import { Miniatura } from "./util.jsx";

const COLUMNAS = "44px minmax(160px, 1.6fr) minmax(120px, 1fr) 90px 80px 80px 90px minmax(100px, 0.9fr) 100px";

export function TablaDeProductos({ productos = [], suppliers = [], moneda = "USD", seleccionado = null, settings, Foto, tLegacy, onSeleccionar, onActualizar }) {
  const { t } = useTranslation();
  const { paleta, radios, texto } = useSistema();
  const empresaDe = (p) => suppliers.find(s => s.id === p.supplierId)?.company || p.supplierCompany || "";
  const conPiezas = settings?.datosDeCompra?.piezasPorCaja !== false;
  const conCbm = settings?.datosDeCompra?.cbmPorCaja !== false;
  const cabeceras = [t("escritorio.columnaFoto"), t("escritorio.columnaProducto"), t("escritorio.columnaProveedor"), `${t("escritorio.columnaPrecio")} ${moneda}`, t("escritorio.columnaMoq"), t("escritorio.columnaPiezas"), t("escritorio.columnaCbm"), t("escritorio.columnaCategoria"), t("escritorio.columnaFecha")];

  return (
    <div role="table" aria-label={t("escritorio.catalogo")} style={{ background: paleta.card, border: `1px solid ${paleta.border}`, borderRadius: radios.grande, overflow: "auto" }}>
      <div role="row" style={{ display: "grid", gridTemplateColumns: COLUMNAS, gap: 6, padding: "8px 10px", borderBottom: `1px solid ${paleta.border}`, position: "sticky", top: 0, background: paleta.card, zIndex: 1, minWidth: 900 }}>
        {cabeceras.map(h => <span key={h} role="columnheader" style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: paleta.dim, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{h}</span>)}
      </div>
      {productos.map(p => {
        const elegido = p.id === seleccionado;
        return (
          <div key={p.id} role="row" aria-selected={elegido} onClick={() => onSeleccionar?.(p)}
            style={{ display: "grid", gridTemplateColumns: COLUMNAS, gap: 6, alignItems: "center", padding: "4px 10px", borderBottom: `1px solid ${paleta.border}`, background: elegido ? paleta.accentSoft : "transparent", cursor: "pointer", minWidth: 900, boxShadow: elegido ? `inset 3px 0 0 ${paleta.accent}` : "none" }}>
            <span role="cell" style={{ width: 40, height: 40, borderRadius: radios.chico, overflow: "hidden", background: paleta.surface, position: "relative" }}>
              <Miniatura p={p} Foto={Foto} tLegacy={tLegacy} paleta={paleta} />
              {p.favorito ? <span style={{ position: "absolute", top: 2, right: 2 }}><Icono nombre="favorito" tamano={11} color="#fff" /></span> : null}
            </span>
            <span role="cell"><Celda id={p.id} nombre={p.name} campo="name" etiqueta={t("ficha.nombre")} valor={p.name} onGuardar={onActualizar} /></span>
            <span role="cell" style={{ ...texto("pie"), color: paleta.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", padding: "0 6px" }}>{empresaDe(p) || t("escritorio.sinProveedor")}</span>
            <span role="cell"><Celda id={p.id} nombre={p.name} campo="price" etiqueta={t("ficha.precio")} valor={p.price} numerico alineado="right" onGuardar={onActualizar} /></span>
            <span role="cell"><Celda id={p.id} nombre={p.name} campo="moq" etiqueta={t("ficha.moq")} valor={p.moq} numerico alineado="right" onGuardar={onActualizar} /></span>
            <span role="cell">{conPiezas ? <Celda id={p.id} nombre={p.name} campo="piezasPorCaja" etiqueta={t("ficha.piezasPorCaja")} valor={p.piezasPorCaja} numerico alineado="right" onGuardar={onActualizar} /> : null}</span>
            <span role="cell">{conCbm ? <Celda id={p.id} nombre={p.name} campo="cbmPorCaja" etiqueta={t("ficha.cbmPorCaja")} valor={p.cbmPorCaja} numerico alineado="right" onGuardar={onActualizar} /> : null}</span>
            <span role="cell"><Celda id={p.id} nombre={p.name} campo="category" etiqueta={t("ficha.categoria")} valor={p.category} onGuardar={onActualizar} /></span>
            <span role="cell" style={{ ...texto("pie"), color: paleta.dim, whiteSpace: "nowrap", padding: "0 6px" }}>{haceCuanto(p.createdAt)}</span>
          </div>
        );
      })}
    </div>
  );
}
