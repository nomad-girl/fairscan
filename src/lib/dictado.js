/**
 * Dictado por voz: lo que se dice queda escrito (pieza 4.6, redefinida por Nati el 11/09).
 *
 * Por qué cambió: la nota de voz guardaba un audio que solo se podía volver a
 * escuchar, y la transcripción no aparecía nunca en el teléfono. Dos motivos:
 * el dictado del navegador (`webkitSpeechRecognition`) no existe dentro de una
 * app empaquetada, y el respaldo del servidor mandaba el audio a Claude, que no
 * acepta audio. Nati: "no me interesa escuchar mi voz, me interesa que quede
 * todo escrito".
 *
 * Ahora se usa el dictado del propio teléfono (el mismo de WhatsApp): gratis,
 * sin señal, y el resultado es texto. En la web se sigue usando el del
 * navegador cuando existe. Si no hay ninguno, se avisa en vez de fallar callado.
 *
 * Importante (11/09, probado en el Android): en el teléfono el micrófono lo usa
 * uno solo a la vez. Si además se graba audio con MediaRecorder, el dictado se
 * queda sin micrófono y no transcribe nada. Por eso en nativo NO se graba audio:
 * se dicta y punto, que es además lo que Nati pidió.
 */
import { Capacitor } from '@capacitor/core';

/** Motores posibles, en orden de preferencia. */
export const MOTOR = { NATIVO: 'nativo', NAVEGADOR: 'navegador', NINGUNO: 'ninguno' };

export function motorDisponible({ plataforma = Capacitor.getPlatform(), ventana = typeof window !== 'undefined' ? window : {} } = {}) {
  if (plataforma === 'ios' || plataforma === 'android') return MOTOR.NATIVO;
  if (ventana.SpeechRecognition || ventana.webkitSpeechRecognition) return MOTOR.NAVEGADOR;
  return MOTOR.NINGUNO;
}

/** Idioma del dictado: el del teléfono, con el español de Argentina como red. */
export function idioma(nav = typeof navigator !== 'undefined' ? navigator : {}) {
  return nav.language || 'es-AR';
}

/**
 * Junta lo ya dicho con lo que se está diciendo, sin repetir ni pegar palabras.
 * El motor nativo manda el texto completo en cada aviso; el del navegador manda
 * tramos. Esta función sirve para los dos.
 */
export function unir(firme, parcial) {
  const a = (firme || '').trim();
  const b = (parcial || '').trim();
  if (!b) return a;
  if (!a) return b;
  if (b.startsWith(a)) return b;        // el nativo reenvía todo desde el principio
  return `${a} ${b}`;
}

/**
 * Arranca el dictado. Devuelve una función para frenarlo.
 * @param {(texto: string) => void} alEscribir  se llama con el texto acumulado
 * @param {(err: any) => void} alFallar
 */
export async function empezarDictado(alEscribir, alFallar, opciones = {}) {
  const motor = opciones.motor || motorDisponible();
  if (motor === MOTOR.NATIVO) return dictadoNativo(alEscribir, alFallar);
  if (motor === MOTOR.NAVEGADOR) return dictadoNavegador(alEscribir, alFallar);
  return () => {};
}

async function dictadoNativo(alEscribir, alFallar) {
  const { SpeechRecognition } = await import('@capacitor-community/speech-recognition');
  try {
    const { available } = await SpeechRecognition.available();
    if (!available) { alFallar?.(new Error('Este teléfono no tiene dictado del sistema')); return () => {}; }
  } catch { /* si la comprobación no existe, se intenta igual */ }
  try {
    const { speechRecognition } = await SpeechRecognition.checkPermissions();
    if (speechRecognition !== 'granted') {
      const pedido = await SpeechRecognition.requestPermissions();
      if (pedido?.speechRecognition !== 'granted') { alFallar?.(new Error('Falta el permiso de dictado')); return () => {}; }
    }
  } catch { /* si no hay API de permisos, se intenta igual */ }

  let firme = '';
  const oyente = await SpeechRecognition.addListener('partialResults', (data) => {
    const dicho = (data?.matches || [])[0] || '';
    alEscribir(unir(firme, dicho));
  });

  try {
    await SpeechRecognition.start({
      language: idioma(),
      partialResults: true,
      popup: false,           // sin la ventanita de Google: se escribe en nuestra pantalla
    });
  } catch (err) {
    oyente?.remove?.();
    alFallar?.(err);
    return () => {};
  }

  return async () => {
    try { await SpeechRecognition.stop(); } catch { /* ya parado */ }
    oyente?.remove?.();
    firme = '';
  };
}

function dictadoNavegador(alEscribir, alFallar) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const sr = new SR();
  sr.continuous = true;
  sr.interimResults = true;
  sr.lang = idioma();
  let firme = '';
  let vivo = true;
  sr.onresult = (e) => {
    let parcial = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) firme = unir(firme, e.results[i][0].transcript);
      else parcial = e.results[i][0].transcript;
    }
    alEscribir(unir(firme, parcial));
  };
  sr.onerror = (e) => { if (e?.error && e.error !== 'no-speech') alFallar?.(e); };
  sr.onend = () => { if (vivo) { try { sr.start(); } catch { /* ya corriendo */ } } };
  try { sr.start(); } catch (err) { alFallar?.(err); }
  return () => { vivo = false; sr.onend = null; try { sr.stop(); } catch { /* ya parado */ } };
}
