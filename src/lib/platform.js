/**
 * Cosas que el caparazón de la app hace al arrancar según dónde corre.
 * Ninguna es visible para la usuaria; todas evitan un desastre silencioso.
 */

import { Capacitor } from '@capacitor/core';

export const isNativeApp = () => Capacitor.isNativePlatform();

/**
 * Pedirle al sistema que NO borre el almacenamiento de la app.
 *
 * En iOS, el sistema puede vaciar el almacenamiento de una webview para liberar
 * espacio, sin avisar. Existe un permiso de "almacenamiento persistente" que hay
 * que pedir explícitamente; sin eso hay un escenario —remoto pero catastrófico— en
 * el que una usuaria pierde una feria entera porque el teléfono se quedó sin lugar.
 *
 * Se pide una sola vez por instalación (el navegador recuerda la respuesta). No
 * bloquea el arranque: si falla, la app sigue igual y se registra el resultado.
 *
 * @returns {Promise<'concedido'|'denegado'|'no-disponible'>}
 */
export async function requestPersistentStorage() {
  try {
    if (!navigator.storage?.persist) return 'no-disponible';
    if (await navigator.storage.persisted?.()) return 'concedido';
    const ok = await navigator.storage.persist();
    return ok ? 'concedido' : 'denegado';
  } catch {
    return 'no-disponible';
  }
}

/**
 * Apagar el service worker dentro de la app nativa.
 *
 * El service worker es el programita que cachea la app para que funcione sin
 * internet. Dentro de Capacitor eso ya lo hace el propio empaquetado: los archivos
 * están en el teléfono. Tener los dos son dos capas de caché peleando, y el modo
 * de actualización automática puede provocar recargas raras en medio de una
 * captura.
 *
 * En el build nativo el service worker ni siquiera se genera (ver vite.config.js).
 * Esto es la red de seguridad por si uno quedó registrado igual.
 */
export async function unregisterServiceWorkersOnNative() {
  if (!isNativeApp()) return 0;
  try {
    const regs = await navigator.serviceWorker?.getRegistrations?.();
    if (!regs?.length) return 0;
    await Promise.all(regs.map((r) => r.unregister()));
    return regs.length;
  } catch {
    return 0;
  }
}
