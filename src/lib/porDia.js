import i18next from 'i18next';
/**
 * El catálogo como diario de viaje (piezas 7.1 y 7.2).
 *
 * Durante una feria la unidad mental es el día ("lo de esta mañana"), no la
 * feria ni el proveedor. Esto agrupa los productos por día de captura, etiqueta
 * los días como los diría una persona (Hoy, Ayer, mar 9 sep) y arma el resumen
 * del día: cuántos proveedores, cuántos productos, precio promedio, cuántos sin
 * precio. Sin React: se testea solo.
 */

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

/** 'AAAA-MM-DD' en hora local. */
export function claveDia(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function etiquetaDia(clave, ahora = Date.now()) {
  // 28/10: las etiquetas siguen al idioma de la app (en inglés salían "HOY" y "JUE 30 ABR")
  const idioma = idiomaActual();
  if (clave === claveDia(ahora)) return traducir('catalogo.hoy', 'Hoy');
  if (clave === claveDia(ahora - 86400000)) return traducir('catalogo.ayer', 'Ayer');
  const [y, m, d] = clave.split('-').map(Number);
  const f = new Date(y, m - 1, d);
  const mismoAnio = f.getFullYear() === new Date(ahora).getFullYear();
  if (idioma.startsWith('es') || !idioma) return `${DIAS[f.getDay()]} ${d} ${MESES[m - 1]}${mismoAnio ? '' : ` ${y}`}`;
  try {
    const dia = new Intl.DateTimeFormat(idioma, { weekday: 'short' }).format(f).replace('.', '').toUpperCase();
    const mes = new Intl.DateTimeFormat(idioma, { month: 'short' }).format(f).replace('.', '').toUpperCase();
    return `${dia} ${d} ${mes}${mismoAnio ? '' : ` ${y}`}`;
  } catch { return `${DIAS[f.getDay()]} ${d} ${MESES[m - 1]}${mismoAnio ? '' : ` ${y}`}`; }
}
function idiomaActual() { try { return (i18next.language || '').toLowerCase(); } catch { return ''; } }
function traducir(clave, porDefecto) { try { const v = i18next.t(clave); return v && v !== clave ? v : porDefecto; } catch { return porDefecto; } }

/** Grupos por día, del más nuevo al más viejo, respetando el orden de entrada dentro del día. */
export function agruparPorDia(productos, ahora = Date.now()) {
  const map = new Map();
  for (const p of productos || []) {
    const k = claveDia(p.createdAt || 0);
    if (!map.has(k)) map.set(k, { clave: k, etiqueta: etiquetaDia(k, ahora), productos: [] });
    map.get(k).productos.push(p);
  }
  return [...map.values()].sort((a, b) => (a.clave < b.clave ? 1 : -1));
}

/** La lista lista para dibujar: encabezados de día intercalados con los productos. */
export function conEncabezadosDeDia(productos, ahora = Date.now()) {
  const out = [];
  for (const g of agruparPorDia(productos, ahora)) {
    out.push({ tipo: 'dia', clave: g.clave, etiqueta: g.etiqueta, n: g.productos.length });
    for (const p of g.productos) out.push({ tipo: 'producto', p });
  }
  return out;
}

export function soloDeHoy(productos, ahora = Date.now()) {
  const hoy = claveDia(ahora);
  return (productos || []).filter(p => claveDia(p.createdAt || 0) === hoy);
}

/** Resumen del día (7.2): lo que se hizo hoy, en una línea. */
export function resumenDelDia(productos, ahora = Date.now()) {
  const hoy = soloDeHoy(productos, ahora);
  const proveedores = new Set(hoy.map(p => p.supplierId || (p.supplierCompany ? `n:${p.supplierCompany}` : null)).filter(Boolean));
  const precios = hoy.map(p => parseFloat(p.price)).filter(n => !isNaN(n));
  const promedio = precios.length ? precios.reduce((a, b) => a + b, 0) / precios.length : null;
  return {
    productos: hoy.length,
    proveedores: proveedores.size,
    sinPrecio: hoy.length - precios.length,
    promedioUsd: promedio === null ? null : Math.round(promedio * 100) / 100,
    fotos: hoy.reduce((n, p) => n + (p.photos?.length || 0), 0),
  };
}
