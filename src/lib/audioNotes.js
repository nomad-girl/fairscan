/**
 * Notas de voz que sobreviven al cierre de la app.
 *
 * El bug (N3 de la auditoría): al grabar, el navegador entrega una dirección
 * temporal `blob:…` que vale solo mientras la pestaña está viva. La app guardaba
 * esa dirección en la base como si fuera permanente; al reabrir, el reproductor
 * aparecía pero no sonaba nada. El audio nunca se había guardado.
 *
 * Ahora se guarda el audio en sí, como bytes, dentro de la base local (IndexedDB
 * acepta binarios). Se elige ArrayBuffer y no Blob porque Safari tuvo años de
 * problemas guardando Blobs en IndexedDB y no vale la pena arriesgarse.
 *
 * Pendiente para 4.6: subir el audio a la nube y hacerlo "por stand". Esto deja
 * la parte que no se pierde; aquello decide dónde vive.
 */

/** @typedef {{ data: ArrayBuffer, type: string, size: number, duracion?: number }} NotaDeVoz */

/**
 * Convierte el Blob que entrega la grabadora en algo que se puede guardar.
 * @param {Blob} blob
 * @param {{ duracion?: number }} [extra] segundos grabados, para mostrar sin decodificar
 * @returns {Promise<NotaDeVoz|null>}
 */
export async function serializarAudio(blob, extra = {}) {
  if (!blob || typeof blob.arrayBuffer !== 'function' || !blob.size) return null;
  const data = await blob.arrayBuffer();
  const nota = { data, type: blob.type || 'audio/webm', size: data.byteLength };
  if (Number.isFinite(extra.duracion)) nota.duracion = extra.duracion;
  return nota;
}

/** ¿Es una nota guardada de verdad, con bytes adentro? */
export function esNotaValida(nota) {
  const d = nota?.data;
  if (!d) return false;
  const bytes = d.byteLength ?? d.length;
  return Number.isFinite(bytes) && bytes > 0;
}

/**
 * Dirección reproducible para un `<audio src>`. Hay que liberarla con
 * `URL.revokeObjectURL` cuando deja de usarse.
 * @param {NotaDeVoz|null|undefined} nota
 * @returns {string|null}
 */
export function urlDeAudio(nota) {
  if (!esNotaValida(nota)) return null;
  const blob = new Blob([nota.data], { type: nota.type || 'audio/webm' });
  return URL.createObjectURL(blob);
}

/**
 * Las direcciones `blob:` guardadas por versiones anteriores están muertas: no
 * apuntan a nada. Sirve para no mostrar un reproductor que no va a sonar.
 */
export function esPunteroMuerto(url) {
  return typeof url === 'string' && url.startsWith('blob:');
}

/**
 * Copia de un producto sin el audio, para los backups y cualquier salida en JSON:
 * un ArrayBuffer se serializa como `{}` y ensuciaría el archivo sin servir de nada.
 */
export function sinAudio(producto) {
  if (!producto || !('audio' in producto)) return producto;
  const { audio, ...resto } = producto;
  return resto;
}
