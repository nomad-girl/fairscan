/**
 * Vibración con significado fijo (decisión del 15/09: éxito, aviso y error
 * nunca se intercambian, y siempre acompañan algo visual).
 *
 * En el teléfono usa el plugin nativo de Capacitor; en la web, la vibración del
 * navegador si existe; si no hay motor, no hace nada y no falla. Se llama
 * siempre, sin preguntar dónde corre.
 */
import { Capacitor } from "@capacitor/core";

let plugin = null;
async function haptics() {
  if (plugin !== null) return plugin;
  try {
    if (Capacitor.isNativePlatform()) {
      const m = await import("@capacitor/haptics");
      plugin = m.Haptics;
    } else plugin = false;
  } catch { plugin = false; }
  return plugin;
}

function web(ms) {
  try { if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(ms); } catch { /* sin motor */ }
}

async function correr(nativo, fallback) {
  const h = await haptics();
  if (h) { try { await nativo(h); return; } catch { /* sigue al fallback */ } }
  web(fallback);
}

/** El clic del obturador: la única vibración frecuente justificada. */
export const vibrarObturador = () => correr(h => h.impact({ style: "MEDIUM" }), 20);
/** La IA terminó, se guardó, se exportó. */
export const vibrarExito = () => correr(h => h.notification({ type: "SUCCESS" }), [15, 40, 15]);
/** Algo destructivo se va a hacer o se hizo (borrar). */
export const vibrarAviso = () => correr(h => h.notification({ type: "WARNING" }), [30, 30, 30]);
/** Falló de verdad. */
export const vibrarError = () => correr(h => h.notification({ type: "ERROR" }), [50, 40, 50]);
/** Cambio de selección (segmentado, más y menos). Muy suave. */
export const vibrarSeleccion = () => correr(h => h.selectionChanged(), 8);
