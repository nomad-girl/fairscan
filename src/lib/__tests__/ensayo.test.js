import { describe, it, expect } from 'vitest';
import { inicioPrimerUso, marcarEnsayo, marcarPermiso, reiniciarEnsayo, primerStandGuiado, marcarPrimerStand } from '../ensayo.js';

function memoria() {
  const m = new Map();
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) };
}

describe('ensayo de feria (27/10)', () => {
  it('la primera vez, sin productos, arranca en la bienvenida; después del ensayo, en el permiso; después, en la cámara', () => {
    const s = memoria();
    expect(inicioPrimerUso({ hayProductos: false }, s)).toBe('bienvenida');
    marcarEnsayo(s);
    expect(inicioPrimerUso({ hayProductos: false }, s)).toBe('permiso');
    marcarPermiso(s);
    expect(inicioPrimerUso({ hayProductos: false }, s)).toBe(null);
  });

  it('quien ya tiene productos, o está en la compu, nunca lo ve', () => {
    const s = memoria();
    expect(inicioPrimerUso({ hayProductos: true }, s)).toBe(null);
    expect(inicioPrimerUso({ hayProductos: false, esEscritorio: true }, s)).toBe(null);
  });

  it('si la cámara ya abrió alguna vez con permiso, no se vuelve a explicar', () => {
    const s = memoria();
    marcarEnsayo(s);
    s.setItem('fs_evento_hecho_camara_ok', '1');
    expect(inicioPrimerUso({ hayProductos: false }, s)).toBe(null);
  });

  it('"Ver el ejemplo de nuevo" vuelve a empezar el ensayo', () => {
    const s = memoria();
    marcarEnsayo(s); marcarPermiso(s);
    reiniciarEnsayo(s);
    expect(inicioPrimerUso({ hayProductos: false }, s)).toBe('bienvenida');
  });

  it('el primer stand se guía una sola vez', () => {
    const s = memoria();
    expect(primerStandGuiado(s)).toBe(true);
    marcarPrimerStand(s);
    expect(primerStandGuiado(s)).toBe(false);
  });
});
