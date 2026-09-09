/**
 * La pestaña "🏭 Proveedores".
 *
 * Antes se armaba agrupando los productos por proveedor: un proveedor sin
 * productos no generaba grupo y por lo tanto no existía en la pantalla (N4 de la
 * auditoría). Eso choca de frente con el modelo: las tarjetas de proveedor son
 * gratis e ilimitadas, así que cargar una tarjeta sola tiene que dejar rastro.
 *
 * Ahora se arma al revés: la lista de proveedores es la base, y a cada uno se le
 * cuelgan sus productos. Los productos que quedaron con solo un nombre de empresa
 * (sin vínculo) o sin nada forman grupos aparte, como antes.
 *
 * Orden: el más reciente arriba (la tarjeta que acabás de escanear aparece
 * primera, tenga productos o no); "Sin proveedor" siempre al final.
 */

/**
 * @param {object} args
 * @param {Array} args.suppliers   proveedores ya acotados a la feria que se está mirando
 * @param {Array} args.products    productos ya filtrados (feria, búsqueda, categoría…)
 * @param {string} [args.search]   texto de búsqueda; con búsqueda activa, un proveedor
 *   sin productos solo aparece si la búsqueda le pega a su nombre o contacto
 * @param {boolean} [args.filtersActive]  hay filtros (categoría, precio…) que no aplican
 *   a proveedores; con filtros activos, los proveedores sin productos se ocultan para
 *   no mostrar una lista de tarjetas vacías cuando se está buscando un producto
 */
export function groupBySupplier({ suppliers, products, search = "", filtersActive = false }) {
  const map = new Map();
  const words = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const matchesSupplier = (s) => {
    if (!words.length) return true;
    // 7.3: buscar también por teléfono, WeChat, WhatsApp y mail del proveedor
    const hay = [s.company, s.contact, s.notes, s.phone, s.wechat, s.whatsapp, s.email].filter(Boolean).join(" ").toLowerCase();
    return words.every(w => hay.includes(w));
  };

  for (const s of suppliers) {
    map.set(s.id, { supplier: s, districtId: s.districtId, products: [], key: `id:${s.id}` });
  }

  for (const p of products) {
    let key;
    if (p.supplierId != null && map.has(p.supplierId)) {
      key = p.supplierId;
    } else if (p.supplierId != null) {
      // Vinculado a un proveedor que no está en este recorte (otra feria): igual se muestra.
      key = p.supplierId;
      map.set(key, { supplier: null, districtId: p.districtId, products: [], key: `id:${key}`, _orphanId: p.supplierId });
    } else if (p.supplierCompany) {
      key = `name:${p.supplierCompany}`;
      if (!map.has(key)) map.set(key, { supplier: { company: p.supplierCompany, _unlinked: true }, districtId: p.districtId, products: [], key });
    } else {
      key = "unknown";
      if (!map.has(key)) map.set(key, { supplier: null, districtId: p.districtId, products: [], key });
    }
    map.get(key).products.push(p);
  }

  const groups = [...map.values()].filter(g => {
    if (g.products.length > 0) return true;
    if (!g.supplier || g.supplier._unlinked) return false;
    if (filtersActive) return false;
    return matchesSupplier(g.supplier);
  });

  const time = (g) => g.supplier?.createdAt || Math.max(0, ...g.products.map(p => p.createdAt || 0));
  return groups.sort((a, b) => {
    if (!a.supplier && b.supplier) return 1;
    if (a.supplier && !b.supplier) return -1;
    return time(b) - time(a);
  });
}
