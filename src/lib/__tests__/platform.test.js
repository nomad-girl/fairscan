import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const isNative = { value: false };
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => isNative.value } }));

const { requestPersistentStorage, unregisterServiceWorkersOnNative } = await import('../platform.js');

afterEach(() => vi.unstubAllGlobals());

describe('almacenamiento persistente', () => {
  it('lo pide y devuelve "concedido" si el sistema dice que sí', async () => {
    vi.stubGlobal('navigator', { storage: { persisted: async () => false, persist: async () => true } });
    expect(await requestPersistentStorage()).toBe('concedido');
  });

  it('no vuelve a pedirlo si ya estaba concedido', async () => {
    const persist = vi.fn(async () => true);
    vi.stubGlobal('navigator', { storage: { persisted: async () => true, persist } });
    expect(await requestPersistentStorage()).toBe('concedido');
    expect(persist).not.toHaveBeenCalled();
  });

  it('devuelve "denegado" si el sistema dice que no, sin romper', async () => {
    vi.stubGlobal('navigator', { storage: { persisted: async () => false, persist: async () => false } });
    expect(await requestPersistentStorage()).toBe('denegado');
  });

  it('no rompe en un navegador que no lo soporta', async () => {
    vi.stubGlobal('navigator', {});
    expect(await requestPersistentStorage()).toBe('no-disponible');
  });
});

describe('service worker en nativo', () => {
  beforeEach(() => { isNative.value = false; });

  it('en web no toca nada', async () => {
    const getRegistrations = vi.fn(async () => [{ unregister: vi.fn() }]);
    vi.stubGlobal('navigator', { serviceWorker: { getRegistrations } });
    expect(await unregisterServiceWorkersOnNative()).toBe(0);
    expect(getRegistrations).not.toHaveBeenCalled();
  });

  it('en nativo da de baja los que encuentre', async () => {
    isNative.value = true;
    const a = { unregister: vi.fn(async () => true) };
    const b = { unregister: vi.fn(async () => true) };
    vi.stubGlobal('navigator', { serviceWorker: { getRegistrations: async () => [a, b] } });
    expect(await unregisterServiceWorkersOnNative()).toBe(2);
    expect(a.unregister).toHaveBeenCalled();
    expect(b.unregister).toHaveBeenCalled();
  });

  it('en nativo sin service worker registrado, no hace nada', async () => {
    isNative.value = true;
    vi.stubGlobal('navigator', { serviceWorker: { getRegistrations: async () => [] } });
    expect(await unregisterServiceWorkersOnNative()).toBe(0);
  });
});
