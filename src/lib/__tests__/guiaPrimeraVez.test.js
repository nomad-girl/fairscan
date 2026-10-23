import { describe, it, expect } from 'vitest';
import { leerGuia, guardarGuia, siguienteGuia, avisoVisible, CLAVE_GUIA } from '../guiaPrimeraVez.js';

const memoria = (inicial = {}) => { const m = new Map(Object.entries(inicial)); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };

describe('guía de la primera vez', () => {
  it('arranca en el paso 1; quien vio la guía vieja no la ve', () => {
    expect(leerGuia(memoria())).toBe('1');
    expect(leerGuia(memoria({ 'fairscan.guiaCamaraVista': '1' }))).toBe('hecha');
  });
  it('recuerda el estado', () => {
    const s = memoria(); guardarGuia('3', s);
    expect(leerGuia(s)).toBe('3'); expect(s.getItem(CLAVE_GUIA)).toBe('3');
  });
  it('recorrido normal: foto → pausa → tarjeta → catálogo', () => {
    let e = '1';
    expect(avisoVisible(e)).toBe(1);
    e = siguienteGuia(e, 'fotoProducto'); expect(e).toBe('2');
    expect(avisoVisible(e, { pausa: false })).toBe(null);
    expect(avisoVisible(e, { pausa: true })).toBe(2);
    e = siguienteGuia(e, 'irATarjeta'); expect(e).toBe('3');
    expect(avisoVisible(e, { pausa: true })).toBe(null);
    e = siguienteGuia(e, 'fotoTarjeta'); expect(e).toBe('3v');
    expect(avisoVisible(e)).toBe(3);
    e = siguienteGuia(e, 'listo'); expect(e).toBe('hecha');
    expect(avisoVisible(e)).toBe(null);
  });
  it('nunca interrumpe en modo tarjeta ni con algo abierto', () => {
    expect(avisoVisible('1', { esTarjeta: true })).toBe(null);
    expect(avisoVisible('3v', { ocupada: true })).toBe(null);
  });
  it('saltar apaga todo; si empieza por la tarjeta va directo al aviso del catálogo', () => {
    expect(siguienteGuia('2', 'saltar')).toBe('hecha');
    expect(siguienteGuia('1', 'fotoTarjeta')).toBe('3v');
    expect(siguienteGuia('hecha', 'fotoProducto')).toBe('hecha');
  });
});
