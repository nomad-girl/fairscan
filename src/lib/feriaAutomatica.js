/**
 * La feria que la app crea sola al abrir en un teléfono limpio (4.1).
 *
 * Lo que pasó (10/09/2026): al entrar con su cuenta en un teléfono limpio, la app
 * creaba "Feria 10 de sept de 2026", la dejaba activa y la subía al equipo. El
 * catálogo filtra por feria activa, así que la usuaria veía "Empezá a escanear"
 * con 495 productos ya bajados, y el equipo quedó con tres ferias fantasma.
 *
 * Reglas:
 *  · La feria automática se marca `autoCreada: 1` y no sube a la nube hasta que
 *    tenga un producto o un proveedor (ahí se sube primero que ellos, por la
 *    clave foránea).
 *  · Si aparecen ferias reales (sincronización) y la automática sigue vacía, se
 *    descarta y la activa pasa a la feria con el producto más reciente.
 *  · Si la activa apunta a una feria que ya no existe, se elige igual.
 */

/** ¿Esta feria automática todavía no tiene nada adentro? */
export function feriaAutomaticaVacia(feria, { products = [], suppliers = [] } = {}) {
  if (!feria?.autoCreada) return false;
  return !products.some(p => p.districtId === feria.id) && !suppliers.some(s => s.districtId === feria.id);
}

/** La feria con el producto más nuevo; si no hay productos, la actualizada más recientemente. */
export function feriaMasReciente(districts, products = []) {
  if (!districts.length) return null;
  const ultimo = new Map();
  for (const p of products) {
    const t = p.createdAt || p.updatedAt || 0;
    if (p.districtId != null && t > (ultimo.get(p.districtId) || 0)) ultimo.set(p.districtId, t);
  }
  return [...districts].sort((a, b) =>
    (ultimo.get(b.id) || 0) - (ultimo.get(a.id) || 0) || (b.updatedAt || 0) - (a.updatedAt || 0)
  )[0];
}

/**
 * Qué hacer con la feria activa después de cargar la base.
 * @returns {{ borrarId?: number, activarId?: number } | null} null = no tocar nada
 */
export function decidirFeriaActiva({ districts, products = [], suppliers = [], activeDistrictId }) {
  const activa = districts.find(d => d.id === activeDistrictId) || null;
  if (activa && !feriaAutomaticaVacia(activa, { products, suppliers })) return null;
  const otras = districts.filter(d => d.id !== activeDistrictId);
  if (activa && !otras.length) return null;           // la automática es la única: se queda
  if (!activa && !districts.length) return null;       // no hay nada que elegir
  const elegida = feriaMasReciente(otras.length ? otras : districts, products);
  if (!elegida) return null;
  const r = { activarId: elegida.id };
  if (activa) r.borrarId = activa.id;                   // automática vacía y hay reales: se descarta
  return r;
}
