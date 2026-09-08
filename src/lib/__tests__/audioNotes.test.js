import { describe, it, expect, vi, afterEach } from 'vitest';
import { serializarAudio, esNotaValida, urlDeAudio, esPunteroMuerto, sinAudio } from '../audioNotes.js';

afterEach(() => vi.unstubAllGlobals());

describe('serializarAudio', () => {
  it('guarda los bytes reales, no un puntero', async () => {
    const blob = new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'audio/mp4' });
    const nota = await serializarAudio(blob, { duracion: 7 });
    expect(nota.type).toBe('audio/mp4');
    expect(nota.size).toBe(4);
    expect(nota.duracion).toBe(7);
    expect(new Uint8Array(nota.data)).toEqual(new Uint8Array([1, 2, 3, 4]));
  });

  it('una grabación vacía o inexistente da null en vez de una nota rota', async () => {
    expect(await serializarAudio(null)).toBeNull();
    expect(await serializarAudio(new Blob([]))).toBeNull();
  });

  it('si el navegador no informa el tipo, asume webm (lo que graba MediaRecorder)', async () => {
    const nota = await serializarAudio(new Blob([new Uint8Array([9])]));
    expect(nota.type).toBe('audio/webm');
  });
});

describe('esNotaValida / urlDeAudio', () => {
  it('reconoce una nota con bytes y arma una dirección reproducible', () => {
    const nota = { data: new Uint8Array([1, 2]).buffer, type: 'audio/webm' };
    const create = vi.fn(() => 'blob:fake');
    vi.stubGlobal('URL', { ...URL, createObjectURL: create });
    expect(esNotaValida(nota)).toBe(true);
    expect(urlDeAudio(nota)).toBe('blob:fake');
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('un audio que pasó por JSON (backup) llega como {} y no se muestra como reproducible', () => {
    expect(esNotaValida({ data: {}, type: 'audio/webm' })).toBe(false);
    expect(urlDeAudio({ data: {}, type: 'audio/webm' })).toBeNull();
    expect(urlDeAudio(null)).toBeNull();
  });
});

describe('esPunteroMuerto', () => {
  it('detecta las direcciones blob: de versiones anteriores', () => {
    expect(esPunteroMuerto('blob:https://fairscan.app/1234')).toBe(true);
    expect(esPunteroMuerto('https://cdn/audio.m4a')).toBe(false);
    expect(esPunteroMuerto(null)).toBe(false);
  });
});

describe('sinAudio', () => {
  it('saca el audio del producto y deja todo lo demás', () => {
    const p = { id: 1, name: 'Vaso', audio: { data: new ArrayBuffer(3), type: 'audio/webm' }, audioTranscript: 'hola' };
    expect(sinAudio(p)).toEqual({ id: 1, name: 'Vaso', audioTranscript: 'hola' });
    expect(sinAudio({ id: 2 })).toEqual({ id: 2 });
  });
});
