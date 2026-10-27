/**
 * Ensayo de feria (opción A elegida por Nati el 27/10/2026; wireframes aprobados:
 * https://claude.ai/artifact/8uLJYQFmbQkvBVWNeFyjeF).
 *
 * La primera vez la app no abre en la cámara: abre en una bienvenida de un botón y un ensayo con el stand de
 * ejemplo de Nancy Ceramic (dos productos y la tarjeta, sin cámara, sin IA, sin gastar escaneos). Después explica
 * para qué es la cámara y recién ahí la pide. Por qué: en Android (26–27/10) de 53 que abrieron solo 4 sacaron una
 * foto, y la mayoría prueba en su casa, sin productos ni tarjetas a mano.
 *
 * Acá viven las marcas de "ya lo vio" (en el teléfono, por instalación) y los datos de la tarjeta de ejemplo.
 */
const CLAVE_ENSAYO = 'fs_ensayo';                 // 'hecho' cuando terminó o salteó el ensayo
const CLAVE_PERMISO = 'fs_prepermiso';            // 'visto' cuando pasó por "Ahora con tu cámara"
const CLAVE_PRIMER_STAND = 'fs_primer_stand';     // 'hecho' cuando cerró su primer stand guiado
const CAMARA_OK = 'fs_evento_hecho_camara_ok';    // lo deja primerUso.js la primera vez que la cámara abrió con permiso

function guardado(store) { try { return store || globalThis.localStorage || null; } catch { return null; } }
function leer(clave, store) { try { return guardado(store)?.getItem(clave) || null; } catch { return null; } }
function escribir(clave, valor, store) { try { guardado(store)?.setItem(clave, valor); } catch { /* sin almacenamiento */ } }
function borrar(clave, store) { try { guardado(store)?.removeItem(clave); } catch { /* sin almacenamiento */ } }

/**
 * ¿Por dónde arranca esta instalación? 'bienvenida' (ensayo completo), 'permiso' (solo la explicación de la
 * cámara) o null (la cámara directa, como siempre). Quien ya tiene productos nunca ve nada de esto.
 * Sin almacenamiento no se puede recordar que ya lo vio: se va directo a la cámara.
 */
export function inicioPrimerUso({ hayProductos, esEscritorio = false }, store) {
  if (hayProductos || esEscritorio || !guardado(store)) return null;
  if (leer(CLAVE_ENSAYO, store) !== 'hecho') return 'bienvenida';
  if (leer(CLAVE_PERMISO, store) !== 'visto' && !leer(CAMARA_OK, store)) return 'permiso';
  return null;
}

export const marcarEnsayo = (store) => escribir(CLAVE_ENSAYO, 'hecho', store);
export const marcarPermiso = (store) => escribir(CLAVE_PERMISO, 'visto', store);
/** "Ver el ejemplo de nuevo" (catálogo vacío y Ayuda): el ensayo vuelve a empezar. */
export const reiniciarEnsayo = (store) => borrar(CLAVE_ENSAYO, store);

/** El primer stand se guía (globo de la tarjeta, cierre automático al leerla) una sola vez por instalación. */
export const primerStandGuiado = (store) => !!guardado(store) && leer(CLAVE_PRIMER_STAND, store) !== 'hecho';
export const marcarPrimerStand = (store) => escribir(CLAVE_PRIMER_STAND, 'hecho', store);

/** La tarjeta de Nancy Ceramic, tal como la lee la IA (sin llamarla). Las fotos viven en public/ejemplo. */
export const TARJETA_EJEMPLO = {
  foto: '/ejemplo/tarjeta-ficha.jpg',   // derecha y recortada: la que se guarda y se ve en la ficha
  fotoVisor: '/ejemplo/tarjeta-mano.jpg', // en la mano, como se ve con la cámara
  company: 'Nancy Ceramic',
  contact: 'Nancy / Rahma',
  phone: '+86 135 3873 6614',
  wechat: '13538736614',
  address: 'Futian market Zone 4, Gate 76, 23 street',
};

/** Lo que el ensayo "fotografía": los productos del stand de ejemplo, en orden. */
export const PRODUCTOS_ENSAYO = [
  { clave: 'flores', foto: '/ejemplo/p3.jpg', precio: '3.8' },
  { clave: 'tazaPlato', foto: '/ejemplo/p2.jpg', precio: '2.5' },
];

/** Una foto de public/ como data URL, para guardarla igual que una foto de la cámara (y que suba a la nube). */
export async function fotoComoDataUrl(ruta) {
  const r = await fetch(ruta);
  if (!r.ok) throw new Error(`no se pudo leer ${ruta}`);
  const blob = await r.blob();
  return await new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => resolve(lector.result);
    lector.onerror = () => reject(lector.error);
    lector.readAsDataURL(blob);
  });
}
