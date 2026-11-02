// E26 (02/11/2026): qué se ofrece al cerrar el muro sin comprar.
import { describe, it, expect } from 'vitest';
import { regaloDelMuro, queOfrecerAlCerrar, respuestaMotivo, REGALO_POR_DEFECTO } from '../trasElMuro.js';

const DIA = 24 * 60 * 60 * 1000;

describe('E26 · después del muro', () => {
  it('el regalo es REGALO10 salvo que el servidor diga otro o lo apague', () => {
    expect(regaloDelMuro({})).toEqual(REGALO_POR_DEFECTO);
    expect(regaloDelMuro({ regalo_muro: { codigo: ' feria25 ', escaneos: 25 } })).toEqual({ codigo: 'FERIA25', escaneos: 25 });
    expect(regaloDelMuro({ regalo_muro: false })).toBeNull();
  });

  it('solo el muro del límite: el de Ajustes o sin muro no ofrece nada', () => {
    expect(queOfrecerAlCerrar({ paywall: { bloqueados: 0, desdeAjustes: true }, regalo: REGALO_POR_DEFECTO })).toBeNull();
    expect(queOfrecerAlCerrar({ paywall: null, regalo: REGALO_POR_DEFECTO })).toBeNull();
  });

  it('la primera vez: regalo y pregunta; con el regalo usado, solo la pregunta', () => {
    const p = { bloqueados: 6 };
    expect(queOfrecerAlCerrar({ paywall: p, regalo: REGALO_POR_DEFECTO })).toEqual({ regalo: REGALO_POR_DEFECTO, preguntar: true });
    expect(queOfrecerAlCerrar({ paywall: p, regalo: REGALO_POR_DEFECTO, regaloYaUsado: true })).toEqual({ regalo: null, preguntar: true });
  });

  it('la pregunta, una vez por día como mucho', () => {
    const ahora = 10 * DIA;
    const p = { bloqueados: 2 };
    expect(queOfrecerAlCerrar({ paywall: p, regalo: null, ultimaPregunta: ahora - DIA / 2, ahora })).toBeNull();
    expect(queOfrecerAlCerrar({ paywall: p, regalo: null, ultimaPregunta: ahora - DIA, ahora })).toEqual({ regalo: null, preguntar: true });
    expect(queOfrecerAlCerrar({ paywall: p, regalo: REGALO_POR_DEFECTO, ultimaPregunta: ahora - 1, ahora })).toEqual({ regalo: REGALO_POR_DEFECTO, preguntar: false });
  });

  it('la respuesta: motivo conocido; el texto solo con "otra" y recortado', () => {
    expect(respuestaMotivo('precio', 'ignorado')).toEqual({ motivo: 'precio' });
    expect(respuestaMotivo('otra', '  quiero probar más  ')).toEqual({ motivo: 'otra', texto: 'quiero probar más' });
    expect(respuestaMotivo('otra', 'x'.repeat(500)).texto).toHaveLength(200);
    expect(respuestaMotivo('otra', '   ')).toEqual({ motivo: 'otra' });
    expect(respuestaMotivo('cualquiera')).toBeNull();
  });
});
