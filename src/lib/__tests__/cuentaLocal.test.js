import { describe, it, expect } from 'vitest';
import { debeLimpiarBaseLocal } from '../cuentaLocal.js';

describe('debeLimpiarBaseLocal', () => {
  it('otra usuaria en el mismo teléfono → se limpia', () => {
    expect(debeLimpiarBaseLocal({ lastUserId: 'nati', userId: 'prueba', roomId: 'melange', teamIds: ['nat'] }))
      .toEqual({ limpiar: true, motivo: 'otra-usuaria' });
  });
  it('la misma usuaria vuelve → no se toca nada, aunque no haya señal', () => {
    expect(debeLimpiarBaseLocal({ lastUserId: 'nati', userId: 'nati', roomId: 'melange', teamIds: null }).limpiar).toBe(false);
    expect(debeLimpiarBaseLocal({ lastUserId: 'nati', userId: 'nati', roomId: 'melange', teamIds: ['melange'] }).limpiar).toBe(false);
  });
  it('base vieja sin usuaria anotada, pero el equipo recordado no es suyo → se limpia', () => {
    expect(debeLimpiarBaseLocal({ lastUserId: undefined, userId: 'prueba', roomId: 'melange', teamIds: ['nat'] }))
      .toEqual({ limpiar: true, motivo: 'equipo-ajeno' });
  });
  it('base vieja sin usuaria anotada, equipo recordado es suyo → no se toca', () => {
    expect(debeLimpiarBaseLocal({ lastUserId: undefined, userId: 'nati', roomId: 'melange', teamIds: ['melange', 'otro'] }).limpiar).toBe(false);
  });
  it('sin señal y sin usuaria anotada, no se puede saber: no se limpia (mejor conservar)', () => {
    expect(debeLimpiarBaseLocal({ lastUserId: undefined, userId: 'prueba', roomId: 'melange', teamIds: null }).limpiar).toBe(false);
  });
  it('primera vez en el teléfono (sin equipo recordado) → nada que limpiar', () => {
    expect(debeLimpiarBaseLocal({ lastUserId: undefined, userId: 'x', roomId: null, teamIds: [] }).limpiar).toBe(false);
  });
});
