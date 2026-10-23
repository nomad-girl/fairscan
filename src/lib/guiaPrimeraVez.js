/**
 * La guía de la primera vez (opción B aprobada por Nati el 23/10/2026; wireframe
 * https://claude.ai/artifact/YDXLtziD3wBFR8WaDnvqz6): tres avisos sobre la cámara, cada uno cuando toca.
 *
 *   "1"     al abrir: "Sacale una foto a un producto" (señala el botón de la foto)
 *   "2"     después de la primera foto, en la primera pausa: "Al terminar el stand, escaneá la tarjeta"
 *   "3"     ya vio el 2; espera a que lea la primera tarjeta
 *   "3v"    leyó la primera tarjeta: "Tu catálogo está acá" (señala la miniatura)
 *   "hecha" no aparece más (salvo "Ver la guía de nuevo" en Ajustes)
 *
 * Quien ya había visto la guía vieja (aviso único, 28/09) no la ve de nuevo.
 */
export const CLAVE_GUIA = 'fairscan.guia';
const CLAVE_VIEJA = 'fairscan.guiaCamaraVista';
const ESTADOS = ['1', '2', '3', '3v', 'hecha'];

export function leerGuia(store = globalThis.localStorage) {
  try {
    const e = store?.getItem(CLAVE_GUIA);
    if (ESTADOS.includes(e)) return e;
    return store?.getItem(CLAVE_VIEJA) ? 'hecha' : '1';
  } catch { return 'hecha'; } // sin almacenamiento no se la muestra: no se podría recordar que ya la vio
}

export function guardarGuia(estado, store = globalThis.localStorage) {
  try { store?.setItem(CLAVE_GUIA, estado); } catch { /* modo privado */ }
  return estado;
}

/** Qué pasa con la guía después de cada cosa que hace la usuaria. Devuelve el estado nuevo. */
export function siguienteGuia(estado, evento) {
  if (estado === 'hecha') return 'hecha';
  switch (evento) {
    case 'saltar': return 'hecha';
    case 'fotoProducto': return estado === '1' ? '2' : estado;
    case 'irATarjeta':
    case 'entendido': return estado === '2' ? '3' : estado;
    case 'fotoTarjeta': return ['1', '2', '3'].includes(estado) ? '3v' : estado;
    case 'listo':
    case 'abrirCatalogo': return estado === '3v' ? 'hecha' : estado;
    default: return estado;
  }
}

/** ¿Qué aviso se ve ahora? null si ninguno. `pausa` = pasaron unos segundos desde la última foto. */
export function avisoVisible(estado, { esTarjeta = false, ocupada = false, pausa = false } = {}) {
  if (ocupada || esTarjeta) return null; // barra de precio, hoja abierta, otro ángulo, o modo tarjeta: no se interrumpe
  if (estado === '1') return 1;
  if (estado === '2' && pausa) return 2;
  if (estado === '3v') return 3;
  return null;
}
