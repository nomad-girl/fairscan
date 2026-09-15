/**
 * Disparo manual del volcado completo.
 *
 * Netlify no deja llamar por HTTP a una función programada (responde 403), así
 * que `respaldo-completo` solo corre los lunes. Esta entrada NO está programada
 * y exige `Authorization: Bearer <RESPALDO_SECRET>`: sirve para verificar el
 * volcado hoy y para hacer un respaldo previo antes de cualquier reparación.
 * La lógica es la misma; vive en respaldo-completo.js.
 */
exports.handler = require("./respaldo-completo").handler;
