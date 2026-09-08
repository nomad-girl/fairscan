/**
 * El nombre con el que se guarda cada foto en la nube lo pone EL SERVIDOR.
 *
 * Antes lo elegía la app: `photos/nombre-de-la-empresa/42_1.jpg`. Eso era
 * adivinable (con el nombre de un proveedor y un número se llegaba a la foto) y
 * además le daba a la app poder de escribir en cualquier parte del bucket.
 *
 * Ahora: `<tipo>/<usuario>/<token>.jpg`, donde el token son 16 bytes al azar. No
 * se puede adivinar, no se puede pisar la foto de otra persona, y cada usuaria
 * tiene su carpeta (borrar la cuenta borra la carpeta). Decisión 8 de Nati.
 */

const crypto = require("crypto");

const KINDS = new Set(["products", "cards"]);

/** 16 bytes al azar en base64url: 22 caracteres, sin símbolos raros para una URL. */
function randomToken() {
  return crypto.randomBytes(16).toString("base64url");
}

function isValidKind(kind) {
  return KINDS.has(kind);
}

/**
 * @param {string} kind    'products' | 'cards'
 * @param {string} userId  id de la usuaria (uuid de Supabase)
 * @param {'jpg'|'png'} ext
 */
function buildPhotoKey(kind, userId, ext = "jpg", token = randomToken()) {
  if (!isValidKind(kind)) throw new Error(`Tipo de foto inválido: ${kind}`);
  if (typeof userId !== "string" || !/^[A-Za-z0-9-]{8,64}$/.test(userId)) throw new Error("Usuario inválido");
  if (!["jpg", "png"].includes(ext)) throw new Error("Extensión inválida");
  return `${kind}/${userId}/${token}.${ext}`;
}

module.exports = { buildPhotoKey, isValidKind, randomToken, KINDS };
