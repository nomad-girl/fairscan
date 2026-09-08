import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createAutosave, AUTOSAVE_DELAY_MS } from '../autosave.js';

describe('createAutosave', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('no escribe en la base con cada tecla: espera a que la usuaria pare', () => {
    const onSave = vi.fn();
    const a = createAutosave(onSave);
    a.schedule('price', '1');
    a.schedule('price', '12');
    a.schedule('price', '12.5');
    vi.advanceTimersByTime(AUTOSAVE_DELAY_MS - 1);
    expect(onSave).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith({ price: '12.5' });
  });

  it('junta varios campos en un solo guardado', () => {
    const onSave = vi.fn();
    const a = createAutosave(onSave);
    a.schedule('price', '10');
    a.schedule('moq', '200');
    vi.runAllTimers();
    expect(onSave).toHaveBeenCalledWith({ price: '10', moq: '200' });
  });

  it('flush guarda al instante lo pendiente (salir de la app, cerrar la ficha)', () => {
    const onSave = vi.fn();
    const a = createAutosave(onSave);
    a.schedule('notes', 'pagar 30% adelantado');
    expect(a.flush()).toBe(true);
    expect(onSave).toHaveBeenCalledWith({ notes: 'pagar 30% adelantado' });
    // La espera quedó cancelada: no guarda dos veces.
    vi.runAllTimers();
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('flush sin nada pendiente no hace nada y lo dice', () => {
    const onSave = vi.fn();
    const a = createAutosave(onSave);
    expect(a.flush()).toBe(false);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('avisa el estado: pendiente mientras escribís, guardado al terminar', () => {
    const states = [];
    const a = createAutosave(() => {}, { onState: s => states.push(s) });
    a.schedule('price', '5');
    expect(states).toEqual(['pending']);
    vi.runAllTimers();
    expect(states).toEqual(['pending', 'saved']);
    expect(a.hasPending()).toBe(false);
  });

  it('cancel descarta lo pendiente sin guardar', () => {
    const onSave = vi.fn();
    const a = createAutosave(onSave);
    a.schedule('price', '99');
    a.cancel();
    vi.runAllTimers();
    expect(onSave).not.toHaveBeenCalled();
    expect(a.hasPending()).toBe(false);
  });
});
