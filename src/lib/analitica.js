/**
 * PostHog (27/10/2026, bloque D, decisión de Nati): una organización "BDT" y un proyecto por app.
 * Supabase (`eventos_uso`) sigue siendo la fuente del tablero; PostHog es para ver el porqué: grabaciones de
 * sesión, embudos y retención con los mismos eventos.
 *
 * Privacidad:
 *  - Se identifica solo por el user_id de Supabase. Nunca mail ni nombre.
 *  - En las grabaciones se tapan todos los campos de texto y NO se graban imágenes, video ni lienzos:
 *    ni las fotos de productos y tarjetas ni lo que ve la cámara.
 *  - Sin autocaptura de clics ni pageviews: solo los eventos propios de `anotar()`.
 * Se enciende solo si la config del servidor trae `negocio.analitica = { host, key }`: sin eso, no carga nada.
 * La librería se baja recién al encender, así no pesa en el arranque.
 */
let ph = null;
let iniciando = null;

/** Valida { host, key } de la config: host https y clave pública de proyecto (phc_…). Si no sirve, null. */
export function configDeAnalitica(v) {
  if (!v || typeof v !== 'object') return null;
  const host = typeof v.host === 'string' ? v.host.trim().replace(/\/+$/, '') : '';
  const key = typeof v.key === 'string' ? v.key.trim() : '';
  if (!/^https:\/\/[a-z0-9.-]+$/i.test(host) || !/^phc_[A-Za-z0-9]{20,80}$/.test(key)) return null;
  return { host, key };
}

/** Opciones de PostHog (exportadas para los tests: que nadie afloje la privacidad sin querer). */
export function opcionesPostHog(host) {
  return {
    api_host: host,
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: false,
    person_profiles: 'identified_only',
    disable_session_recording: false,
    session_recording: {
      maskAllInputs: true,
      blockSelector: 'img, video, canvas, picture, .ph-no-capture',
      recordCrossOriginIframes: false,
    },
  };
}

/** Enciende PostHog una sola vez e identifica por user_id. Devuelve true si quedó andando. */
export async function iniciarAnalitica(config, { userId, propiedades = {} } = {}) {
  const c = configDeAnalitica(config);
  if (!c || !userId) return false;
  if (ph) { try { ph.identify(String(userId), propiedades); } catch { /* nada */ } return true; }
  if (iniciando) return iniciando;
  iniciando = (async () => {
    try {
      const { default: posthog } = await import('posthog-js');
      posthog.init(c.key, opcionesPostHog(c.host));
      posthog.identify(String(userId), propiedades);
      ph = posthog;
      return true;
    } catch (e) { console.warn('[analítica] no arrancó:', e?.message || e); iniciando = null; return false; }
  })();
  return iniciando;
}

/** Manda un evento a PostHog si está encendido (la llama `anotar()`). Nunca falla. */
export function capturar(nombre, datos) {
  try { ph?.capture(nombre, datos || {}); } catch { /* nada */ }
}

/** Al cerrar sesión: que la próxima persona no herede la identidad. */
export function reiniciarAnalitica() { try { ph?.reset(); } catch { /* nada */ } }
