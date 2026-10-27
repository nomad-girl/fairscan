/**
 * Pasos del primer uso (25/10/2026, consignas de Nati y Clau del 26/10 en el buzón).
 *
 * El 24/10 se vio que de cada cuatro personas que abren la app, tres no llegan a la primera foto,
 * y no había forma de saber dónde se quedaban. Esto anota cada paso en `public.eventos_uso`
 * (solo inserta; nadie lee con la clave pública), sin datos personales:
 *   primera_apertura · empezar · cuenta_abierta · permiso_camara · primera_foto · ia_resultado.
 *
 * Reglas:
 *  - Nunca bloquea ni falla: si no hay señal, queda en una cola corta en el teléfono y sale después.
 *  - Si la tabla todavía no existe, la cola queda guardada (tope 30) hasta que exista; si la base lo rechaza por otra cosa, se descarta.
 *  - Los que son "una vez" se anotan una sola vez por instalación.
 */
import { Capacitor } from '@capacitor/core';
import { supabase } from './supabase.js';

const CLAVE_COLA = 'fs_eventos_cola';
const CLAVE_INSTALACION = 'fs_instalacion';
const PREFIJO_UNA_VEZ = 'fs_evento_hecho_';
const MAX_COLA = 30;

function guardado(store) { try { return store || globalThis.localStorage || null; } catch { return null; } }

/** Un identificador al azar por instalación: sirve para unir pasos de alguien que todavía no tiene sesión. */
export function instalacion(store) {
  const s = guardado(store);
  try {
    let id = s?.getItem(CLAVE_INSTALACION);
    if (!id) { id = (globalThis.crypto?.randomUUID?.() || `i${Date.now()}${Math.random().toString(36).slice(2, 10)}`); s?.setItem(CLAVE_INSTALACION, id); }
    return id;
  } catch { return null; }
}

function leerCola(s) { try { const v = JSON.parse(s?.getItem(CLAVE_COLA) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } }
function escribirCola(s, cola) { try { s?.setItem(CLAVE_COLA, JSON.stringify(cola.slice(-MAX_COLA))); } catch { /* sin almacenamiento: se pierde, no importa */ } }

function plataforma() { try { return Capacitor.getPlatform(); } catch { return 'web'; } }
function version() { return typeof __APP_VERSION__ !== 'undefined' ? String(__APP_VERSION__).slice(0, 24) : 'dev'; }

/** Arma la fila tal como va a la base (exportada para los tests). */
export function fila(nombre, datos, store) {
  return { nombre: String(nombre).slice(0, 40), datos: datos && Object.keys(datos).length ? datos : null, instalacion: instalacion(store), plataforma: plataforma(), version: version(), cuando: new Date().toISOString() };
}

let enviando = false;
/** Manda lo que haya en la cola. Si la base no acepta (sin tabla, sin sesión), la cola se vacía igual: no se reintenta para siempre. */
export async function vaciarCola({ store, cliente = supabase } = {}) {
  const s = guardado(store);
  if (enviando || !cliente) return 0;
  const cola = leerCola(s);
  if (!cola.length) return 0;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 0;
  enviando = true;
  try {
    const { data: ses } = await cliente.auth.getSession();
    if (!ses?.session) return 0; // sin sesión todavía: se manda en el próximo intento
    const filas = cola.map(({ cuando, ...f }) => ({ ...f, creado_at: cuando }));
    const { error } = await cliente.from('eventos_uso').insert(filas);
    if (error && /network|fetch|timeout/i.test(error.message || '')) return 0; // sin señal real: se reintenta
    // La tabla todavía no existe (la crea Nati con el SQL del 25/10): se guarda la cola (tope 30) para cuando exista
    if (error && (error.code === '42P01' || error.code === 'PGRST205' || /does not exist|could not find the table/i.test(error.message || ''))) return 0;
    // Solo se sacan los que se mandaron: lo anotado mientras se enviaba queda para el próximo envío (27/10: se perdía)
    escribirCola(s, leerCola(s).slice(cola.length));
    if (leerCola(s).length) setTimeout(() => vaciarCola({ store, cliente }).catch(() => {}), 0);
    return error ? 0 : filas.length;
  } catch { return 0; }
  finally { enviando = false; }
}

/** Anota un paso. `unaVez` lo anota una sola vez por instalación. Nunca tira error. */
export function anotar(nombre, datos = {}, { unaVez = false, store, cliente } = {}) {
  const s = guardado(store);
  try {
    if (unaVez) { if (s?.getItem(PREFIJO_UNA_VEZ + nombre)) return false; s?.setItem(PREFIJO_UNA_VEZ + nombre, '1'); }
    escribirCola(s, [...leerCola(s), fila(nombre, datos, s)]);
  } catch { return false; }
  vaciarCola({ store: s, cliente }).catch(() => {});
  return true;
}

/** ¿Está en China? Ahí Google no funciona sin VPN (caso Ganga Home, 25/10): se sugiere Apple o mail. */
export function pareceChina(zona) {
  let z = zona;
  try { if (!z) z = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { z = ''; }
  return /^Asia\/(Shanghai|Chongqing|Chungking|Harbin|Urumqi|Kashgar|Macau)$/.test(z || '') || z === 'PRC';
}
