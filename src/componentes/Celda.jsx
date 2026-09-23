/**
 * Celda editable de una tabla (escritorio, 23/09): muestra el valor; con un clic se escribe ahí
 * mismo; guarda al salir o con Enter, Escape cancela, y se pone verde un segundo al guardar.
 * Es la regla de "editar en el lugar" de las hojas del teléfono, llevada a una celda.
 */
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSistema } from "../sistema/SistemaProvider.jsx";

const vacio = (x) => x === null || x === undefined || String(x).trim() === "";

/** Convierte lo escrito al tipo que guarda cada campo del producto. */
export function valorDeCelda(campo, texto) {
  const limpio = String(texto ?? "").trim();
  if (limpio === "") return campo === "name" ? undefined : null;
  if (campo === "price" || campo === "moq") return limpio.replace(",", ".");
  if (campo === "piezasPorCaja" || campo === "cbmPorCaja") { const n = Number(limpio.replace(",", ".")); return isNaN(n) ? null : n; }
  return limpio;
}

export function Celda({ id, campo, etiqueta, nombre = "", valor, mostrar, numerico = false, alineado = "left", onGuardar, estilo }) {
  const { t } = useTranslation();
  const { paleta, radios } = useSistema();
  const [editando, setEditando] = useState(false);
  const [borrador, setBorrador] = useState(valor ?? "");
  const [guardado, setGuardado] = useState(false);
  const ref = useRef(null);
  useEffect(() => { if (!editando) setBorrador(valor ?? ""); }, [valor, editando]);
  useEffect(() => { if (editando) { ref.current?.focus(); ref.current?.select(); } }, [editando]);
  useEffect(() => { if (!guardado) return; const k = setTimeout(() => setGuardado(false), 1200); return () => clearTimeout(k); }, [guardado]);

  const confirmar = () => {
    setEditando(false);
    const nuevo = valorDeCelda(campo, borrador);
    if (nuevo === undefined) return;
    if (String(nuevo ?? "") !== String(valor ?? "")) { onGuardar?.(id, { [campo]: nuevo }); setGuardado(true); }
  };
  const etiquetaAccesible = t("escritorio.editarCelda", { campo: etiqueta, producto: nombre || t("catalogo.procesandoNombre") });

  if (editando) {
    return (
      <input ref={ref} type="text" inputMode={numerico ? "decimal" : "text"} value={borrador} aria-label={etiquetaAccesible}
        onChange={e => setBorrador(e.target.value)} onBlur={confirmar} onClick={e => e.stopPropagation()}
        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); confirmar(); } if (e.key === "Escape") { setBorrador(valor ?? ""); setEditando(false); } e.stopPropagation(); }}
        style={{ width: "100%", minWidth: 0, height: 30, borderRadius: radios.chico, border: `1px solid ${paleta.accent}`, background: paleta.surface, color: paleta.text, fontFamily: "inherit", fontSize: 13, padding: "0 6px", textAlign: alineado, outline: "none", fontVariantNumeric: "tabular-nums", ...estilo }} />
    );
  }
  return (
    <button type="button" onClick={e => { e.stopPropagation(); setEditando(true); }} aria-label={etiquetaAccesible} title={etiqueta}
      onMouseEnter={e => { e.currentTarget.style.borderColor = paleta.border; }} onMouseLeave={e => { e.currentTarget.style.borderColor = "transparent"; }}
      style={{ width: "100%", minWidth: 0, height: 30, borderRadius: radios.chico, border: "1px solid transparent", background: guardado ? paleta.greenSoft : "transparent", color: vacio(valor) ? paleta.dim : paleta.text, fontFamily: "inherit", fontSize: 13, fontWeight: vacio(valor) ? 400 : 600, padding: "0 6px", textAlign: alineado, cursor: "text", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums", transition: "background 250ms ease", ...estilo }}>
      {vacio(valor) ? "—" : (mostrar ?? valor)}
    </button>
  );
}
