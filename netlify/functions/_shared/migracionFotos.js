/**
 * Pieza 2.7b · reglas puras de la migración de fotos viejas a nombres inadivinables.
 * Las usa la función programada `migrar-fotos-viejas`. Sin red: se testean solas.
 */

/** ¿La dirección ya tiene el esquema nuevo (<tipo>/<carpeta>/<token>.jpg)? */
function esUrlNueva(url) {
  return /\/(products|cards)\/[A-Za-z0-9-]{8,64}\/[A-Za-z0-9_-]{22}\.(jpg|png)$/.test(url || "");
}

/** Clave dentro del bucket a partir de la dirección pública. */
function keyDeUrl(url) {
  try { return decodeURIComponent(new URL(url).pathname.replace(/^\//, "")) || null; } catch { return null; }
}

function extDeKey(key) {
  return String(key || "").toLowerCase().endsWith(".png") ? "png" : "jpg";
}

/**
 * Carpeta de cada equipo: su administradora más antigua; si el equipo no tiene
 * miembros (salas archivadas), el id del equipo. `miembros` viene ordenado por
 * fecha de alta ascendente.
 */
function carpetaPorEquipo(miembros) {
  const m = new Map();
  for (const r of miembros || []) {
    const cur = m.get(r.team_id);
    if (!cur || (r.role === "admin" && cur.role !== "admin")) m.set(r.team_id, { user_id: r.user_id, role: r.role });
  }
  return (teamId) => m.get(teamId)?.user_id || teamId;
}

/** Fotos con esquema viejo dentro de un producto o proveedor. */
function fotosViejas(registro, tabla) {
  if (tabla === "suppliers") {
    const u = registro.card_photo_url;
    return u && !esUrlNueva(u) ? [{ i: 0, url: u }] : [];
  }
  return (registro.photo_urls || []).map((url, i) => ({ i, url })).filter(x => x.url && !esUrlNueva(x.url));
}

/** Para que la copia dentro de R2 encuentre el archivo aunque el nombre tenga acentos o espacios. */
function copySource(bucket, key) {
  return `/${bucket}/${encodeURIComponent(key).replace(/%2F/g, "/")}`;
}

module.exports = { esUrlNueva, keyDeUrl, extDeKey, carpetaPorEquipo, fotosViejas, copySource };
