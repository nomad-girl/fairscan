/**
 * Contador de créditos (pieza 5.2).
 *
 * Reglas decididas el 04/09: un escaneo de producto descuenta 1, una tarjeta de
 * proveedor descuenta 0. Se descuenta AL CERRAR EL STAND, no al sacar la foto. Si
 * se borra un producto dentro del mismo stand, el crédito vuelve: una foto de
 * prueba nunca cuesta plata.
 *
 * El saldo vive en el teléfono Y en el servidor. El teléfono deja capturar
 * siempre (feria sin señal): descuenta localmente y anota qué productos debe
 * informar. Cuando hay señal, se informan y el servidor contesta el saldo real,
 * que gana siempre. Esto es la parte pura; quien la usa la conecta a la base
 * local y a Supabase.
 *
 * Estado: { saldo, pendientes: [uuid…], devueltos: [uuid…] }
 */

export function estadoInicial(saldo = 0) {
  return { saldo, pendientes: [], devueltos: [] };
}

/** Cerrar el stand: cada producto nuevo descuenta 1, una sola vez. */
export function descontarStand(estado, uuids) {
  const ya = new Set([...estado.pendientes, ...(estado.informados || [])]);
  const nuevos = (uuids || []).filter(u => u && !ya.has(u));
  return {
    ...estado,
    saldo: estado.saldo - nuevos.length,
    pendientes: [...estado.pendientes, ...nuevos],
    devueltos: estado.devueltos.filter(u => !nuevos.includes(u)),
  };
}

/** Borrar un producto: si todavía no se informó, se olvida; si ya se informó, se pide la devolución. */
export function devolverProducto(estado, uuid, fueInformado) {
  if (!uuid) return estado;
  if (estado.pendientes.includes(uuid)) {
    return { ...estado, saldo: estado.saldo + 1, pendientes: estado.pendientes.filter(u => u !== uuid) };
  }
  if (fueInformado && !estado.devueltos.includes(uuid)) {
    return { ...estado, saldo: estado.saldo + 1, devueltos: [...estado.devueltos, uuid] };
  }
  return estado;
}

/** Después de hablar con el servidor: lo informado deja de estar pendiente y el saldo es el del servidor. */
export function reconciliar(estado, { informados = [], devueltos = [], saldoServidor }) {
  return {
    ...estado,
    saldo: Number.isInteger(saldoServidor) ? saldoServidor : estado.saldo,
    pendientes: estado.pendientes.filter(u => !informados.includes(u)),
    devueltos: estado.devueltos.filter(u => !devueltos.includes(u)),
  };
}

/** Cuánto mostrar: el saldo local (ya descuenta lo pendiente). */
export function saldoVisible(estado) {
  return estado?.saldo ?? 0;
}
