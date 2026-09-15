/**
 * Traer TODO de una consulta a Supabase, de a páginas (versión para las funciones).
 *
 * PostgREST devuelve como máximo 1.000 filas por pedido, en silencio. En la app
 * ya se pagina (src/lib/paginado.js); acá faltaba, y en el borrado de cuenta eso
 * significaba que las fotos a partir de la 1.001 quedaban para siempre en el
 * bucket después de "borrá mi cuenta" (hallazgo 11 del análisis del 13/09).
 *
 * @param {(desde:number, hasta:number) => Promise<{data:any[]|null, error:any}>} pedirPagina
 * @param {number} [tam=1000]
 */
async function traerTodo(pedirPagina, tam = 1000) {
  const filas = [];
  for (let desde = 0; ; desde += tam) {
    const { data, error } = await pedirPagina(desde, desde + tam - 1);
    if (error) return { data: filas, error };
    const pagina = data || [];
    filas.push(...pagina);
    if (pagina.length < tam) break;
  }
  return { data: filas, error: null };
}

module.exports = { traerTodo };
