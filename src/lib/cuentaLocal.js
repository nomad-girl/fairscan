/**
 * ¿La base local de este teléfono es de la usuaria que acaba de entrar?
 *
 * Lo que pasó (08/09, lo encontró Nati): cerrar sesión solo termina la sesión.
 * La base local y el "equipo recordado" quedan. Si entra otra cuenta, la app
 * reanuda la sincronización con el equipo de la cuenta anterior: la nueva ve el
 * catálogo ajeno y lo que captura va a parar al equipo ajeno (2.12).
 *
 * Regla: la base local se limpia antes de conectar nada cuando
 *   · la última usuaria registrada en la base no es la que entra, o
 *   · el equipo recordado no es ninguno de los equipos de la que entra
 *     (cubre las bases que quedaron de antes de esta regla, sin usuaria anotada).
 * Si es la misma usuaria, no se toca nada: lo no sincronizado no se pierde.
 */

/**
 * @param {object} a
 * @param {string|null|undefined} a.lastUserId  quién usó esta base por última vez
 * @param {string} a.userId                     quién está entrando
 * @param {string|null|undefined} a.roomId      equipo recordado en la base local
 * @param {string[]|null} a.teamIds             equipos de la que entra; null = no se pudo consultar (sin señal)
 * @returns {{ limpiar: boolean, motivo: string|null }}
 */
export function debeLimpiarBaseLocal({ lastUserId, userId, roomId, teamIds }) {
  if (!userId) return { limpiar: false, motivo: null };
  if (lastUserId && lastUserId !== userId) return { limpiar: true, motivo: 'otra-usuaria' };
  if (roomId && Array.isArray(teamIds) && !teamIds.includes(roomId)) return { limpiar: true, motivo: 'equipo-ajeno' };
  return { limpiar: false, motivo: null };
}
