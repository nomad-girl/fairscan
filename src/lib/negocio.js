/**
 * Los números del modelo de negocio (pieza 5.1): cuántos escaneos trae el trial,
 * el regalo de emergencia, qué packs se ofrecen y a qué precio.
 *
 * Viven en la tabla `config` de Supabase (fila `negocio`) y se cambian desde ahí
 * sin publicar una versión. La app los lee al arrancar y los guarda en la base
 * local para cuando no haya señal. Estos son los valores por defecto, iguales a
 * los decididos el 31/08: se usan solo si nunca se pudo leer el servidor.
 */

export const NEGOCIO_POR_DEFECTO = Object.freeze({
  trial: 15,
  emergencia: 20,
  tarjetas_gratis: true,
  packs: [
    { id: 'pack_500', escaneos: 500, usd: 19.99 },
    { id: 'pack_1000', escaneos: 1000, usd: 29.99, ancla: true },
    { id: 'pack_3000', escaneos: 3000, usd: 69.99 },
  ],
});

/** Valida lo que llega del servidor; lo que falte o esté mal toma el valor por defecto. */
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
    packs: packs.length ? packs : NEGOCIO_POR_DEFECTO.packs,
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
