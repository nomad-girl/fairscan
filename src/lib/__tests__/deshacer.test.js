import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { crearPapelera, VENTANA_DESHACER_MS } from '../deshacer.js';

describe('crearPapelera', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('no borra de verdad hasta que pasa la ventana', async () => {
    const confirmar = vi.fn(async () => {});
    const p = crearPapelera();
    await p.programar({ mensaje: 'Producto eliminado', confirmar, restaurar: () => {} });
    vi.advanceTimersByTime(VENTANA_DESHACER_MS - 1);
    expect(confirmar).not.toHaveBeenCalled();
    expect(p.hayPendiente()).toBe(true);
    vi.advanceTimersByTime(1);
    expect(confirmar).toHaveBeenCalledTimes(1);
    expect(p.hayPendiente()).toBe(false);
  });

  it('deshacer restaura y el borrado real nunca ocurre', async () => {
    const confirmar = vi.fn(async () => {});
    const restaurar = vi.fn();
    const p = crearPapelera();
    await p.programar({ mensaje: 'x', confirmar, restaurar });
    expect(p.deshacer()).toBe(true);
    expect(restaurar).toHaveBeenCalledTimes(1);
    vi.runAllTimers();
    expect(confirmar).not.toHaveBeenCalled();
    expect(p.deshacer()).toBe(false);
  });

  it('un segundo borrado confirma el anterior antes de empezar', async () => {
    const c1 = vi.fn(async () => {});
    const c2 = vi.fn(async () => {});
    const p = crearPapelera();
    await p.programar({ mensaje: 'uno', confirmar: c1, restaurar: () => {} });
    await p.programar({ mensaje: 'dos', confirmar: c2, restaurar: () => {} });
    expect(c1).toHaveBeenCalledTimes(1);
    expect(c2).not.toHaveBeenCalled();
    // Deshacer ahora solo afecta al segundo.
    expect(p.deshacer()).toBe(true);
    vi.runAllTimers();
    expect(c2).not.toHaveBeenCalled();
  });

  it('confirmarAhora (al cerrar la app) borra al instante lo pendiente', async () => {
    const confirmar = vi.fn(async () => {});
    const p = crearPapelera();
    await p.programar({ mensaje: 'x', confirmar, restaurar: () => {} });
    expect(await p.confirmarAhora()).toBe(true);
    expect(confirmar).toHaveBeenCalledTimes(1);
    expect(await p.confirmarAhora()).toBe(false);
  });

  it('avisa a la interfaz cuándo hay algo para deshacer y cuándo ya no', async () => {
    const cambios = [];
    const p = crearPapelera({ onCambio: c => cambios.push(c) });
    await p.programar({ mensaje: 'Producto eliminado', confirmar: async () => {}, restaurar: () => {} });
    expect(cambios).toEqual([{ mensaje: 'Producto eliminado' }]);
    vi.runAllTimers();
    expect(cambios).toEqual([{ mensaje: 'Producto eliminado' }, null]);
  });
});
