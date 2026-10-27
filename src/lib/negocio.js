import { configDeChat } from './chatSoporte.js';
import { configDeAnalitica } from './analitica.js';
/**
 * Los números del modelo de negocio (pieza 5.1): cuántos escaneos trae el trial,
 * el regalo de emergencia, qué packs se ofrecen y a qué precio.
 *
 * Viven en la tabla `config` de Supabase (fila `negocio`) y se cambian desde ahí
 * sin publicar una versión. La app los lee al arrancar y los guarda en la base
 * local para cuando no haya señal. Estos son los valores por defecto: se usan solo si nunca se pudo
 * leer el servidor. Packs según la decisión del 29/09 (500 · 1.000 destacado · 2.000 "pase de feria";
 * se fue el de 3.000). El `usd` es el precio de referencia del escalón medio (Latinoamérica); el precio
 * real lo pone cada tienda por país en tres escalones, y lo mostrará RevenueCat cuando A5/B3 existan.
 */

export const NEGOCIO_POR_DEFECTO = Object.freeze({
  trial: 15,
  emergencia: 20,
  tarjetas_gratis: true,
  // Plan B (14/10): la app sale a las tiendas con la compra apagada; se prende desde la fila `negocio`
  // (`compras_activas: true`) cuando la compra esté probada de punta a punta, sin publicar versión.
  compras_activas: false,
  // Cuentas (ids de Supabase) que ven la compra aunque esté apagada para todo el mundo: para probar la
  // compra sandbox en el teléfono de Nati sin prenderla para la revisión de Apple (16/10).
  compras_pruebas: [],
  // Chat de soporte (26/10, Nati: Chatwoot, una bandeja por app): { url, token } de la bandeja de FairScan.
  // null = sin chat (queda el mail). Se cambia desde la fila `negocio` sin publicar versión.
  soporte_chat: null,
  // PostHog (27/10, bloque D): { host, key } del proyecto de la app. null = apagado. Se enciende sin publicar versión.
  analitica: null,
  packs: [
    { id: 'pack_500', escaneos: 500, usd: 19.99 },
    { id: 'pack_1000', escaneos: 1000, usd: 29.99, ancla: true },
    { id: 'pack_2000', escaneos: 2000, usd: 49.99 },
  ],
});

/** Valida lo que llega del servidor; lo que falte o esté mal toma el valor por defecto. */
/** ¿La compra está activa en esta plataforma? (`compras_activas` puede ser true o un objeto por plataforma) */
export function comprasActivasEn(negocio, plataforma) {
  const v = negocio?.compras_activas;
  if (v === true) return true;
  if (v && typeof v === 'object') return v[plataforma] === true;
  return false;
}

/**
 * Chat y analítica se pueden encender primero solo para las cuentas de prueba (27/10, pedido de Clau: la config es
 * global y pega en producción al instante): `{ ..., "solo_pruebas": true }` las limita a `compras_pruebas`
 * (la lista de cuentas de prueba, de Nati). Sin la marca, para todo el mundo.
 */
function conSoloPruebas(config, crudo) {
  return config ? { ...config, solo_pruebas: crudo?.solo_pruebas === true } : null;
}

/** La config de `clave` ('soporte_chat' o 'analitica') tal como la ve esta cuenta: null si está limitada a las de prueba y no es una. */
export function paraEstaCuenta(negocio, clave, userId) {
  const c = negocio?.[clave];
  if (!c) return null;
  if (c.solo_pruebas && !(negocio.compras_pruebas || []).includes(userId)) return null;
  return c;
}

export function normalizarNegocio(valor) {
  const v = valor && typeof valor === 'object' ? valor : {};
  const entero = (x, def) => (Number.isInteger(x) && x >= 0 ? x : def);
  const packs = Array.isArray(v.packs)
    ? v.packs.filter(p => p && typeof p.id === 'string' && Number.isInteger(p.escaneos) && p.escaneos > 0 && typeof p.usd === 'number' && p.usd > 0)
    : [];
  return {
    trial: entero(v.trial, NEGOCIO_POR_DEFECTO.trial),
    emergencia: entero(v.emergencia, NEGOCIO_POR_DEFECTO.emergencia),
    tarjetas_gratis: typeof v.tarjetas_gratis === 'boolean' ? v.tarjetas_gratis : NEGOCIO_POR_DEFECTO.tarjetas_gratis,
    // true para todos, o por plataforma: { "android": true, "ios": false } (22/10: Android se prende antes que iOS,
    // porque la 1.0 de Apple está en revisión con la compra apagada y sin los packs adjuntos).
    compras_activas: v.compras_activas === true ? true
      : (v.compras_activas && typeof v.compras_activas === 'object') ? { ios: v.compras_activas.ios === true, android: v.compras_activas.android === true, web: v.compras_activas.web === true }
      : false,
    compras_pruebas: Array.isArray(v.compras_pruebas) ? v.compras_pruebas.filter(x => typeof x === 'string') : [],
    packs: packs.length ? packs : NEGOCIO_POR_DEFECTO.packs,
    soporte_chat: conSoloPruebas(configDeChat(v.soporte_chat), v.soporte_chat),
    analitica: conSoloPruebas(configDeAnalitica(v.analitica), v.analitica),
  };
}

/**
 * Lee la config del servidor y la deja en la base local. Sin señal, devuelve la
 * última guardada; sin nada guardado, los valores por defecto.
 * @param {{ from: Function }} supabase  cliente de Supabase (o null)
 * @param {{ get: Function, save: Function }} settings  getSettings/saveSettings de db.js
 */
export async function cargarNegocio(supabase, settings) {
  const previa = (await settings.get())?.negocio;
  if (supabase) {
    try {
      const { data, error } = await supabase.from('config').select('value, updated_at').eq('key', 'negocio').maybeSingle();
      if (!error && data?.value) {
        const negocio = normalizarNegocio(data.value);
        await settings.save({ negocio, negocioAt: data.updated_at || new Date().toISOString() });
        return negocio;
      }
    } catch { /* sin señal: se usa lo guardado */ }
  }
  return previa ? normalizarNegocio(previa) : { ...NEGOCIO_POR_DEFECTO, packs: [...NEGOCIO_POR_DEFECTO.packs] };
}
