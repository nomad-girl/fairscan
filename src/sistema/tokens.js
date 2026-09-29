/**
 * El sistema visual de FairScan en un solo lugar.
 *
 * Sale de `sistema-visual.md` (las cinco decisiones de Nati del 15/09/2026) y de
 * `propuesta-experiencia.md` (movimiento). Nada de esto se vuelve a escribir a
 * mano en una pantalla: cada componente y cada pantalla nueva lee de acá.
 *
 * Reglas que este archivo hace cumplir:
 *   · Seis tamaños de letra, piso 13. Base regular; negrita solo en lo que manda.
 *   · Todo lo tocable mide 44 px o más.
 *   · Tres colores con significado: naranja (acción, marca, en proceso), verde
 *     (dinero), rojo (irreversible). El resto es neutro.
 *   · El modo claro es el principal; el oscuro se deriva.
 *   · Movimiento corto, cancelable, nunca en lo frecuente.
 */

// ── Tipografía ──────────────────────────────────────────────────────────────

export const FUENTE = "'DM Sans', -apple-system, 'Segoe UI', sans-serif";

/** Los seis pasos. Nombres por rol, no por tamaño, para que la escala se pueda cambiar en un solo lugar. */
export const ESCALA = {
  pie:       { px: 13, peso: 400, alto: 1.45 }, // texto secundario, chips, ayudas
  cuerpo:    { px: 15, peso: 500, alto: 1.45 }, // nombre de producto, etiquetas, botones, campos
  destacado: { px: 17, peso: 700, alto: 1.3 },  // precio en fila, número que manda en una tarjeta
  titulo:    { px: 20, peso: 700, alto: 1.25 }, // título de pantalla, nombre en la ficha
  grande:    { px: 24, peso: 700, alto: 1.2 },  // precio en la ficha, contador del stand
  enorme:    { px: 30, peso: 700, alto: 1.15 }, // bienvenida y éxito, nada más
};

/** Los únicos pesos permitidos. No existen 600 ni 800. */
export const PESOS = { regular: 400, medio: 500, negrita: 700 };

/** Sección en mayúsculas chicas: pie + espaciado. */
export const SECCION = { px: 13, peso: 600, espaciado: "0.07em", transform: "uppercase" };

// ── Densidad y área táctil ──────────────────────────────────────────────────

export const ALTURAS = {
  tocable: 44,        // mínimo de todo lo que se toca
  botonPrincipal: 56,
  botonSecundario: 44,
  icono: 44,
  fila: 72,           // fila de lista (producto, proveedor, ajuste)
  miniatura: 52,
  chip: 40,
  campo: 44,
  obturador: 72,
};

export const ESPACIOS = {
  entreFilas: 12,
  entreChips: 8,
  margenLateral: 14,
  unidad: 4,          // todo el espaciado en múltiplos de 4
};

export const RADIOS = { chico: 10, medio: 12, grande: 14, pildora: 999 };

// ── Color ───────────────────────────────────────────────────────────────────

/**
 * Paleta por rol. El claro es la madre; el oscuro es su derivación cuidada.
 * `accent` es el único color de acción; `green` dinero; `red` irreversible.
 * Los "soft" son el mismo color con transparencia, para fondos de chips y botones secundarios.
 */
export const PALETAS = {
  // Identidad nueva (Nati, 28/09/2026; `Identidad/guia-identidad.md`): neutros cálidos cacao/crema, naranja feria,
  // texto cacao sobre naranja. Los contrastes de cada par están en el test de contraste.
  claro: {
    bg: "#FFF3EA",                // crema
    card: "#FFFFFF",
    surface: "#FFFFFF",
    border: "#EAD9CC",
    text: "#2B1206",              // cacao: 16,2:1 sobre crema
    muted: "#5A3522",             // 9,8:1
    dim: "#8A4B2A",               // 6,2:1
    accent: "#FF4F2A",            // naranja feria: relleno, borde, ícono (≥ 3:1 sobre crema y blanco)
    accentTexto: "#B8341A",       // el naranja cuando es texto (≥ 4,5:1 sobre blanco y crema)
    accentSoft: "rgba(255, 79, 42, 0.10)",
    green: "#1F7A45",             // dinero, y solo dinero
    greenSoft: "rgba(31, 122, 69, 0.10)",
    red: "#B3261E",               // irreversible; se distingue del naranja por luminosidad y siempre va con ícono o palabra
    redSoft: "rgba(179, 38, 30, 0.10)",
    /** El botón principal: relleno plano naranja con texto cacao (5,4:1). Se fue el degradé y el texto blanco. */
    botonPrincipal: { desde: "#FF4F2A", hasta: "#FF4F2A", texto: "#2B1206" },
    /** El amarillo (29/09, Nati: "le da frescura"): significa hallazgo, nunca acción ni alerta; siempre con cacao encima. */
    sello: "#FFC53D",
    selloSuave: "#FFE7A8",
    selloTexto: "#2B1206",
    sombraTarjeta: "0 1px 2px rgba(43,18,6,.06), 0 4px 12px -6px rgba(43,18,6,.12)",
    velo: "rgba(43, 18, 6, 0.40)",
  },
  oscuro: {
    bg: "#1C0D06",
    card: "#2B1206",
    surface: "#241008",
    border: "#3D2215",
    text: "#FFF3EA",              // 17,4:1
    muted: "#D9BFAE",             // 10,8:1
    dim: "#A8826B",               // 5,5:1
    accent: "#FF6A45",            // 6,7:1 sobre el fondo
    accentTexto: "#FF6A45",
    accentSoft: "rgba(255, 106, 69, 0.14)",
    green: "#3FBF78",             // 8,0:1
    greenSoft: "rgba(63, 191, 120, 0.14)",
    red: "#FF6B6B",               // 6,8:1
    redSoft: "rgba(255, 107, 107, 0.14)",
    botonPrincipal: { desde: "#FF6A45", hasta: "#FF6A45", texto: "#2B1206" },
    sello: "#FFC53D",
    selloSuave: "rgba(255, 197, 61, 0.18)", // en oscuro, un tinte sobre el fondo; el texto sigue crema
    selloTexto: "#2B1206",
    sombraTarjeta: "none",
    velo: "rgba(0, 0, 0, 0.55)",
  },
};

/** Las fuentes: DM Sans para la interfaz; Bricolage Grotesque para la marca, los pasos grandes y las cifras en columna
 *  (DM Sans no trae cifras de ancho fijo, así que `tabular-nums` no hacía nada). Las dos viajan dentro del paquete. */
export const FUENTES = {
  interfaz: "'DM Sans', -apple-system, 'Segoe UI', sans-serif",
  marca: "'Bricolage Grotesque', 'DM Sans', -apple-system, sans-serif",
  numeros: "'Bricolage Grotesque', 'DM Sans', -apple-system, sans-serif",
};

/** Marcas ajenas: solo dentro de sus botones. */
export const MARCAS = { whatsapp: "#25D366", wechat: "#07C160" };

/** Los colores de marca (`Identidad/guia-identidad.md`): el sello amarillo es solo para el nombre, nunca un significado en la app. */
export const MARCA = { naranja: "#FF4F2A", naranjaClaro: "#FF6A45", cacao: "#2B1206", crema: "#FFF3EA", sello: "#FFC53D" };

/**
 * Compatibilidad con las pantallas viejas, que reciben un objeto `t` con más
 * claves (yellow, blue, purple…). Esas claves ya no tienen significado: se
 * mapean a neutros para que nada explote mientras se migra pantalla por pantalla.
 */
export function paletaCompatible(modo = "claro") {
  const p = PALETAS[modo] || PALETAS.claro;
  return {
    ...p,
    yellow: p.accent, blue: p.muted, blueSoft: p.accentSoft, purple: p.muted, purpleSoft: p.accentSoft,
  };
}

// ── Movimiento ──────────────────────────────────────────────────────────────

export const CURVAS = {
  entra: "cubic-bezier(0.05, 0.7, 0.1, 1)",   // frena al final (lo que aparece)
  sale: "cubic-bezier(0.3, 0, 0.8, 0.15)",    // acelera (lo que se va)
  estandar: "cubic-bezier(0.2, 0, 0, 1)",
  hoja: "cubic-bezier(0.32, 0.72, 0, 1)",     // la curva de iOS para hojas
};

/** Las ocho animaciones de la app, con duración en ms. Nada más se anima. */
export const MOVIMIENTO = {
  toque:        { bajada: 100, vuelta: 250, escala: 0.97 },
  obturador:    { velo: 80, miniatura: 350 },
  ficha:        { entra: 300, sale: 200 },
  hoja:         { duracion: 500, velo: 0.4 },
  lista:        { entra: 250, sale: 200, desplazamiento: 8 },
  aviso:        { entra: 250, vive: 4000 },
  iaTermino:    { tilde: 300, texto: 150 },
  cambioEstado: { fundido: 150, conteo: 400 },
  /** Con "movimiento reducido", todo desplazamiento o escalado se reemplaza por un fundido de este largo. */
  reducido:     { fundido: 150 },
};

// ── Capas ───────────────────────────────────────────────────────────────────

/** Profundidad por capas, no por sombras sueltas. */
export const CAPAS = { fondo: 0, tarjeta: 1, flotante: 10, hoja: 30, aviso: 40, velo: 20 };

// ── Variables CSS ───────────────────────────────────────────────────────────

/** Las mismas decisiones como variables CSS, para lo que se estila con clases. */
export function variablesCSS(modo = "claro") {
  const p = PALETAS[modo] || PALETAS.claro;
  const v = {
    "--fs-fuente": FUENTE,
    "--fs-bg": p.bg, "--fs-card": p.card, "--fs-surface": p.surface, "--fs-border": p.border,
    "--fs-text": p.text, "--fs-muted": p.muted, "--fs-dim": p.dim,
    "--fs-accent": p.accent, "--fs-accent-texto": p.accentTexto, "--fs-accent-soft": p.accentSoft,
    "--fs-green": p.green, "--fs-green-soft": p.greenSoft,
    "--fs-red": p.red, "--fs-red-soft": p.redSoft,
    "--fs-sombra": p.sombraTarjeta, "--fs-velo": p.velo,
    "--fs-radio-chico": `${RADIOS.chico}px`, "--fs-radio-medio": `${RADIOS.medio}px`, "--fs-radio-grande": `${RADIOS.grande}px`,
    "--fs-tocable": `${ALTURAS.tocable}px`,
    "--fs-curva-entra": CURVAS.entra, "--fs-curva-sale": CURVAS.sale, "--fs-curva-hoja": CURVAS.hoja,
  };
  for (const [nombre, e] of Object.entries(ESCALA)) {
    v[`--fs-${nombre}`] = `${e.px}px`;
    v[`--fs-${nombre}-peso`] = String(e.peso);
  }
  return v;
}

/** Estilo en línea para un texto de la escala: `estiloTexto('cuerpo')`. */
export function estiloTexto(nombre, extra = {}) {
  const e = ESCALA[nombre] || ESCALA.cuerpo;
  return { fontFamily: FUENTE, fontSize: e.px, fontWeight: e.peso, lineHeight: e.alto, ...extra };
}
