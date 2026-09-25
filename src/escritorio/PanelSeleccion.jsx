/**
 * El panel de la derecha cuando hay varios productos elegidos (tanda A, pieza 2, nota c):
 * un resumen y las mismas acciones grandes, para quien prefiere el mouse a la barra flotante.
 */
import React from "react";
import { useTranslation } from "react-i18next";
import { useSistema } from "../sistema/SistemaProvider.jsx";
import { Boton, Icono } from "../componentes/index.js";
import { Miniatura } from "./util.jsx";
import { tienePrecio } from "./filtros.js";

export function PanelSeleccion({ productos = [], suppliers = [], moneda = "USD", Foto, tLegacy, onFavorito, onAgregarAlPedido, onDescartar, onRestaurar, onBorrar, onCerrar }) {
  const { t } = useTranslation();
  const { paleta, radios, texto } = useSistema();
  const conPrecio = productos.filter(tienePrecio).length;
  const proveedores = new Set(productos.map(p => p.supplierId).filter(Boolean)).size;
  const todosFavoritos = productos.length > 0 && productos.every(p => p.favorito);
  const algunDescartado = productos.some(p => p.descartado);
  const total = productos.reduce((n, p) => n + (tienePrecio(p) ? parseFloat(String(p.price).replace(",", ".")) : 0), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: 16, color: paleta.text }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <h2 style={{ ...texto("titulo"), margin: 0, flex: 1 }}>{t("escritorio.elegidos", { count: productos.length })}</h2>
        <button type="button" onClick={onCerrar} aria-label={t("escritorio.deseleccionar")} style={{ width: 32, height: 32, borderRadius: 16, border: `1px solid ${paleta.border}`, background: paleta.card, display: "grid", placeItems: "center", cursor: "pointer" }}><Icono nombre="cerrar" tamano={16} color={paleta.text} /></button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 4 }}>
        {productos.slice(0, 12).map(p => <span key={p.id} style={{ aspectRatio: "1", borderRadius: radios.chico, overflow: "hidden", background: paleta.surface }}><Miniatura p={p} Foto={Foto} tLegacy={tLegacy} paleta={paleta} /></span>)}
        {productos.length > 12 && <span style={{ aspectRatio: "1", borderRadius: radios.chico, background: paleta.surface, display: "grid", placeItems: "center", ...texto("pie"), color: paleta.muted }}>+{productos.length - 12}</span>}
      </div>
      <p style={{ ...texto("cuerpo", { fontWeight: 400 }), color: paleta.muted, margin: 0 }}>
        {t("escritorio.resumenSeleccion", { conPrecio, proveedores })}{conPrecio ? ` · ${t("escritorio.sumaPrecios")} ${moneda} ${total.toFixed(2)}` : ""}
      </p>
      <Boton variante="secundario" ancho="total" icono="favorito" onClick={onFavorito}>{todosFavoritos ? t("escritorio.quitarFavorito") : t("escritorio.favorito")}</Boton>
      <Boton variante="principal" ancho="total" icono="pedido" deshabilitado={proveedores === 0} onClick={onAgregarAlPedido}>{t("escritorio.agregarAlPedido")}</Boton>
      {algunDescartado
        ? <Boton variante="secundario" ancho="total" icono="reintentar" onClick={onRestaurar}>{t("escritorio.restaurar")}</Boton>
        : <Boton variante="secundario" ancho="total" icono="ojoCerrado" onClick={onDescartar}>{t("escritorio.descartar")}</Boton>}
      <Boton variante="fantasma" ancho="total" icono="borrar" onClick={onBorrar}>{t("comun.borrar")}</Boton>
      <p style={{ ...texto("pie"), color: paleta.dim, margin: 0 }}>{t("escritorio.descartarPista")}</p>
    </div>
  );
}
