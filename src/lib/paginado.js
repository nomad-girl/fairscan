/**
 * Bajar TODO de una tabla de Supabase, de a páginas.
 *
 * PostgREST devuelve como máximo 1.000 filas por pedido, en silencio: un equipo
 * con 1.137 productos recibía 1.000 y los 137 más viejos nunca llegaban al
 * teléfono nuevo (10/09/2026, La Melange). Lo mismo pasó el 09/09 en la migración
 * de fotos. Acá se pide de a `tam` hasta que una página venga incompleta.
 *
 * @param {(desde:number, hasta:number) => Promise<{data:any[]|null, error:any}>} pedirPagina
 *   Recibe el rango [desde, hasta] (inclusive, base 0) y devuelve la respuesta de Supabase.
 * @param {number} [tam=1000]
 */
export async function traerTodo(pedirPagina, tam = 1000) {
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
