/**
 * Las fotos para los Excel (25/09/2026). Hasta hoy la celda llevaba una fórmula =IMAGE(url): solo
 * la entienden Excel 365 y Google Sheets; en Excel viejo, Numbers o la vista previa del Mac la
 * celda sale vacía o con #NAME? (Nati: "los Excel están saliendo sin foto, problemón"). Ahora la
 * foto va pegada de verdad en la celda (bytes adentro del archivo) y el link queda en su columna.
 *
 * De dónde sale la imagen, en orden: la miniatura local (chica, ideal para una celda), la foto
 * local, o la dirección en la nube: primero se intenta bajar directo (sin gastar funciones) y,
 * si el navegador no lo permite, por nuestro servidor.
 */
import { proxyImage } from "../api/client.js";

const aDataUrl = (blob) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob); });
const soloBase64 = (dataUrl) => (typeof dataUrl === "string" && dataUrl.includes(",") ? dataUrl.split(",")[1] : null);
const extensionDe = (dataUrl) => (/^data:image\/png/i.test(dataUrl || "") ? "png" : "jpeg");

/** Baja una dirección http y la devuelve como data URL, directo o por el servidor. Null si no se pudo. */
export async function dataUrlDeDireccion(url) {
  if (!url || typeof url !== "string" || !url.startsWith("http")) return null;
  try {
    const r = await fetch(url, { mode: "cors" });
    if (r.ok) { const blob = await r.blob(); if (blob.size > 0) return await aDataUrl(blob); }
  } catch { /* sin CORS o sin señal: se prueba por el servidor */ }
  try { return await proxyImage(url); } catch { return null; }
}

/** La imagen de un producto lista para `workbook.addImage`: { base64, extension } o null. */
export async function imagenDeProducto(p, { cache } = {}) {
  if (!p) return null;
  if (cache?.has(p.id)) return cache.get(p.id);
  let dataUrl = null;
  if (typeof p.thumb === "string" && p.thumb.startsWith("data:")) dataUrl = p.thumb;
  else {
    const local = (p.photos || []).find(x => typeof x === "string" && x.startsWith("data:"));
    if (local) dataUrl = local;
    else {
      const url = [...(p.photoUrls || []), ...(p.photos || [])].find(x => typeof x === "string" && x.startsWith("http"));
      dataUrl = await dataUrlDeDireccion(url);
    }
  }
  const base64 = soloBase64(dataUrl);
  const resultado = base64 ? { base64, extension: extensionDe(dataUrl) } : null;
  cache?.set(p.id, resultado);
  return resultado;
}

/** La tarjeta de un proveedor, igual que la foto de un producto. */
export async function imagenDeProveedor(s, { cache } = {}) {
  if (!s) return null;
  if (cache?.has(s.id)) return cache.get(s.id);
  let dataUrl = typeof s.cardPhoto === "string" && s.cardPhoto.startsWith("data:") ? s.cardPhoto : await dataUrlDeDireccion(s.cardPhotoUrl || (typeof s.cardPhoto === "string" && s.cardPhoto.startsWith("http") ? s.cardPhoto : null));
  const base64 = soloBase64(dataUrl);
  const resultado = base64 ? { base64, extension: extensionDe(dataUrl) } : null;
  cache?.set(s.id, resultado);
  return resultado;
}

/** Pega una imagen en una celda (col y fila empiezan en 0), del alto de la fila. */
export function pegarImagenEnCelda(wb, ws, imagen, { col, fila, ancho = 76, alto = 58 }) {
  if (!imagen?.base64) return false;
  const id = wb.addImage({ base64: imagen.base64, extension: imagen.extension || "jpeg" });
  ws.addImage(id, { tl: { col: col + 0.08, row: fila + 0.08 }, ext: { width: ancho, height: alto }, editAs: "oneCell" });
  return true;
}
