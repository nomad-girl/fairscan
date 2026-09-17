/**
 * El pedido (decisión 4 del 16/09, idea de Nati): el catálogo es feria y el pedido es
 * casa. Un pedido por proveedor; cantidades, unidades, CBM y dólares calculados acá,
 * en un solo lugar, para que la pantalla del teléfono, la de computadora y el Excel
 * digan lo mismo.
 *
 * Reglas:
 * - La cantidad es en BULTOS si el producto tiene "piezas por caja"; si no, es en UNIDADES.
 * - CBM solo se calcula si hay piezas por caja y CBM por caja. Lo que no tiene, no rompe
 *   la suma: se suma lo que se puede y se dice cuántos quedaron afuera.
 * - Un contenedor de 20 pies son ~28 CBM útiles; el de 40, ~58; el 40 HQ, ~68.
 */

export const CBM_CONTENEDOR = { "20": 28, "40": 58, "40HQ": 68 };

/** Número tolerante: "0,85" → 0.85; vacío o basura → null. */
export function numero(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/** Las cuentas de una línea del pedido. */
export function lineaDePedido(producto, cantidad) {
  const cant = Math.max(0, Math.round(numero(cantidad) || 0));
  const piezas = numero(producto?.piezasPorCaja);
  const cbmCaja = numero(producto?.cbmPorCaja);
  const precio = numero(producto?.price);
  const porCaja = piezas != null && piezas > 0;
  const unidades = porCaja ? cant * piezas : cant;
  const bultos = porCaja ? cant : null;
  const cbm = porCaja && cbmCaja != null && cbmCaja > 0 ? cant * cbmCaja : null;
  const total = precio != null ? unidades * precio : null;
  return { cantidad: cant, porCaja, piezas: porCaja ? piezas : null, bultos, unidades, cbm, total, precio };
}

/** Las cuentas de todo un pedido. Devuelve las líneas con su producto y los totales. */
export function totalesDePedido(pedido, productos = []) {
  const lineas = [];
  let bultos = 0, unidades = 0, cbm = 0, total = 0, sinCbm = 0, sinPrecio = 0;
  for (const item of pedido?.items || []) {
    const producto = productos.find(p => p.id === item.productId);
    if (!producto) continue;
    const linea = lineaDePedido(producto, item.cantidad);
    if (linea.cantidad <= 0) continue;
    lineas.push({ ...linea, producto });
    if (linea.bultos != null) bultos += linea.bultos;
    unidades += linea.unidades;
    if (linea.cbm != null) cbm += linea.cbm; else sinCbm++;
    if (linea.total != null) total += linea.total; else sinPrecio++;
  }
  return { lineas, bultos, unidades, cbm, total, sinCbm, sinPrecio, vacio: lineas.length === 0 };
}

/** Qué parte de un contenedor ocupa este CBM (0–100+, redondeado). */
export function porcentajeDeContenedor(cbm, pies = "20") {
  const capacidad = CBM_CONTENEDOR[pies] || CBM_CONTENEDOR["20"];
  if (!cbm || cbm <= 0) return 0;
  return Math.round((cbm / capacidad) * 100);
}

/** Totales de toda una feria: la suma de los pedidos de sus proveedores. */
export function totalesDeFeria(pedidos = [], productos = []) {
  let bultos = 0, unidades = 0, cbm = 0, total = 0, conContenido = 0;
  for (const pedido of pedidos) {
    const t = totalesDePedido(pedido, productos);
    if (t.vacio) continue;
    conContenido++;
    bultos += t.bultos; unidades += t.unidades; cbm += t.cbm; total += t.total;
  }
  return { bultos, unidades, cbm, total, pedidos: conContenido, porcentajeContenedor: porcentajeDeContenedor(cbm) };
}

/** El pedido vigente con un proveedor: primero el que está en curso, si no el último. */
export function pedidoDeProveedor(pedidos = [], supplierId) {
  const suyos = pedidos.filter(p => p.supplierId === supplierId);
  if (!suyos.length) return null;
  return suyos.find(p => p.estado !== "enviado") || [...suyos].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0];
}

/** Los productos de un proveedor en el orden del pedido: favoritos primero, después por captura. */
export function productosParaPedido(productos = [], supplierId, primero = null) {
  return productos
    .filter(p => p.supplierId === supplierId)
    .sort((a, b) => {
      if (a.id === primero) return -1;
      if (b.id === primero) return 1;
      if (!!b.favorito !== !!a.favorito) return b.favorito ? 1 : -1;
      return (a.createdAt || 0) - (b.createdAt || 0);
    });
}

export function cantidadDe(pedido, productId) {
  return pedido?.items?.find(i => i.productId === productId)?.cantidad || 0;
}

/** Los ítems con la cantidad de un producto cambiada (0 lo saca). */
export function conCantidad(items = [], productId, cantidad) {
  const cant = Math.max(0, Math.round(numero(cantidad) || 0));
  const sin = items.filter(i => i.productId !== productId);
  return cant > 0 ? [...sin, { productId, cantidad: cant }] : sin;
}

/** El pedido nuevo, vacío, para un proveedor. */
export function pedidoNuevo(supplier, districtId = null) {
  const ahora = Date.now();
  return { supplierId: supplier.id, districtId: supplier.districtId ?? districtId ?? null, estado: "en_curso", comentarios: "", items: [], enviadoEl: null, createdAt: ahora, updatedAt: ahora };
}

/** Los proveedores de una feria que tienen favoritos y todavía no tienen pedido. */
export function proveedoresSinPedido(suppliers = [], productos = [], pedidos = [], districtId = null) {
  const conPedido = new Set(pedidos.map(p => p.supplierId));
  return suppliers
    .filter(s => (districtId == null || s.districtId === districtId) && !conPedido.has(s.id))
    .map(s => ({ proveedor: s, favoritos: productos.filter(p => p.supplierId === s.id && p.favorito).length, productos: productos.filter(p => p.supplierId === s.id).length }))
    .filter(x => x.favoritos > 0 || x.proveedor.favorito)
    .sort((a, b) => b.favoritos - a.favoritos);
}

/**
 * La proforma como texto plano, para WhatsApp, WeChat o mail. Sin fotos: es lo que
 * el proveedor lee en el teléfono. `f` son los formateadores del idioma.
 */
export function textoProforma({ pedido, proveedor, productos, moneda = "USD", feria = null, f, t }) {
  const tot = totalesDePedido(pedido, productos);
  const lineas = [];
  lineas.push(`${t("pedido.proformaTitulo")} · ${proveedor?.company || ""}`.trim());
  if (proveedor?.contact) lineas.push(`${t("pedido.atencion")}: ${proveedor.contact}`);
  if (feria?.name) lineas.push(feria.name);
  lineas.push("");
  tot.lineas.forEach((l, i) => {
    const cant = l.porCaja ? `${f.numero(l.bultos)} ${t("pedido.bultosCorto")} × ${f.numero(l.piezas)} = ${f.numero(l.unidades)} ${t("pedido.unidadesCorto")}` : `${f.numero(l.unidades)} ${t("pedido.unidadesCorto")}`;
    const precio = l.precio != null ? ` · ${moneda} ${f.numero(l.precio, { maximumFractionDigits: 2 })}/u` : "";
    const total = l.total != null ? ` · ${moneda} ${f.numero(l.total, { maximumFractionDigits: 2 })}` : "";
    lineas.push(`${i + 1}. ${l.producto.name || t("pedido.sinNombre")} — ${cant}${precio}${total}`);
  });
  lineas.push("");
  lineas.push(`${t("pedido.unidades")}: ${f.numero(tot.unidades)}`);
  if (tot.bultos) lineas.push(`${t("pedido.bultos")}: ${f.numero(tot.bultos)}`);
  if (tot.cbm) lineas.push(`CBM: ${f.numero(tot.cbm, { maximumFractionDigits: 3 })}${tot.sinCbm ? ` (${t("pedido.sinCbmEnLineas", { count: tot.sinCbm })})` : ""}`);
  lineas.push(`${t("pedido.total")}: ${moneda} ${f.numero(tot.total, { maximumFractionDigits: 2 })}`);
  if (pedido?.comentarios) { lineas.push(""); lineas.push(pedido.comentarios); }
  return lineas.join("\n");
}

/** Nombre de archivo seguro para la proforma. */
export function nombreDeArchivo(proveedor, fecha = new Date(), extension = "xlsx") {
  const empresa = String(proveedor?.company || "proveedor").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "proveedor";
  return `Proforma_${empresa}_${fecha.toISOString().slice(0, 10)}.${extension}`;
}
