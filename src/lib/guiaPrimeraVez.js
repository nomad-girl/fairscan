/**
 * La guía de la primera vez (opción B aprobada por Nati el 23/10/2026; wireframe
 * https://claude.ai/artifact/YDXLtziD3wBFR8WaDnvqz6), con los ajustes de su primera prueba (23/10): un paso más para
 * el precio, "Siguiente" en cada aviso para recorrerla sin hacer cada cosa, y la tarjeta sin esperar 4 segundos.
 *
 *   "1"    al abrir: "Sacale una foto a un producto" (señala el botón de la foto)
 *   "2"    después de la primera foto, con la barra de precio abierta: "¿A cuánto estaba?"
 *   "3"    con la barra cerrada: "Al terminar el stand, escaneá la tarjeta" (señala TARJETA)
 *   "3e"   tocó TARJETA; espera a que lea la primera tarjeta
 *   "4"    leyó la primera tarjeta (o tocó Siguiente): "Tu catálogo está acá" (señala la miniatura)
 *   "hecha" no aparece más (salvo "Ver la guía de nuevo" en Ajustes)
 *
 * Quien ya había visto la guía vieja (aviso único, 28/09) no la ve de nuevo.
 */
export const CLAVE_GUIA = 'fairscan.guia';
const CLAVE_VIEJA = 'fairscan.guiaCamaraVista';
const ESTADOS = ['1', '2', '3', '3e', '4', 'hecha'];
export const PASOS_GUIA = 4;

export function leerGuia(store = globalThis.localStorage) {
  try {
    const e = store?.getItem(CLAVE_GUIA);
    if (ESTADOS.includes(e)) return e;
    if (e === '3v') return '4'; // estado de la primera versión del mismo día
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
    case 'siguiente': return { '1': '2', '2': '3', '3': '4', '3e': '4', '4': 'hecha' }[estado] || estado;
    case 'fotoProducto': return estado === '1' ? '2' : estado;
    case 'precioCerrado': return estado === '2' ? '3' : estado;      // escribió el precio o cerró la barra
    case 'sinBarraDePrecio': return estado === '2' ? '3' : estado;   // llegó al paso 2 sin barra abierta (vino con Siguiente)
    case 'irATarjeta': return estado === '3' ? '3e' : estado;
    case 'fotoTarjeta': return ['1', '2', '3', '3e'].includes(estado) ? '4' : estado;
    case 'listo':
    case 'abrirCatalogo': return estado === '4' ? 'hecha' : estado;
    default: return estado;
  }
}

/**
 * ¿Qué aviso se ve ahora? null si ninguno.
 *  barraPrecio: la barra de precio está abierta · escribiendo: tiene el foco en esa barra
 *  pausa: pasó un momento desde la última foto o desde que se cerró la barra · manual: ya tocó "Siguiente"
 */
export function avisoVisible(estado, { esTarjeta = false, ocupada = false, barraPrecio = false, escribiendo = false, pausa = false, manual = false } = {}) {
  if (ocupada || esTarjeta) return null; // hoja abierta, otro ángulo, o modo tarjeta: no se interrumpe
  if (estado === '1') return barraPrecio ? null : 1;
  if (estado === '2') return (barraPrecio && !escribiendo) || (!barraPrecio && manual) ? 2 : null; // recorriendo con Siguiente se explica igual
  if (estado === '3') return !barraPrecio && (pausa || manual) ? 3 : null;
  if (estado === '4') return barraPrecio ? null : 4;
  return null;
}
