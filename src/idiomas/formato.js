/**
 * Fechas, números y monedas según el idioma activo, con las funciones del
 * propio navegador (`Intl`). "16 de sept" en Argentina, "Sep 16" en inglés,
 * separador de miles según la región. Los precios de la usuaria siguen siendo
 * texto libre (decisión vigente); esto es para lo que la app calcula.
 */
import { i18next, IDIOMA_POR_DEFECTO } from "./index.js";

function idioma() {
  return i18next?.language || IDIOMA_POR_DEFECTO;
}

/** 1128 → "1.128" (es-AR) · "1,128" (en). */
export function numero(n, opciones = {}) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return "";
  return new Intl.NumberFormat(idioma(), { maximumFractionDigits: 2, ...opciones }).format(Number(n));
}

/** 408 → "USD 408" · 0.85 → "USD 0,85". Sin símbolo $ para no confundir con pesos. */
export function dolares(n, opciones = {}) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return "";
  const valor = Number(n);
  const decimales = Number.isInteger(valor) ? 0 : 2;
  return `USD ${new Intl.NumberFormat(idioma(), { minimumFractionDigits: decimales, maximumFractionDigits: 2, ...opciones }).format(valor)}`;
}

/** 1.26 → "1,26 CBM". */
export function cbm(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return "";
  return `${new Intl.NumberFormat(idioma(), { minimumFractionDigits: 2, maximumFractionDigits: 3 }).format(Number(n))} CBM`;
}

/** Fecha corta: "16 de sept" (es-AR) · "Sep 16" (en). */
export function fechaCorta(fecha) {
  const d = fecha instanceof Date ? fecha : new Date(fecha);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(idioma(), { day: "numeric", month: "short" }).format(d);
}

/** Fecha larga: "16 de septiembre de 2026". */
export function fechaLarga(fecha) {
  const d = fecha instanceof Date ? fecha : new Date(fecha);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(idioma(), { day: "numeric", month: "long", year: "numeric" }).format(d);
}

/** "hace 2 min", "hace 3 h", "ayer". */
export function haceCuanto(fecha, ahora = Date.now()) {
  const t = fecha instanceof Date ? fecha.getTime() : new Date(fecha).getTime();
  if (Number.isNaN(t)) return "";
  const rtf = new Intl.RelativeTimeFormat(idioma(), { numeric: "auto" });
  const seg = Math.round((t - ahora) / 1000);
  const abs = Math.abs(seg);
  if (abs < 60) return rtf.format(seg, "second");
  if (abs < 3600) return rtf.format(Math.round(seg / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(seg / 3600), "hour");
  return rtf.format(Math.round(seg / 86400), "day");
}
