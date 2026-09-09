/**
 * Miniaturas para las listas (pieza 3.1 / N6).
 *
 * La galería dibujaba cuadraditos de ~120 px usando las fotos de 800 px
 * completas, y las dibujaba todas: 1.100 productos son ~100 MB de imagen para
 * decodificar en cada scroll. Eso es "la paja al abrir".
 *
 * Cada producto guarda ahora una miniatura cuadrada de 200 px (~5 KB) junto a
 * su primera foto: se genera al capturar y, para los productos viejos, de a poco
 * en segundo plano. Las listas usan la miniatura; la ficha sigue usando la foto.
 *
 * Es un campo más del producto en la base local (`thumb`), no cambia el esquema
 * y no viaja a la nube (cada teléfono genera las suyas).
 */

import { esFotoLocal } from './fotosPendientes.js';

export const LADO_MINIATURA = 200;

/** Qué mostrar en una lista: la miniatura si existe; si no, la foto grande. */
export function elegirMiniatura(p) {
  return p?.thumb || p?.photos?.[0] || null;
}

/** ¿Le falta la miniatura y se puede generar en este teléfono (foto local)? */
export function necesitaMiniatura(p) {
  return !p?.thumb && esFotoLocal(p?.photos?.[0]);
}

/**
 * Genera una miniatura cuadrada (recorte centrado) a partir de una foto en
 * data URL. Solo en el navegador; en Node devuelve null.
 */
export async function miniaturaDe(src, lado = LADO_MINIATURA, calidad = 0.72) {
  if (!src || typeof document === 'undefined') return null;
  try {
    let img, w, h;
    if (typeof createImageBitmap === 'function') {
      const blob = await (await fetch(src)).blob();
      img = await createImageBitmap(blob);
    } else {
      img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
    }
    w = img.width; h = img.height;
    const s = Math.min(w, h);
    const c = document.createElement('canvas');
    c.width = lado; c.height = lado;
    c.getContext('2d').drawImage(img, (w - s) / 2, (h - s) / 2, s, s, 0, 0, lado, lado);
    img.close?.();
    return c.toDataURL('image/jpeg', calidad);
  } catch {
    return null;
  }
}

/**
 * Genera las miniaturas que faltan, de a pocas, cediendo el hilo entre tandas
 * para no trabar la interfaz. `guardar(id, thumb)` la persiste; `onProgreso`
 * avisa cuántas van. Devuelve cuántas generó.
 */
export async function generarMiniaturasFaltantes(productos, guardar, { tanda = 4, pausaMs = 60, onProgreso } = {}) {
  const faltan = (productos || []).filter(necesitaMiniatura);
  let hechas = 0;
  for (let i = 0; i < faltan.length; i += tanda) {
    const grupo = faltan.slice(i, i + tanda);
    await Promise.all(grupo.map(async (p) => {
      const thumb = await miniaturaDe(p.photos[0]);
      if (thumb) { await guardar(p.id, thumb); hechas++; }
    }));
    onProgreso?.(hechas, faltan.length);
    await new Promise(r => setTimeout(r, pausaMs));
  }
  return hechas;
}
