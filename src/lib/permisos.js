/**
 * Permisos de cámara y micrófono: qué decirle a la usuaria cuando fallan.
 *
 * Antes, si el permiso de cámara estaba denegado, el botón "📸 Agregar producto"
 * no hacía nada: el error iba a la consola de desarrollo y la vista se cerraba
 * (N5 de la auditoría). En la app nativa eso es grave porque el sistema pregunta
 * una sola vez: si tocó "No permitir", la app quedaba muda para siempre.
 *
 * Acá se traduce el error técnico del navegador a tres cosas concretas: qué pasó,
 * cómo se arregla (con el camino exacto a los ajustes del teléfono, o el botón que
 * los abre) y una salida alternativa (la galería).
 *
 * Las funciones reciben la plataforma como parámetro para poder testearlas sin
 * simular Capacitor; en la app se usa la plataforma real por defecto.
 */

import { Capacitor } from '@capacitor/core';

/** 'ios' | 'android' | 'web' */
export const plataformaActual = () => Capacitor.getPlatform();

const DENEGADO = ['NotAllowedError', 'PermissionDeniedError', 'SecurityError'];
const SIN_DISPOSITIVO = ['NotFoundError', 'DevicesNotFoundError', 'OverconstrainedError', 'ConstraintNotSatisfiedError'];
const OCUPADO = ['NotReadableError', 'TrackStartError', 'AbortError'];

/** Clasifica el error que tira getUserMedia. */
export function clasificarError(err) {
  const name = err?.name || '';
  if (DENEGADO.includes(name)) return 'denegado';
  if (SIN_DISPOSITIVO.includes(name)) return 'sin-dispositivo';
  if (OCUPADO.includes(name)) return 'ocupado';
  if (err instanceof TypeError || name === 'TypeError') return 'no-soportado';
  return 'desconocido';
}

/**
 * El camino exacto para volver a dar el permiso, según dónde corre la app.
 * @param {'cámara'|'micrófono'} permiso
 */
export function instruccionesDeAjustes(permiso, plataforma = plataformaActual()) {
  const P = permiso.charAt(0).toUpperCase() + permiso.slice(1);
  if (plataforma === 'ios') return `Ajustes → FairScan → ${P} → activar.`;
  if (plataforma === 'android') return `Ajustes → Aplicaciones → FairScan → Permisos → ${P} → Permitir.`;
  return `En el navegador, tocá el ícono junto a la dirección (el candado o "aA") → Configuración del sitio → ${P} → Permitir, y recargá la página.`;
}

/**
 * @returns {{ tipo: string, titulo: string, texto: string, puedeAbrirAjustes: boolean, sugerirGaleria: boolean }}
 */
export function explicarErrorDeCamara(err, plataforma = plataformaActual()) {
  const tipo = clasificarError(err);
  const base = { tipo, puedeAbrirAjustes: false, sugerirGaleria: true };
  switch (tipo) {
    case 'denegado':
      return {
        ...base,
        titulo: 'La cámara está bloqueada para FairScan',
        texto: `Se le dijo "no" al permiso de cámara, y el teléfono lo recuerda. Se arregla en un toque: ${instruccionesDeAjustes('cámara', plataforma)} Mientras tanto podés elegir fotos de la galería.`,
        puedeAbrirAjustes: plataforma !== 'web',
      };
    case 'sin-dispositivo':
      return { ...base, titulo: 'No encontramos una cámara', texto: 'Este dispositivo no tiene una cámara disponible. Podés elegir una foto de la galería.' };
    case 'ocupado':
      return { ...base, titulo: 'La cámara está ocupada', texto: 'Otra app la está usando. Cerrala y probá de nuevo, o elegí una foto de la galería.' };
    case 'no-soportado':
      return { ...base, titulo: 'Este navegador no puede abrir la cámara acá', texto: 'Probá abrir FairScan en Safari o Chrome, o elegí una foto de la galería.' };
    default:
      return { ...base, titulo: 'No se pudo abrir la cámara', texto: 'Probá de nuevo. Si sigue sin andar, elegí una foto de la galería.' };
  }
}

export function explicarErrorDeMicrofono(err, plataforma = plataformaActual()) {
  const tipo = clasificarError(err);
  const base = { tipo, puedeAbrirAjustes: false, sugerirGaleria: false };
  switch (tipo) {
    case 'denegado':
      return {
        ...base,
        titulo: 'El micrófono está bloqueado para FairScan',
        texto: `Se le dijo "no" al permiso de micrófono. Para grabar notas de voz: ${instruccionesDeAjustes('micrófono', plataforma)} Mientras tanto podés escribir la nota.`,
        puedeAbrirAjustes: plataforma !== 'web',
      };
    case 'sin-dispositivo':
      return { ...base, titulo: 'No encontramos un micrófono', texto: 'Este dispositivo no tiene micrófono disponible. Podés escribir la nota.' };
    case 'ocupado':
      return { ...base, titulo: 'El micrófono está ocupado', texto: 'Otra app lo está usando (¿una llamada?). Cerrala y probá de nuevo.' };
    case 'no-soportado':
      return { ...base, titulo: 'Este navegador no puede grabar audio', texto: 'Probá abrir FairScan en Safari o Chrome, o escribí la nota.' };
    default:
      return { ...base, titulo: 'No se pudo grabar', texto: 'Probá de nuevo. Si sigue sin andar, escribí la nota.' };
  }
}

/**
 * Abre la pantalla de ajustes de FairScan en el teléfono (solo en la app nativa).
 * En el navegador no existe esa puerta: se devuelve false y la interfaz muestra
 * las instrucciones escritas.
 * @returns {Promise<boolean>} si se pudo abrir
 */
export async function abrirAjustesDeLaApp(plataforma = plataformaActual()) {
  if (plataforma === 'web') return false;
  try {
    const { NativeSettings, AndroidSettings, IOSSettings } = await import('capacitor-native-settings');
    await NativeSettings.open({ optionAndroid: AndroidSettings.ApplicationDetails, optionIOS: IOSSettings.App });
    return true;
  } catch (err) {
    console.warn('[permisos] No se pudieron abrir los ajustes:', err?.message || err);
    return false;
  }
}
