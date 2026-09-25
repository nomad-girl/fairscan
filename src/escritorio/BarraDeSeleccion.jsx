/**
 * La barra flotante de la selección múltiple (tanda A, pieza 2; decisión 1 de Nati: abajo, centrada).
 * Aparece apenas hay un elegido, dice cuántos son y ofrece las acciones en masa.
 */
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSistema } from "../sistema/SistemaProvider.jsx";
import { Icono } from "../componentes/index.js";

export function BarraDeSeleccion({ cantidad, todosFavoritos = false, algunDescartado = false, proveedores = [], categorias = [], onFavorito, onProveedor, onCategoria, onAgregarAlPedido, onDescartar, onRestaurar, onBorrar, onCerrar }) {
  const { t } = useTranslation();
  const { paleta, radios } = useSistema();
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false);
  const [categoria, setCategoria] = useState("");
  if (!cantidad) return null;

  const boton = (texto, onClick, { icono, peligro = false, titulo, etiqueta } = {}) => (
    <button type="button" onClick={onClick} title={titulo || texto} aria-label={etiqueta || texto} style={{ display: "inline-flex", alignItems: "center", gap: 6, minHeight: 32, padding: "0 10px", borderRadius: 999, border: "none", background: peligro ? "rgba(239,68,68,0.22)" : "rgba(255,255,255,0.12)", color: "#fff", fontFamily: "inherit", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
      {icono && <Icono nombre={icono} tamano={14} color="#fff" />}{texto}
    </button>
  );
  const select = { minHeight: 32, borderRadius: 999, border: "none", background: "rgba(255,255,255,0.12)", color: "#fff", fontFamily: "inherit", fontSize: 13, fontWeight: 600, padding: "0 10px", maxWidth: 190, cursor: "pointer" };

  return (
    <div role="toolbar" aria-label={t("escritorio.elegidos", { count: cantidad })} onClick={e => e.stopPropagation()}
      style={{ position: "absolute", left: "50%", bottom: 18, transform: "translateX(-50%)", zIndex: 8, display: "flex", alignItems: "center", gap: 8, padding: "8px 10px 8px 14px", borderRadius: 999, background: "#0F172A", color: "#fff", boxShadow: "0 10px 30px rgba(0,0,0,0.35)", maxWidth: "calc(100% - 32px)", flexWrap: "wrap", justifyContent: "center" }}>
      <span style={{ fontSize: 13, fontWeight: 700 }}><span style={{ background: paleta.accent, borderRadius: 999, padding: "1px 8px", marginRight: 6 }}>{cantidad}</span>{t("escritorio.elegidosSolo", { count: cantidad })}</span>
      {!confirmandoBorrado ? (
        <>
          {boton(todosFavoritos ? t("escritorio.quitarFavorito") : t("escritorio.favorito"), onFavorito, { icono: "favorito" })}
          <select aria-label={t("escritorio.asignarProveedor")} value="" onChange={e => { if (e.target.value !== "") onProveedor?.(e.target.value === "ninguno" ? null : Number(e.target.value)); e.target.value = ""; }} style={select}>
            <option value="">{t("escritorio.asignarProveedor")}</option>
            <option value="ninguno">{t("escritorio.sinProveedor")}</option>
            {proveedores.map(s => <option key={s.id} value={s.id}>{s.company || `#${s.id}`}</option>)}
          </select>
          <form onSubmit={e => { e.preventDefault(); if (categoria.trim()) { onCategoria?.(categoria.trim()); setCategoria(""); } }} style={{ display: "inline-flex" }}>
            <input list="fs-categorias" value={categoria} onChange={e => setCategoria(e.target.value)} placeholder={t("escritorio.asignarCategoria")} aria-label={t("escritorio.asignarCategoria")}
              style={{ ...select, cursor: "text", width: 150, background: "rgba(255,255,255,0.12)", outline: "none" }} />
            <datalist id="fs-categorias">{categorias.map(c => <option key={c} value={c} />)}</datalist>
          </form>
          {boton(t("escritorio.agregarAlPedido"), onAgregarAlPedido, { icono: "pedido" })}
          {algunDescartado ? boton(t("escritorio.restaurar"), onRestaurar, { icono: "reintentar" }) : boton(t("escritorio.descartar"), onDescartar, { icono: "ojoCerrado", titulo: t("escritorio.descartarPista"), etiqueta: t("escritorio.descartar") })}
          {boton(t("comun.borrar"), () => setConfirmandoBorrado(true), { icono: "borrar", peligro: true })}
        </>
      ) : (
        <>
          <span style={{ fontSize: 13 }}>{t("escritorio.borrarVariosSeguro", { count: cantidad })}</span>
          {boton(t("escritorio.siBorrar"), () => { setConfirmandoBorrado(false); onBorrar?.(); }, { peligro: true })}
          {boton(t("comun.cancelar"), () => setConfirmandoBorrado(false))}
        </>
      )}
      <button type="button" onClick={onCerrar} aria-label={t("escritorio.deseleccionar")} title={`${t("escritorio.deseleccionar")} · esc`} style={{ width: 32, height: 32, borderRadius: 16, border: "none", background: "transparent", display: "grid", placeItems: "center", cursor: "pointer" }}>
        <Icono nombre="cerrar" tamano={16} color="#fff" />
      </button>
    </div>
  );
}
