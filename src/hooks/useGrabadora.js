/**
 * Grabadora de notas de voz (pieza 4.6): graba con MediaRecorder, transcribe en
 * vivo con el reconocimiento de voz del sistema si existe, y entrega el audio
 * como Blob para guardarlo como bytes (ver src/lib/audioNotes.js).
 *
 * Si el micrófono falla (permiso denegado, ocupado, sin micrófono), `micError`
 * trae la explicación de src/lib/permisos.js para mostrarla con salida clara.
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { explicarErrorDeMicrofono } from '../lib/permisos.js';

export default function useGrabadora() {
  const [grabando, setGrabando] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const [transcripcion, setTranscripcion] = useState('');
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioURL, setAudioURL] = useState(null);
  const [micError, setMicError] = useState(null);
  const recorderRef = useRef(null);
  const timerRef = useRef(null);
  const speechRef = useRef(null);

  useEffect(() => () => { if (audioURL) URL.revokeObjectURL(audioURL); }, [audioURL]);
  useEffect(() => () => { clearInterval(timerRef.current); try { recorderRef.current?.stop(); } catch { /* ya parada */ } }, []);

  const empezar = useCallback(async () => {
    setMicError(null);
    try {
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
      setGrabando(true);
      setSegundos(0);
      timerRef.current = setInterval(() => setSegundos(s => s + 1), 1000);

      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SR) {
        const sr = new SR();
        sr.continuous = true; sr.interimResults = true; sr.lang = navigator.language || 'es-AR';
        let finalText = '';
        sr.onresult = (e) => {
          let interim = '';
          for (let i = e.resultIndex; i < e.results.length; i++) {
            if (e.results[i].isFinal) finalText += e.results[i][0].transcript + ' ';
            else interim = e.results[i][0].transcript;
          }
          setTranscripcion((finalText + interim).trim());
        };
        sr.onerror = () => {};
        sr.onend = () => { if (recorderRef.current) { try { sr.start(); } catch { /* ya corriendo */ } } };
        sr.start();
        speechRef.current = sr;
      }
    } catch (err) {
      setMicError(explicarErrorDeMicrofono(err));
    }
  }, []);

  const parar = useCallback(() => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setGrabando(false);
    clearInterval(timerRef.current);
    if (speechRef.current) { speechRef.current.onend = null; speechRef.current.stop(); speechRef.current = null; }
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

  return { grabando, segundos, transcripcion, audioBlob, audioURL, micError, empezar, parar, descartar, cargar };
}
