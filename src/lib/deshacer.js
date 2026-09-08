/**
 * Deshacer al borrar (U7 de la auditoría).
 *
 * Borrar era un botón rojo más una confirmación, y listo: no volvía. Deslizar en
 * la lista borraba con menos fricción todavía. Esto pone una ventana de cinco
 * segundos entre "toqué borrar" y "se borró de verdad": la pantalla lo saca al
 * instante (se siente inmediato), pero la base no se toca hasta que pasa la
 * ventana. Si en el medio se toca "Deshacer", se restaura y nada se borró.
 *
 * Reglas:
 * · Solo hay un borrado pendiente a la vez. Si llega otro, el anterior se
 *   confirma primero (no se acumulan, no se pierden).
 * · Si la app se cierra o pasa a segundo plano con algo pendiente, se confirma
 *   al instante: lo que la usuaria vio borrado, queda borrado.
 *
 * Lógica pura, sin React ni base: se testea con relojes falsos.
 */

export const VENTANA_DESHACER_MS = 5000;

/**
 * @param {{ delay?: number, onCambio?: (pendiente: {mensaje: string}|null) => void }} [opts]
 */
export function crearPapelera(opts = {}) {
  const delay = opts.delay ?? VENTANA_DESHACER_MS;
  const onCambio = opts.onCambio || (() => {});
  let pendiente = null; // { mensaje, confirmar, restaurar }
  let timer = null;

  const limpiar = () => {
    if (timer) { clearTimeout(timer); timer = null; }
    pendiente = null;
    onCambio(null);
  };

  /** Ejecuta el borrado real de lo pendiente, si hay. */
  const confirmarAhora = async () => {
    if (!pendiente) return false;
    const { confirmar } = pendiente;
    limpiar();
    await confirmar();
    return true;
  };

  /**
   * Anota un borrado. `restaurar` deshace el cambio visual; `confirmar` borra de
   * verdad. Cualquier borrado anterior pendiente se confirma antes.
   */
  const programar = async ({ mensaje, confirmar, restaurar }) => {
    await confirmarAhora();
    pendiente = { mensaje, confirmar, restaurar };
    onCambio({ mensaje });
    timer = setTimeout(() => { confirmarAhora(); }, delay);
  };

  /** "Deshacer": vuelve todo a como estaba. Devuelve si había algo que deshacer. */
  const deshacer = () => {
    if (!pendiente) return false;
    const { restaurar } = pendiente;
    limpiar();
    restaurar();
    return true;
  };

  return { programar, deshacer, confirmarAhora, hayPendiente: () => !!pendiente };
}
