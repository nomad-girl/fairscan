/**
 * Contraste entre dos colores según WCAG 2 (relación de luminancias).
 * 4,5:1 es el mínimo para texto normal; 3:1 para texto grande y para íconos.
 * Se usa en las pruebas para que ninguna paleta salga con texto flojo.
 */

function canal(c) {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

/** Acepta "#RRGGBB" y "rgb(a)(r, g, b[, a])". Devuelve [r, g, b, a]. */
export function aRGBA(color) {
  const s = String(color).trim();
  if (s.startsWith("#")) {
    const h = s.slice(1);
    const full = h.length === 3 ? h.split("").map(x => x + x).join("") : h;
    const n = parseInt(full.slice(0, 6), 16);
    const a = full.length === 8 ? parseInt(full.slice(6, 8), 16) / 255 : 1;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, a];
  }
  const m = s.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const partes = m[1].split(",").map(x => parseFloat(x));
    return [partes[0], partes[1], partes[2], partes.length > 3 ? partes[3] : 1];
  }
  throw new Error(`Color no reconocido: ${color}`);
}

/** Mezcla un color con transparencia sobre un fondo opaco. */
export function sobreFondo(color, fondo) {
  const [r, g, b, a] = aRGBA(color);
  const [fr, fg, fb] = aRGBA(fondo);
  return [Math.round(r * a + fr * (1 - a)), Math.round(g * a + fg * (1 - a)), Math.round(b * a + fb * (1 - a))];
}

export function luminancia(color, fondo = "#FFFFFF") {
  const [r, g, b] = sobreFondo(color, fondo);
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
}

/** Relación de contraste, de 1 a 21. `texto` puede tener transparencia; `fondo` tiene que ser opaco. */
export function contraste(texto, fondo) {
  const lt = luminancia(texto, fondo);
  const lf = luminancia(fondo, fondo);
  const [claro, oscuro] = lt > lf ? [lt, lf] : [lf, lt];
  return (claro + 0.05) / (oscuro + 0.05);
}
