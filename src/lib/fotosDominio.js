/**
 * El dominio propio de las fotos (20/09/2026). El bucket se sirve por `fotos.fairscan.app`:
 * el dominio `pub-….r2.dev` no se alcanza desde el iPhone de Nati (medido el 15/09: 149 de 149
 * fallaban) y cada foto tenía que dar un rodeo por una función nuestra. Las direcciones viejas
 * guardadas en la nube se traducen al mostrar; las nuevas ya nacen con el dominio propio.
 */
export const DOMINIO_VIEJO = "https://pub-c292f330c1aa4ead812d6831ce059f59.r2.dev";
export const DOMINIO_PROPIO = "https://fotos.fairscan.app";

/** Una dirección de foto de la nube, con el dominio propio. Lo que no es del bucket, igual. */
export function conDominioPropio(url) {
  if (typeof url !== "string") return url;
  return url.startsWith(DOMINIO_VIEJO) ? DOMINIO_PROPIO + url.slice(DOMINIO_VIEJO.length) : url;
}

/** ¿Es una dirección de nuestro bucket (vieja o nueva)? */
export function esFotoDelBucket(url) {
  return typeof url === "string" && (url.startsWith(DOMINIO_VIEJO) || url.startsWith(DOMINIO_PROPIO));
}
