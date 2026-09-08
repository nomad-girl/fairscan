/**
 * Convierte un texto en algo apto para nombre de archivo o carpeta:
 * sin acentos, en minúsculas, solo letras, números y guiones.
 *
 *   "Shenzhen Glass Co."  →  "shenzhen-glass-co"
 *   "Café & Té"           →  "cafe-te"
 *   ""                    →  "sin-nombre"
 */
export function slugify(text) {
  return (text || 'sin-nombre')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50) || 'sin-nombre';
}
