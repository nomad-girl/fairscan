import { describe, it, expect } from 'vitest';
import { leerGuia, guardarGuia, siguienteGuia, avisoVisible, CLAVE_GUIA } from '../guiaPrimeraVez.js';

const memoria = (inicial = {}) => { const m = new Map(Object.entries(inicial)); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };

describe('guía de la primera vez', () => {
  it('arranca en el paso 1; quien vio la guía vieja no la ve; el estado viejo 3v pasa a 4', () => {
    expect(leerGuia(memoria())).toBe('1');
    expect(leerGuia(memoria({ 'fairscan.guiaCamaraVista': '1' }))).toBe('hecha');
    expect(leerGuia(memoria({ [CLAVE_GUIA]: '3v' }))).toBe('4');
  });
  it('recuerda el estado', () => {
    const s = memoria(); guardarGuia('3', s);
    expect(leerGuia(s)).toBe('3');
  });
  it('recorrido haciendo: foto → precio → tarjeta → catálogo', () => {
    let e = '1';
    expect(avisoVisible(e)).toBe(1);
    e = siguienteGuia(e, 'fotoProducto'); expect(e).toBe('2');
    expect(avisoVisible(e, { barraPrecio: true })).toBe(2);
    expect(avisoVisible(e, { barraPrecio: true, escribiendo: true })).toBe(null);
    e = siguienteGuia(e, 'precioCerrado'); expect(e).toBe('3');
    expect(avisoVisible(e, { pausa: false })).toBe(null);
    expect(avisoVisible(e, { pausa: true })).toBe(3);
    e = siguienteGuia(e, 'irATarjeta'); expect(e).toBe('3e');
    expect(avisoVisible(e, { pausa: true })).toBe(null);
    e = siguienteGuia(e, 'fotoTarjeta'); expect(e).toBe('4');
    expect(avisoVisible(e)).toBe(4);
    e = siguienteGuia(e, 'listo'); expect(e).toBe('hecha');
  });
  it('recorrido con Siguiente, sin hacer nada', () => {
    let e = '1';
    e = siguienteGuia(e, 'siguiente'); expect(e).toBe('2');
    expect(avisoVisible(e, { barraPrecio: false })).toBe(null); // sin barra y sin Siguiente: se pasa al 3
    expect(avisoVisible(e, { barraPrecio: false, manual: true })).toBe(2); // con Siguiente se explica igual
    e = siguienteGuia(e, 'sinBarraDePrecio'); expect(e).toBe('3');
    expect(avisoVisible(e, { manual: true })).toBe(3); // sin esperar
    e = siguienteGuia(e, 'siguiente'); expect(e).toBe('4');
    e = siguienteGuia(e, 'siguiente'); expect(e).toBe('hecha');
  });
  it('nunca interrumpe en modo tarjeta ni con algo abierto; saltar apaga todo', () => {
    expect(avisoVisible('1', { esTarjeta: true })).toBe(null);
    expect(avisoVisible('4', { ocupada: true })).toBe(null);
    expect(siguienteGuia('2', 'saltar')).toBe('hecha');
    expect(siguienteGuia('1', 'fotoTarjeta')).toBe('4');
  });
});
