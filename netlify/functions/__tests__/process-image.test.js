/**
 * process-image nunca devuelve "Could not parse AI response" (29/10/2026, buzón: Pablo Figueredo).
 *
 * El 28/10 la primera foto de tres instalaciones nuevas falló tres veces seguidas: la IA había contestado en
 * prosa (sin JSON) y la función respondía 500. Acá se prueba la parte que se puede probar sin llamar a Anthropic:
 * cómo se saca el JSON de la respuesta, qué se devuelve cuando no lo hay, y qué código lleva cada fallo real.
 */
import { describe, it, expect } from 'vitest';
import { extraerJson, resultadoVacio, respuestaDeFallo } from '../process-image.js';

describe('process-image · leer la respuesta de la IA', () => {
  it('entiende el JSON pelado, el JSON con ```json y el JSON con texto alrededor', () => {
    expect(extraerJson('{"name":"Taza"}')).toEqual({ name: 'Taza' });
    expect(extraerJson('```json\n{\n  "name": "Taza"\n}\n```')).toEqual({ name: 'Taza' });
    expect(extraerJson('Acá va:\n{"name":"Taza"}\nListo.')).toEqual({ name: 'Taza' });
  });

  it('cuando la IA contesta en prosa, no hay JSON y se devuelve un resultado vacío, no un error', () => {
    expect(extraerJson('No puedo identificar personas en imágenes.')).toBeNull();
    expect(extraerJson('')).toBeNull();
    expect(extraerJson(undefined)).toBeNull();
    const r = resultadoVacio('No puedo identificar personas en imágenes.');
    expect(r.sinProducto).toBe(true);
    expect(r.name).toBe('');
    expect(r.confidence).toBe(0);
    expect(r.nota).toMatch(/No puedo/);
  });

  it('los fallos reales de Anthropic salen con un código que la app sabe explicar (429 tope, 503 caído, 422 foto)', () => {
    expect(respuestaDeFallo({ status: 429 }).statusCode).toBe(429);
    expect(respuestaDeFallo({ status: 529 }).statusCode).toBe(503);
    expect(respuestaDeFallo({ status: 500 }).statusCode).toBe(503);
    expect(respuestaDeFallo({ status: 400 }).statusCode).toBe(422);
    expect(respuestaDeFallo({ message: 'Connection error.' })).toEqual({ statusCode: 503, error: 'No se pudo llegar a la IA (network)' });
    expect(respuestaDeFallo({ status: 418 }).statusCode).toBe(500);
  });
});
