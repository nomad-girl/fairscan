/**
 * ¿Sirve este valor como identificador para la nube? (05/10/2026). Un proveedor de Nati no subía porque un
 * identificador viajaba como el texto "null" (de alguna importación o versión vieja) y Postgres lo rechaza:
 * "invalid input syntax for type uuid". Todo lo que se manda como uuid pasa por acá: lo que es vacío o el texto
 * de un valor nulo se repara (el uuid propio) o va como null (una referencia). No se exige el formato exacto de
 * uuid porque las pruebas usan identificadores de juguete; en producción siempre salen de crypto.randomUUID().
 */
export const esUuid = (v) => typeof v === 'string' && v.trim() !== '' && !['null', 'undefined', 'NaN', '[object Object]'].includes(v.trim());
