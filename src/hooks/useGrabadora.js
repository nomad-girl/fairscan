/**
 * Dictado por voz de la nota del stand (pieza 4.6, redefinida por Nati el 11/09).
 *
 * Lo que se dice queda escrito. El audio se sigue grabando como respaldo por si
 * el dictado no entendió algo, pero el protagonista es el texto: antes se
 * guardaba un audio que solo se podía volver a escuchar y la transcripción no
 * aparecía nunca en el teléfono. El porqué está en src/lib/dictado.js.
 *
 * Si el micrófono falla (permiso denegado, ocupado, sin micrófono), `micError`
 * trae la explicación de src/lib/permisos.js para mostrarla con salida clara.
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { explicarErrorDeMicrofono } from '../lib/permisos.js';
import { empezarDictado, motorDisponible, MOTOR } from '../lib/dictado.js';

export default function useGrabadora() {
  const [grabando, setGrabando] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const [transcripcion, setTranscripcion] = useState('');
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioURL, setAudioURL] = useState(null);
  const [micError, setMicError] = useState(null);
  // El dictado falla en silencio muy fácil: se muestra en pantalla, no en la consola.
  const [dictadoError, setDictadoError] = useState(null);
  // Si el teléfono no tiene dictado, se avisa en vez de fallar callado.
  const [sinDictado] = useState(() => motorDisponible() === MOTOR.NINGUNO);
  const recorderRef = useRef(null);
  const timerRef = useRef(null);
  const pararDictadoRef = useRef(null);

  useEffect(() => () => { if (audioURL) URL.revokeObjectURL(audioURL); }, [audioURL]);
  useEffect(() => () => {
    clearInterval(timerRef.current);
    try { recorderRef.current?.stop(); } catch { /* ya parada */ }
    try { pararDictadoRef.current?.(); } catch { /* ya parado */ }
  }, []);

  const empezar = useCallback(async () => {
    setMicError(null);
    setDictadoError(null);
    const motor = motorDisponible();
    try {
      // En el teléfono el micrófono lo usa uno solo a la vez: si grabamos audio,
      // el dictado se queda sin micrófono y no transcribe (probado el 11/09).
      // Lo que importa es el texto, así que en nativo no se graba.
      if (motor !== MOTOR.NATIVO) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mr = new MediaRecorder(stream);
        const chunks = [];
        mr.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
        mr.onstop = () => {
          const blob = new Blob(chunks, { type: mr.mimeType });
          setAudioBlob(blob);
          setAudioURL(URL.createObjectURL(blob));
          stream.getTracks().forEach(t => t.stop());
        };
        mr.start(100);
        recorderRef.current = mr;
      }
      setGrabando(true);
      setSegundos(0);
      timerRef.current = setInterval(() => setSegundos(s => s + 1), 1000);

      // El dictado del teléfono escribe mientras se habla.
      pararDictadoRef.current = await empezarDictado(
        (texto) => setTranscripcion(texto),
        (err) => setDictadoError(err?.message || 'El dictado no pudo arrancar'),
        { motor },
      );
    } catch (err) {
      setMicError(explicarErrorDeMicrofono(err));
    }
  }, []);

  const parar = useCallback(async () => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setGrabando(false);
    clearInterval(timerRef.current);
    try { await pararDictadoRef.current?.(); } catch { /* ya parado */ }
    pararDictadoRef.current = null;
  }, []);

  const descartar = useCallback(() => {
    if (audioURL) URL.revokeObjectURL(audioURL);
    setAudioBlob(null); setAudioURL(null); setSegundos(0); setTranscripcion('');
  }, [audioURL]);

  /** Para retomar un borrador: audio ya guardado como bytes. */
  const cargar = useCallback((blob, transcript = '', duracion = 0) => {
    if (!blob) return;
    setAudioBlob(blob); setAudioURL(URL.createObjectURL(blob)); setTranscripcion(transcript || ''); setSegundos(duracion || 0);
  }, []);

  /** El texto se puede corregir a mano: el dictado se equivoca. */
  const editarTranscripcion = useCallback((texto) => setTranscripcion(texto || ''), []);

  return { grabando, segundos, transcripcion, audioBlob, audioURL, micError, dictadoError, sinDictado, empezar, parar, descartar, cargar, editarTranscripcion };
}
