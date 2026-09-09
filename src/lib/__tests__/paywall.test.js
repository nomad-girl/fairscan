import { describe, it, expect } from 'vitest';
import { evaluarCierreDeStand, packDestacado } from '../paywall.js';

describe('evaluarCierreDeStand', () => {
  it('con saldo suficiente no pasa nada; avisa cuando quedan 5 o menos', () => {
    expect(evaluarCierreDeStand({ saldo: 15, nuevos: 3, online: true })).toEqual({ bloquear: 0, usarEmergencia: 0, mostrarPaywall: false, paywallPendiente: false, avisoQuedan: null });
    expect(evaluarCierreDeStand({ saldo: 8, nuevos: 3, online: true }).avisoQuedan).toBe(5);
    expect(evaluarCierreDeStand({ saldo: 3, nuevos: 3, online: false }).avisoQuedan).toBe(0);
  });
  it('con señal y saldo corto: bloquea los que exceden y muestra el paywall', () => {
    expect(evaluarCierreDeStand({ saldo: 2, nuevos: 5, online: true })).toMatchObject({ bloquear: 3, mostrarPaywall: true, usarEmergencia: 0 });
    expect(evaluarCierreDeStand({ saldo: 0, nuevos: 1, online: true })).toMatchObject({ bloquear: 1, mostrarPaywall: true });
    expect(evaluarCierreDeStand({ saldo: -4, nuevos: 2, online: true })).toMatchObject({ bloquear: 2, mostrarPaywall: true });
  });
  it('sin señal: usa los de emergencia (regalo), no bloquea, y deja el paywall pendiente', () => {
    expect(evaluarCierreDeStand({ saldo: 0, nuevos: 5, online: false, emergencia: 20, emergenciaUsada: 0 })).toEqual({ bloquear: 0, usarEmergencia: 5, mostrarPaywall: false, paywallPendiente: true, avisoQuedan: null });
    expect(evaluarCierreDeStand({ saldo: 0, nuevos: 5, online: false, emergencia: 20, emergenciaUsada: 18 })).toMatchObject({ bloquear: 3, usarEmergencia: 2, paywallPendiente: true });
  });
});

describe('packDestacado', () => {
  it('el ancla, o el del medio', () => {
    expect(packDestacado([{ id: 'a' }, { id: 'b', ancla: true }, { id: 'c' }]).id).toBe('b');
    expect(packDestacado([{ id: 'a' }, { id: 'b' }, { id: 'c' }]).id).toBe('b');
    expect(packDestacado([])).toBeNull();
  });
});
