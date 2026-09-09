/**
 * Fotos como binario en la base local (pieza 3.2 / N6).
 *
 * Hasta ahora cada foto se guardaba como texto base64: pesa un 33% más que la
 * foto real y hay que traducirla cada vez que se muestra. Ahora la base guarda
 * los bytes (`{ data: ArrayBuffer, type }`, igual que las notas de voz) y, al
 * leer, cada foto se convierte en una dirección `blob:` que el navegador muestra
 * sin traducir nada. El resto de la app sigue viendo texto: direcciones.
 *
 * Tres formas de una misma foto, y qué acepta cada parte:
 *   · `data:…`  — recién capturada (canvas). Se guarda convertida a bytes.
 *   · bytes     — en la base. Nunca llega a la interfaz.
 *   · `blob:…`  — en la interfaz, para <img>. Se libera al recargar la lista.
 *   · `https:…` — en la nube (registros de otros dispositivos). Queda igual.
 * Lo que va al servidor (IA, subida) se pide con `aDataUrl()`, que devuelve
 * base64 desde cualquiera de las cuatro.
 */

export function esBinaria(x) {
  return !!x && typeof x === 'object' && (x.data instanceof ArrayBuffer || ArrayBuffer.isView(x.data));
}

export function esDataUrl(x) { return typeof x === 'string' && x.startsWith('data:'); }
export function esBlobUrl(x) { return typeof x === 'string' && x.startsWith('blob:'); }

/** 'data:image/jpeg;base64,…' → { data, type } */
export function dataUrlABinario(dataUrl) {
  const m = /^data:([^;,]*)(;base64)?,(.*)$/s.exec(dataUrl || '');
  if (!m || !m[2]) return null;
  const type = m[1] || 'image/jpeg';
  const bin = atob(m[3]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { data: bytes.buffer, type };
}

/** { data, type } → 'data:…;base64,…' (por trozos: una foto de 100 KB no entra en una llamada). */
export function binarioADataUrl(bin) {
  if (!esBinaria(bin)) return null;
  const bytes = bin.data instanceof ArrayBuffer ? new Uint8Array(bin.data) : new Uint8Array(bin.data.buffer, bin.data.byteOffset, bin.data.byteLength);
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return `data:${bin.type || 'image/jpeg'};base64,${btoa(s)}`;
}

// ─── direcciones blob: para la interfaz ──────────────────────────────────────
// Una dirección por foto, estable entre lecturas: se identifica por registro y
// posición, y solo se recrea si cambió el tamaño (otra foto). Así una pantalla que
// guardó la dirección (ficha, captura con proveedor vinculado) no la ve morir
// cuando la lista se recarga. La memoria queda acotada al catálogo, como antes.
const cache = new Map(); // clave → { url, size }
export function binarioAObjectUrl(bin, clave) {
  if (typeof URL === 'undefined' || !URL.createObjectURL) return null;
  const size = bin.data.byteLength;
  const prev = clave ? cache.get(clave) : null;
  if (prev && prev.size === size) return prev.url;
  if (prev) { try { URL.revokeObjectURL(prev.url); } catch { /* ya liberada */ } }
  const url = URL.createObjectURL(new Blob([bin.data], { type: bin.type || 'image/jpeg' }));
  if (clave) cache.set(clave, { url, size });
  return url;
}
/** Libera las direcciones de un registro borrado. */
export function liberarObjectUrls(prefijo) {
  for (const [k, v] of cache) if (k.startsWith(prefijo)) { try { URL.revokeObjectURL(v.url); } catch { /* ya liberada */ } cache.delete(k); }
}

/** Cualquier forma → base64 (para IA y subida). http → null: eso ya está en la nube. */
export async function aDataUrl(src) {
  if (!src) return null;
  if (esBinaria(src)) return binarioADataUrl(src);
  if (typeof src !== 'string') return null;
  if (src.startsWith('data:')) return src;
  if (src.startsWith('blob:')) {
    const blob = await (await fetch(src)).blob();
    return await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob); });
  }
  return null;
}

export const paraUI = (foto, clave) => (esBinaria(foto) ? binarioAObjectUrl(foto, clave) : foto);
export const paraGuardar = (foto) => (esDataUrl(foto) ? dataUrlABinario(foto) || foto : foto);

export function productoParaUI(p) {
  if (!p?.photos?.some(esBinaria)) return p;
  return { ...p, photos: p.photos.map((f, i) => paraUI(f, `p:${p.id}:${i}`)) };
}
export function productoParaGuardar(p) {
  if (!p?.photos?.some(esDataUrl)) return p;
  return { ...p, photos: p.photos.map(paraGuardar) };
}
export function proveedorParaUI(s) {
  return esBinaria(s?.cardPhoto) ? { ...s, cardPhoto: paraUI(s.cardPhoto, `s:${s.id}`) } : s;
}
export function proveedorParaGuardar(s) {
  return esDataUrl(s?.cardPhoto) ? { ...s, cardPhoto: paraGuardar(s.cardPhoto) } : s;
}
export function tieneFotosEnTexto(p) { return !!p?.photos?.some(esDataUrl); }

/** Copia sin lo derivado (audio, miniatura): para backups y salidas en JSON. */
export function sinDerivados(p) {
  if (!p) return p;
  const { audio, thumb, ...resto } = p;
  return resto;
}
