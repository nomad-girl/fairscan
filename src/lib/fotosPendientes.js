/**
 * Qué fotos todavía no llegaron a la nube.
 *
 * La regla de esta app: la copia local es la verdad y la nube es el respaldo.
 * Una foto capturada sin señal existe solo en ese teléfono hasta que sube; esto
 * dice cuáles faltan, para que un proceso de fondo las suba solas cuando vuelva
 * la señal (N9 / decisión 8). Antes, si fallaba la subida del momento, el
 * reintento quedaba escondido en un botón de la pantalla de export.
 */

/** Una foto guardada en el teléfono (data URL o base64 pelado), no una dirección web. */
export function esFotoLocal(x) {
  if (!x || typeof x !== 'string') return false;
  if (x.startsWith('http://') || x.startsWith('https://')) return false;
  return x.startsWith('data:') || x.length > 200;
}

/** Índices de las fotos de un producto que están en el teléfono y no en la nube. */
export function fotosSinSubir(producto) {
  const fotos = producto?.photos || [];
  const urls = producto?.photoUrls || [];
  const out = [];
  for (let i = 0; i < fotos.length; i++) {
    if (esFotoLocal(fotos[i]) && !urls[i]) out.push(i);
  }
  return out;
}

/** ¿La tarjeta del proveedor está solo en el teléfono? */
export function tarjetaSinSubir(proveedor) {
  return esFotoLocal(proveedor?.cardPhoto) && !proveedor?.cardPhotoUrl;
}

/**
 * Espera antes de volver a intentar, según cuántas veces falló: 5 s, 10 s, 20 s…
 * con techo de 5 minutos. Nunca se rinde: la foto tiene que llegar.
 */
export function esperaReintento(fallos) {
  const base = 5000;
  return Math.min(5 * 60 * 1000, base * Math.pow(2, Math.max(0, fallos)));
}
