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
import { i18next } from '../idiomas/index.js';
const tx = (k, o) => i18next.t(k, o);

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
  const P = tx(permiso === 'micrófono' ? 'permisos.microfono' : 'permisos.camara');
  if (plataforma === 'ios') return tx('permisos.ajustesIos', { permiso: P });
  if (plataforma === 'android') return tx('permisos.ajustesAndroid', { permiso: P });
  return tx('permisos.ajustesWeb', { permiso: P });
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
        titulo: tx('permisos.camaraDenegadaTitulo'),
        texto: tx('permisos.camaraDenegadaTexto', { instrucciones: instruccionesDeAjustes('cámara', plataforma) }),
        puedeAbrirAjustes: plataforma !== 'web',
      };
    case 'sin-dispositivo':
      return { ...base, titulo: tx('permisos.camaraSinDispositivoTitulo'), texto: tx('permisos.camaraSinDispositivoTexto') };
    case 'ocupado':
      return { ...base, titulo: tx('permisos.camaraOcupadaTitulo'), texto: tx('permisos.camaraOcupadaTexto') };
    case 'no-soportado':
      return { ...base, titulo: tx('permisos.camaraNoSoportadaTitulo'), texto: tx('permisos.camaraNoSoportadaTexto') };
    default:
      return { ...base, titulo: tx('permisos.camaraDesconocidoTitulo'), texto: tx('permisos.camaraDesconocidoTexto') };
  }
}

export function explicarErrorDeMicrofono(err, plataforma = plataformaActual()) {
  const tipo = clasificarError(err);
  const base = { tipo, puedeAbrirAjustes: false, sugerirGaleria: false };
  switch (tipo) {
    case 'denegado':
      return {
        ...base,
        titulo: tx('permisos.microfonoDenegadoTitulo'),
        texto: tx('permisos.microfonoDenegadoTexto', { instrucciones: instruccionesDeAjustes('micrófono', plataforma) }),
        puedeAbrirAjustes: plataforma !== 'web',
      };
    case 'sin-dispositivo':
      return { ...base, titulo: tx('permisos.microfonoSinDispositivoTitulo'), texto: tx('permisos.microfonoSinDispositivoTexto') };
    case 'ocupado':
      return { ...base, titulo: tx('permisos.microfonoOcupadoTitulo'), texto: tx('permisos.microfonoOcupadoTexto') };
    case 'no-soportado':
      return { ...base, titulo: tx('permisos.microfonoNoSoportadoTitulo'), texto: tx('permisos.microfonoNoSoportadoTexto') };
    default:
      return { ...base, titulo: tx('permisos.microfonoDesconocidoTitulo'), texto: tx('permisos.microfonoDesconocidoTexto') };
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
