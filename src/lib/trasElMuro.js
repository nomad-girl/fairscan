/**
 * Después del muro de pago (E26, buzón 02/11 (46)). El 31/10 el primer comprador que agotó los 15 gratis cerró el muro
 * sin comprar y no supimos por qué; el regalo de 10 escaneos le llegó por mail, fuera de la app. Ahora, al cerrar el
 * muro sin comprar (el que aparece por haber llegado al límite, no el de Ajustes):
 *  · la primera vez se le ofrece el regalo ahí mismo, con un toque: es el código REGALO10 aplicado por la app. La base
 *    ya impide canjearlo dos veces con la misma cuenta (canjes único por código y cuenta);
 *  · se le pregunta qué lo frenó, una vez por día como mucho, para no insistir.
 * Regla de Nati (02/11): nada que se repita por usuario depende de ella. Esto no necesita SQL ni escrituras a mano.
 */
export const MOTIVOS = ["precio", "noAhora", "noConvence", "otra"];
export const REGALO_POR_DEFECTO = { codigo: "REGALO10", escaneos: 10 };
const UN_DIA = 24 * 60 * 60 * 1000;

/** El regalo que ofrece el muro. Se puede cambiar desde el servidor (config `negocio.regalo_muro`) o apagar con `false`. */
export function regaloDelMuro(negocio) {
  const r = negocio?.regalo_muro;
  if (r === false) return null;
  if (r && typeof r.codigo === "string" && r.codigo.trim()) return { codigo: r.codigo.trim().toUpperCase(), escaneos: Number(r.escaneos) || 10 };
  return REGALO_POR_DEFECTO;
}

/**
 * Qué mostrar al cerrar el muro sin comprar. Null si nada.
 * @returns {{ regalo: {codigo:string, escaneos:number}|null, preguntar: boolean } | null}
 */
export function queOfrecerAlCerrar({ paywall, regalo, regaloYaUsado = false, ultimaPregunta = 0, ahora = Date.now() }) {
  if (!paywall || paywall.desdeAjustes) return null;
  const conRegalo = regalo && !regaloYaUsado ? regalo : null;
  const preguntar = !ultimaPregunta || ahora - ultimaPregunta >= UN_DIA;
  if (!conRegalo && !preguntar) return null;
  return { regalo: conRegalo, preguntar };
}

/** Lo que se guarda en la base: el motivo y, si eligió "otra", el texto recortado. */
export function respuestaMotivo(motivo, texto = "") {
  if (!MOTIVOS.includes(motivo)) return null;
  const libre = motivo === "otra" ? String(texto || "").trim().slice(0, 200) : "";
  return { motivo, ...(libre ? { texto: libre } : {}) };
}
