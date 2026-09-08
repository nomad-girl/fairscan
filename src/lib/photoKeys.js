/**
 * Nombres con los que se guardan las fotos en la nube (R2).
 *
 * Hasta ahora esto estaba escrito a mano en ocho lugares distintos, con dos
 * convenciones que no coincidían (`photos/...` y `products/...`, una contaba
 * desde 1 y la otra desde 0). No rompía nada, pero cualquier limpieza futura del
 * bucket tenía que adivinar los dos esquemas. Ahora hay un solo lugar.
 *
 * ⚠️ La pieza 2.7 va a reemplazar el esquema entero por nombres inadivinables y
 * separados por usuario. Cuando llegue, se cambia acá y en ningún otro lado.
 */

import { slugify } from './slugify.js';

/**
 * Foto de producto. `index` empieza en 0 (como en un array); el nombre queda
 * numerado desde 1, que es como estaban la mayoría de las fotos ya subidas.
 */
export function productPhotoKey(supplierName, productId, index) {
  return `photos/${slugify(supplierName || 'product')}/${productId}_${index + 1}.jpg`;
}

/** Tarjeta de un proveedor. */
export function cardPhotoKey(supplierName, supplierId) {
  return `cards/${slugify(supplierName || 'card')}_${supplierId}.jpg`;
}
