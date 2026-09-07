/**
 * Guardar archivos que genera la app (Excel, ZIP, CSV, backup, fotos).
 *
 * **El problema que resuelve.** En el navegador, "descargar" es crear un link
 * invisible y hacerle clic. Dentro de una app empaquetada con Capacitor ese
 * mecanismo no existe: en iOS no pasa absolutamente nada. O sea que el export
 * —el momento en que el catálogo se vuelve útil para la empresa— quedaba roto
 * justo en la versión que va a las tiendas. Ver `auditoria-e2e.md` → F2.
 *
 * **Cómo lo resuelve.** En nativo, el archivo se escribe en el disco del teléfono
 * y se abre la hoja de compartir del sistema, para que la usuaria elija Mail,
 * WhatsApp, Archivos o Drive. En web se mantiene la descarga de siempre.
 *
 * **Por qué se escribe de a pedazos.** Capacitor solo sabe escribir archivos como
 * texto base64. Un ZIP con las fotos de una feria entera puede pesar cientos de
 * megas, y convertirlo todo junto es la forma más rápida de quedarse sin memoria
 * en el peor momento posible. Se escribe en pedazos de 384 KB.
 */

import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/** true dentro de la app empaquetada (iOS/Android), false en el navegador. */
export const isNativeApp = () => Capacitor.isNativePlatform();

// Múltiplo de 3 para que cada pedazo cierre en base64 sin relleno.
const CHUNK = 3 * 128 * 1024;

function bytesToBase64(bytes) {
  let binary = '';
  const STEP = 0x8000; // de a 32 KB: pasarle el array entero a fromCharCode desborda la pila
  for (let i = 0; i < bytes.length; i += STEP) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + STEP));
  }
  return btoa(binary);
}

async function sliceToBase64(slice) {
  return bytesToBase64(new Uint8Array(await slice.arrayBuffer()));
}

/** Escribe un Blob en la carpeta temporal del teléfono y devuelve su ruta. */
async function writeBlob(blob, filename) {
  const directory = Directory.Cache;
  let started = false;

  for (let offset = 0; offset < blob.size; offset += CHUNK) {
    const data = await sliceToBase64(blob.slice(offset, offset + CHUNK));
    if (!data) continue;
    if (!started) {
      await Filesystem.writeFile({ path: filename, directory, data, recursive: true });
      started = true;
    } else {
      await Filesystem.appendFile({ path: filename, directory, data });
    }
  }
  if (!started) {
    await Filesystem.writeFile({ path: filename, directory, data: '', recursive: true });
  }

  const { uri } = await Filesystem.getUri({ path: filename, directory });
  return uri;
}

/** La descarga clásica del navegador. */
function webDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Sin la espera, Safari puede cancelar la descarga a medio empezar.
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

function isCancelled(err) {
  const msg = String(err?.message || err || '').toLowerCase();
  return err?.name === 'AbortError' || msg.includes('cancel') || msg.includes('abort');
}

/**
 * Guarda un archivo generado por la app.
 *
 * @param {Blob} blob
 * @param {string} filename
 * @param {{ title?: string }} [opts]
 * @returns {Promise<{ ok: boolean, cancelled?: boolean, error?: Error }>}
 */
export async function saveFile(blob, filename, { title } = {}) {
  if (!isNativeApp()) {
    try {
      webDownload(blob, filename);
      return { ok: true };
    } catch (error) {
      console.warn('[saveFile] Falló la descarga web:', error);
      return { ok: false, error };
    }
  }

  try {
    const uri = await writeBlob(blob, filename);
    await Share.share({ title: title || filename, files: [uri] });
    return { ok: true };
  } catch (error) {
    if (isCancelled(error)) return { ok: false, cancelled: true };
    console.warn('[saveFile] Falló el guardado nativo:', error);
    return { ok: false, error };
  }
}

/**
 * Comparte fotos para que la usuaria pueda guardarlas en su galería.
 *
 * @param {Array<{ data: string, filename: string }>} photos  data es un data URL
 * @returns {Promise<{ ok: boolean, cancelled?: boolean, error?: Error }>}
 */
export async function sharePhotos(photos) {
  if (!photos?.length) return { ok: false };

  if (isNativeApp()) {
    try {
      const uris = [];
      for (const p of photos) {
        const base64 = String(p.data).split(',')[1];
        if (!base64) continue;
        await Filesystem.writeFile({
          path: p.filename,
          directory: Directory.Cache,
          data: base64,
          recursive: true,
        });
        const { uri } = await Filesystem.getUri({ path: p.filename, directory: Directory.Cache });
        uris.push(uri);
      }
      if (!uris.length) return { ok: false };
      await Share.share({ title: 'FairScan · Fotos', files: uris });
      return { ok: true };
    } catch (error) {
      if (isCancelled(error)) return { ok: false, cancelled: true };
      console.warn('[sharePhotos] Falló el compartir nativo:', error);
      return { ok: false, error };
    }
  }

  // Web: la hoja de compartir del navegador, si existe.
  try {
    const files = photos
      .map((p, i) => {
        const base64 = String(p.data).split(',')[1];
        if (!base64) return null;
        const bin = atob(base64);
        const bytes = new Uint8Array(bin.length);
        for (let j = 0; j < bin.length; j++) bytes[j] = bin.charCodeAt(j);
        return new File([bytes], p.filename || `foto_${i + 1}.jpg`, { type: 'image/jpeg' });
      })
      .filter(Boolean);

    if (files.length && navigator.canShare?.({ files })) {
      await navigator.share({ files, title: 'FairScan - Fotos' });
      return { ok: true };
    }
    return { ok: false }; // quien llama decide el plan B (bajarlas como ZIP)
  } catch (error) {
    if (isCancelled(error)) return { ok: false, cancelled: true };
    console.warn('[sharePhotos] Falló el compartir web:', error);
    return { ok: false, error };
  }
}
