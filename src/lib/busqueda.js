/**
 * Búsqueda tolerante (pedido de Lucas, 16/09/2026): las tildes, las mayúsculas
 * y los signos no cambian el resultado. "cafe" encuentra "Café", "azucar" a
 * "Azúcar", "senor" a "Señor". Cada palabra de la consulta tiene que aparecer
 * en alguna parte del texto, en cualquier orden.
 */

/** Deja el texto en minúsculas, sin acentos ni diéresis. La ñ se conserva como n para que "senor" y "señor" coincidan. */
export function normalizarBusqueda(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/** Las palabras de la consulta, ya normalizadas y sin vacíos. */
export function palabrasDeBusqueda(consulta) {
  return normalizarBusqueda(consulta).split(/\s+/).filter(Boolean);
}

/** true si todas las palabras de la consulta aparecen en el texto (que puede ser un string o una lista de campos). */
export function coincideBusqueda(texto, consulta) {
  const palabras = Array.isArray(consulta) ? consulta : palabrasDeBusqueda(consulta);
  if (palabras.length === 0) return true;
  const campos = Array.isArray(texto) ? texto : [texto];
  const pajar = normalizarBusqueda(campos.filter(Boolean).join(" "));
  return palabras.every(p => pajar.includes(p));
}
