import { describe, it, expect } from 'vitest';
import { estadoIA, patchReintentoIA, explicarFalloIA } from '../aiEstado.js';

describe('estadoIA', () => {
  it('distingue pendiente, fallo y listo', () => {
    expect(estadoIA({ ai_processed: false })).toBe('pendiente');
    expect(estadoIA({ ai_processed: true, ai_error: 'Failed to fetch' })).toBe('fallo');
    expect(estadoIA({ ai_processed: true })).toBe('listo');
    expect(estadoIA({ ai_processed: true, ai_error: null })).toBe('listo');
  });
});

describe('patchReintentoIA', () => {
  it('vuelve a encolar desde cero y limpia el error', () => {
    expect(patchReintentoIA()).toEqual({ ai_processed: false, ai_error: null, ai_retry_count: 0 });
  });
});

describe('explicarFalloIA', () => {
  it('traduce los errores más comunes a algo accionable', () => {
    expect(explicarFalloIA('Failed to fetch')).toMatch(/señal|conexión/);
    expect(explicarFalloIA('HTTP 429 Too Many Requests')).toMatch(/tope/);
    expect(explicarFalloIA('HTTP 401')).toMatch(/sesión/);
    expect(explicarFalloIA('algo raro')).toMatch(/tres intentos/);
    expect(explicarFalloIA(undefined)).toMatch(/tres intentos/);
  });
});
