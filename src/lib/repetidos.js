/**
 * Repetidos probables del día (propuesta #15; decisión 3 del 16/09): dos fotos del mismo
 * stand con menos de dos minutos de diferencia y nombre o rubro parecidos. Nunca se borra
 * nada solo: "Revisar el día" los muestra de a pares y pregunta. Juntar deja un solo
 * producto con las fotos de los dos, y se puede deshacer desde el aviso.
 */
export const VENTANA_MS = 2 * 60 * 1000;

function palabras(texto) {
  return new Set(String(texto || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").split(/[^a-z0-9]+/).filter(w => w.length >= 3));
}

/** ¿Los nombres se parecen (o, si no alcanzan, el rubro es el mismo)? */
export function parecidos(a, b) {
  const pa = palabras(a?.name), pb = palabras(b?.name);
  if (pa.size && pb.size) {
    let comunes = 0;
    for (const w of pa) if (pb.has(w)) comunes++;
    const jaccard = comunes / (pa.size + pb.size - comunes);
    if (jaccard >= 0.5) return true;
    if (jaccard === 0) return false;
  }
  return !!(a?.category && b?.category && a.category === b.category);
}

/** Los pares probables, cada producto en un solo par, del más viejo al más nuevo. */
export function paresRepetidos(productos = []) {
  const lista = productos
    .filter(p => p.name || p.ai_processed !== false) // lo que la IA todavía no nombró no se compara
    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  const usados = new Set();
  const pares = [];
  for (let i = 0; i < lista.length; i++) {
    const a = lista[i];
    if (usados.has(a.id)) continue;
    for (let j = i + 1; j < lista.length; j++) {
      const b = lista[j];
      if (usados.has(b.id)) continue;
      const diferencia = (b.createdAt || 0) - (a.createdAt || 0);
      if (diferencia > VENTANA_MS) break;
      if ((a.supplierId ?? null) !== (b.supplierId ?? null)) continue;
      if (!parecidos(a, b)) continue;
      pares.push({ a, b, minutos: Math.round(diferencia / 60000) });
      usados.add(a.id); usados.add(b.id);
      break;
    }
  }
  return pares;
}

const sinRepetir = (arr) => arr.filter((x, i) => x && arr.indexOf(x) === i);

/** Juntar: queda `conservar` con las fotos de los dos y lo que le faltaba; `borrar` se va. */
export function juntar(conservar, borrar) {
  const cambios = { photos: sinRepetir([...(conservar.photos || []), ...(borrar.photos || [])]) };
  const urls = sinRepetir([...(conservar.photoUrls || []), ...(borrar.photoUrls || [])]);
  if (urls.length) cambios.photoUrls = urls;
  for (const k of ["name", "price", "moq", "moqBase", "piezasPorCaja", "cbmPorCaja", "category", "supplierId", "supplierCompany"]) {
    const vacio = conservar[k] == null || conservar[k] === "";
    if (vacio && borrar[k] != null && borrar[k] !== "") cambios[k] = borrar[k];
  }
  if (borrar.favorito && !conservar.favorito) cambios.favorito = 1;
  if (borrar.notes && borrar.notes !== conservar.notes) cambios.notes = [conservar.notes, borrar.notes].filter(Boolean).join("\n");
  const material = [...new Set([...(conservar.material || []), ...(borrar.material || [])])];
  if (material.length > (conservar.material || []).length) cambios.material = material;
  return { conservarId: conservar.id, borrarId: borrar.id, cambios };
}
