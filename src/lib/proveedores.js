/**
 * Un proveedor "vacío" no tiene nombre, ni tarjeta, ni productos: quedó de una captura que no terminó
 * (la tarjeta no se leyó y nunca se completó). En el catálogo y en el feed se esconde; no se borra:
 * los datos del cliente valen oro y puede volver a aparecer si le llega un producto o un nombre.
 */
export function proveedorVacio(s, products = []) {
  if (!s) return true;
  if (s.company || s.cardPhoto || s.cardPhotoUrl || s.contact) return false;
  return !products.some(p => p.supplierId === s.id);
}
