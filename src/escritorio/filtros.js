/**
 * Filtros, orden y columnas del escritorio (tanda A, 25/09/2026). Lógica pura, sin React:
 * se testea sola y la usan la grilla, la tabla, las vistas guardadas y la paleta.
 *
 * filtros = {
 *   proveedor: [ids], categoria: ["Deco", …], precio: { min, max }, moq: { min, max },
 *   fotos: "con" | "sin" | "varias", capturado: "hoy" | "semana" | { desde, hasta },
 *   favorito: true, sinProveedor: true, sinPrecio: true, conPrecio: true, conProveedor: true,
 *   descartado: "solo" | "todos"      // sin la clave: los descartados no se ven (regla de "Descartar")
 * }
 */
import { palabrasDeBusqueda, coincideBusqueda } from "../lib/busqueda.js";
import { soloDeHoy } from "../lib/porDia.js";

export const CLAVES_FILTRO = ["proveedor", "categoria", "precio", "moq", "fotos", "capturado", "favorito", "descartado", "sinProveedor", "sinPrecio", "conPrecio", "conProveedor"];

const num = (v) => { const n = parseFloat(String(v ?? "").replace(",", ".")); return isNaN(n) ? null : n; };
export const tienePrecio = (p) => num(p.price) != null;

/** "< 2", "> 10", "<= 3.5": un rango de precio escrito en el buscador. */
export function precioDesdeConsulta(consulta) {
  const m = String(consulta || "").trim().match(/^([<>])=?\s*(\d+(?:[.,]\d+)?)$/);
  if (!m) return null;
  const n = num(m[2]);
  return m[1] === "<" ? { max: n } : { min: n };
}

export function aplicarFiltros(productos = [], filtros = {}, { consulta = "", suppliers = [], ahora = Date.now() } = {}) {
  let r = productos;
  // Descartados: fuera salvo que se pidan
  if (filtros.descartado === "solo") r = r.filter(p => p.descartado);
  else if (filtros.descartado !== "todos") r = r.filter(p => !p.descartado);

  const rangoConsulta = precioDesdeConsulta(consulta);
  const palabras = rangoConsulta ? [] : palabrasDeBusqueda(consulta);
  if (palabras.length) {
    const empresa = (p) => suppliers.find(s => s.id === p.supplierId)?.company || p.supplierCompany || "";
    r = r.filter(p => coincideBusqueda([p.name, p.category, empresa(p), p.notes, ...(p.material || [])], palabras));
  }
  const precio = rangoConsulta ? { ...(filtros.precio || {}), ...rangoConsulta } : filtros.precio;

  if (filtros.proveedor?.length) { const set = new Set(filtros.proveedor.map(Number)); r = r.filter(p => set.has(Number(p.supplierId))); }
  if (filtros.categoria?.length) { const set = new Set(filtros.categoria); r = r.filter(p => set.has(p.category)); }
  if (precio && (precio.min != null || precio.max != null)) r = r.filter(p => { const v = num(p.price); return v != null && (precio.min == null || v >= precio.min) && (precio.max == null || v <= precio.max); });
  if (filtros.moq && (filtros.moq.min != null || filtros.moq.max != null)) r = r.filter(p => { const v = num(p.moq); return v != null && (filtros.moq.min == null || v >= filtros.moq.min) && (filtros.moq.max == null || v <= filtros.moq.max); });
  if (filtros.fotos === "con") r = r.filter(p => (p.photos?.length || p.photoUrls?.length || 0) > 0);
  else if (filtros.fotos === "sin") r = r.filter(p => !(p.photos?.length || p.photoUrls?.length));
  else if (filtros.fotos === "varias") r = r.filter(p => (p.photos?.length || p.photoUrls?.length || 0) > 1);
  if (filtros.capturado === "hoy") r = soloDeHoy(r, ahora);
  else if (filtros.capturado === "semana") { const desde = ahora - 7 * 86400000; r = r.filter(p => (p.createdAt || 0) >= desde); }
  else if (filtros.capturado && typeof filtros.capturado === "object") { const { desde, hasta } = filtros.capturado; r = r.filter(p => (desde == null || (p.createdAt || 0) >= desde) && (hasta == null || (p.createdAt || 0) <= hasta)); }
  if (filtros.favorito) r = r.filter(p => p.favorito);
  if (filtros.sinProveedor) r = r.filter(p => !p.supplierId);
  if (filtros.conProveedor) r = r.filter(p => !!p.supplierId);
  if (filtros.sinPrecio) r = r.filter(p => !tienePrecio(p));
  if (filtros.conPrecio) r = r.filter(p => tienePrecio(p));
  return r;
}

/** Cuántos filtros hay puestos (para el contador y el botón "Quitar filtros"). */
export function cantidadDeFiltros(filtros = {}) {
  return CLAVES_FILTRO.filter(k => {
    const v = filtros[k];
    if (v == null || v === false) return false;
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === "object") return Object.values(v).some(x => x != null);
    return true;
  }).length;
}

// ── Orden ──
export const CAMPOS_ORDEN = ["createdAt", "name", "proveedor", "price", "moq", "piezasPorCaja", "cbmPorCaja", "category"];

export function valorDeOrden(p, campo, suppliers = []) {
  switch (campo) {
    case "proveedor": return (suppliers.find(s => s.id === p.supplierId)?.company || p.supplierCompany || "").toLowerCase() || null;
    case "name": return (p.name || "").toLowerCase() || null;
    case "category": return (p.category || "").toLowerCase() || null;
    case "price": return num(p.price);
    case "moq": return num(p.moq);
    case "piezasPorCaja": return num(p.piezasPorCaja);
    case "cbmPorCaja": return num(p.cbmPorCaja);
    case "createdAt": default: return p.createdAt || 0;
  }
}

/** Ordena; lo vacío va siempre al final, cualquiera sea el sentido (nota a de la pieza 1). */
export function ordenarProductos(productos = [], orden = { campo: "createdAt", dir: "desc" }, suppliers = []) {
  const { campo = "createdAt", dir = "desc" } = orden || {};
  const signo = dir === "asc" ? 1 : -1;
  return [...productos].sort((a, b) => {
    const va = valorDeOrden(a, campo, suppliers), vb = valorDeOrden(b, campo, suppliers);
    const vaVacio = va == null || va === "", vbVacio = vb == null || vb === "";
    if (vaVacio && vbVacio) return (b.createdAt || 0) - (a.createdAt || 0);
    if (vaVacio) return 1;
    if (vbVacio) return -1;
    if (typeof va === "string") return signo * va.localeCompare(vb, "es");
    return signo * (va - vb);
  });
}

// ── Columnas ──
/** Las que no se pueden apagar y quedan fijas a la izquierda. */
export const COLUMNAS_FIJAS = ["foto", "name"];
export const COLUMNAS_OPCIONALES = ["proveedor", "price", "moq", "piezasPorCaja", "cbmPorCaja", "category", "material", "createdAt", "notes"];
export const COLUMNAS_DEFAULT = ["proveedor", "price", "moq", "piezasPorCaja", "cbmPorCaja", "category", "createdAt"];

// ── Selección con Shift ──
/** Los ids entre el último tocado y este, en el orden de la lista visible. */
export function rangoEntre(lista, desdeId, hastaId) {
  const i = lista.findIndex(p => p.id === desdeId), j = lista.findIndex(p => p.id === hastaId);
  if (i < 0 || j < 0) return [hastaId];
  const [a, b] = i < j ? [i, j] : [j, i];
  return lista.slice(a, b + 1).map(p => p.id);
}
