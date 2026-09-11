import { describe, it, expect, vi } from 'vitest';

vi.mock('@capacitor/core', () => ({ Capacitor: { getPlatform: () => 'web' } }));

const { MOTOR, motorDisponible, unir, idioma } = await import('../dictado.js');

describe('qué motor de dictado se usa', () => {
  it('en el teléfono, el del sistema', () => {
    expect(motorDisponible({ plataforma: 'android', ventana: {} })).toBe(MOTOR.NATIVO);
    expect(motorDisponible({ plataforma: 'ios', ventana: {} })).toBe(MOTOR.NATIVO);
  });
  it('en la web, el del navegador si existe', () => {
    expect(motorDisponible({ plataforma: 'web', ventana: { webkitSpeechRecognition: function () {} } })).toBe(MOTOR.NAVEGADOR);
    expect(motorDisponible({ plataforma: 'web', ventana: { SpeechRecognition: function () {} } })).toBe(MOTOR.NAVEGADOR);
  });
  it('si no hay ninguno, se dice que no hay (no se falla callado)', () => {
    expect(motorDisponible({ plataforma: 'web', ventana: {} })).toBe(MOTOR.NINGUNO);
  });
});

describe('unir lo dicho con lo que se está diciendo', () => {
  it('el motor nativo reenvía todo desde el principio: no se duplica', () => {
    expect(unir('el precio es', 'el precio es diez dólares')).toBe('el precio es diez dólares');
  });
  it('el del navegador manda tramos: se pegan con un espacio', () => {
    expect(unir('el precio es', 'diez dólares')).toBe('el precio es diez dólares');
  });
  it('sin nada dicho todavía, vale lo parcial', () => {
    expect(unir('', 'hola')).toBe('hola');
    expect(unir(null, 'hola')).toBe('hola');
  });
  it('un parcial vacío no borra lo que ya había', () => {
    expect(unir('ya estaba', '')).toBe('ya estaba');
    expect(unir('ya estaba', null)).toBe('ya estaba');
  });
  it('no deja espacios de más', () => {
    expect(unir('  hola  ', '  mundo  ')).toBe('hola mundo');
  });
});

describe('idioma del dictado', () => {
  it('usa el del teléfono', () => {
    expect(idioma({ language: 'zh-CN' })).toBe('zh-CN');
  });
  it('si el teléfono no lo dice, español de Argentina', () => {
    expect(idioma({})).toBe('es-AR');
  });
});
