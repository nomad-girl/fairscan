/**
 * Guardado silencioso con espera corta.
 *
 * El problema (bug 3 de Nati, 07/09): la ficha de producto guardaba cada campo
 * solo cuando perdía el foco. Si escribías el precio con el teclado abierto y te
 * ibas de la app, el precio nunca se guardaba. Y nunca decía "guardado".
 *
 * Esto junta los cambios mientras se escribe y los manda a la base medio segundo
 * después de la última tecla. Si algo interrumpe antes (la pantalla se cierra, la
 * app pasa a segundo plano, el campo pierde el foco), `flush()` manda lo pendiente
 * al instante. Así el dato nunca depende de un gesto que la usuaria quizás no hace.
 *
 * Es lógica pura, sin React ni base: se testea con relojes falsos.
 */

export const AUTOSAVE_DELAY_MS = 500;

/**
 * @param {(changes: Record<string, any>) => void} onSave  recibe todos los campos
 *   pendientes juntos, una sola vez.
 * @param {{ delay?: number, onState?: (s: 'idle'|'pending'|'saved') => void }} [opts]
 */
export function createAutosave(onSave, opts = {}) {
  const delay = opts.delay ?? AUTOSAVE_DELAY_MS;
  const onState = opts.onState || (() => {});
  let pending = {};
  let timer = null;

  const hasPending = () => Object.keys(pending).length > 0;

  const flush = () => {
    if (timer) { clearTimeout(timer); timer = null; }
    if (!hasPending()) return false;
    const changes = pending;
    pending = {};
    onSave(changes);
    onState("saved");
    return true;
  };

  /** Anota un cambio y reinicia la espera. El mismo campo se pisa: gana el último. */
  const schedule = (field, value) => {
    pending[field] = value;
    onState("pending");
    if (timer) clearTimeout(timer);
    timer = setTimeout(flush, delay);
  };

  /** Descarta lo pendiente sin guardar (por ejemplo, si se borró el producto). */
  const cancel = () => {
    if (timer) { clearTimeout(timer); timer = null; }
    pending = {};
    onState("idle");
  };

  return { schedule, flush, cancel, hasPending };
}
