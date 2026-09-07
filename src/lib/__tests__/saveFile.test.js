/**
 * El export es el momento en que el catálogo se vuelve útil para la empresa, y en
 * la app empaquetada la descarga del navegador no existe. Estos tests fijan las dos
 * mitades: que en web se siga descargando, y que en nativo el archivo se escriba
 * completo y se ofrezca por la hoja de compartir.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const isNative = { value: false };
const fs = { writeFile: vi.fn(), appendFile: vi.fn(), getUri: vi.fn() };
const share = { share: vi.fn() };

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => isNative.value },
}));
vi.mock('@capacitor/filesystem', () => ({
  Filesystem: fs,
  Directory: { Cache: 'CACHE' },
}));
vi.mock('@capacitor/share', () => ({ Share: share }));

const { saveFile, sharePhotos, isNativeApp } = await import('../saveFile.js');

/** Reconstruye el archivo a partir de lo que se le mandó a Filesystem. */
function writtenBytes() {
  const parts = [
    ...fs.writeFile.mock.calls.map((c) => c[0].data),
    ...fs.appendFile.mock.calls.map((c) => c[0].data),
  ];
  return parts.reduce((acc, b64) => acc + Buffer.from(b64, 'base64').length, 0);
}

beforeEach(() => {
  // reset y no clear: clearAllMocks borra las llamadas pero deja las implementaciones,
  // así que un mockRejectedValue de un test se filtraba al siguiente.
  vi.resetAllMocks();
  isNative.value = false;
  fs.getUri.mockResolvedValue({ uri: 'file:///cache/archivo' });
  share.share.mockResolvedValue({});
});

describe('en el navegador', () => {
  beforeEach(() => {
    const a = { href: '', download: '', style: {}, click: vi.fn() };
    vi.stubGlobal('document', {
      createElement: () => a,
      body: { appendChild: vi.fn(), removeChild: vi.fn() },
    });
    vi.stubGlobal('URL', { createObjectURL: () => 'blob:x', revokeObjectURL: vi.fn() });
    globalThis.__a = a;
  });

  it('descarga con el nombre pedido', async () => {
    const res = await saveFile(new Blob(['hola']), 'export.csv');
    expect(res.ok).toBe(true);
    expect(globalThis.__a.download).toBe('export.csv');
    expect(globalThis.__a.click).toHaveBeenCalled();
  });

  it('no toca el sistema de archivos ni la hoja de compartir nativa', async () => {
    await saveFile(new Blob(['hola']), 'export.csv');
    expect(fs.writeFile).not.toHaveBeenCalled();
    expect(share.share).not.toHaveBeenCalled();
  });

  it('isNativeApp() es false', () => expect(isNativeApp()).toBe(false));
});

describe('en la app nativa', () => {
  beforeEach(() => { isNative.value = true; });

  it('escribe el archivo y abre la hoja de compartir', async () => {
    const res = await saveFile(new Blob(['hola mundo']), 'export.xlsx', { title: 'Export' });
    expect(res.ok).toBe(true);
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'export.xlsx', directory: 'CACHE' }),
    );
    expect(share.share).toHaveBeenCalledWith(
      expect.objectContaining({ files: ['file:///cache/archivo'] }),
    );
  });

  it('escribe un archivo grande de a pedazos, sin perder ni un byte', async () => {
    // 1 MB: más que el pedazo de 384 KB, así que obliga a varios appendFile.
    const size = 1024 * 1024;
    const blob = new Blob([new Uint8Array(size).fill(65)]);

    await saveFile(blob, 'grande.zip');

    expect(fs.writeFile).toHaveBeenCalledTimes(1);
    expect(fs.appendFile.mock.calls.length).toBeGreaterThan(1);
    // Lo importante: el archivo reconstruido pesa exactamente lo mismo que el original.
    expect(writtenBytes()).toBe(size);
  });

  it('un archivo chico entra en una sola escritura', async () => {
    await saveFile(new Blob(['chico']), 'chico.csv');
    expect(fs.writeFile).toHaveBeenCalledTimes(1);
    expect(fs.appendFile).not.toHaveBeenCalled();
  });

  it('si la usuaria cancela, lo dice y no lo trata como error', async () => {
    share.share.mockRejectedValue(new Error('Share canceled'));
    const res = await saveFile(new Blob(['hola']), 'export.csv');
    expect(res).toEqual({ ok: false, cancelled: true });
  });

  it('si falla escribir, avisa que no salió', async () => {
    fs.writeFile.mockRejectedValue(new Error('disco lleno'));
    const res = await saveFile(new Blob(['hola']), 'export.csv');
    expect(res.ok).toBe(false);
    expect(res.cancelled).toBeUndefined();
  });

  it('un blob vacío igual genera archivo (no rompe)', async () => {
    const res = await saveFile(new Blob([]), 'vacio.csv');
    expect(res.ok).toBe(true);
    expect(fs.writeFile).toHaveBeenCalledTimes(1);
  });
});

describe('compartir fotos en la app nativa', () => {
  beforeEach(() => { isNative.value = true; });

  it('escribe cada foto y las comparte todas juntas', async () => {
    fs.getUri
      .mockResolvedValueOnce({ uri: 'file:///cache/f1.jpg' })
      .mockResolvedValueOnce({ uri: 'file:///cache/f2.jpg' });

    const res = await sharePhotos([
      { data: 'data:image/jpeg;base64,AAAA', filename: 'f1.jpg' },
      { data: 'data:image/jpeg;base64,BBBB', filename: 'f2.jpg' },
    ]);

    expect(res.ok).toBe(true);
    expect(fs.writeFile).toHaveBeenCalledTimes(2);
    expect(share.share).toHaveBeenCalledWith(
      expect.objectContaining({ files: ['file:///cache/f1.jpg', 'file:///cache/f2.jpg'] }),
    );
  });

  it('sin fotos no hace nada', async () => {
    expect(await sharePhotos([])).toEqual({ ok: false });
    expect(share.share).not.toHaveBeenCalled();
  });
});
