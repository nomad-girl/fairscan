import { describe, it, expect, vi } from 'vitest';

vi.mock('@capacitor/core', () => ({ Capacitor: { getPlatform: () => 'web' } }));
const open = vi.fn(async () => {});
vi.mock('capacitor-native-settings', () => ({
  NativeSettings: { open },
  AndroidSettings: { ApplicationDetails: 'application_details' },
  IOSSettings: { App: 'app' },
}));

const { clasificarError, explicarErrorDeCamara, explicarErrorDeMicrofono, instruccionesDeAjustes, abrirAjustesDeLaApp } = await import('../permisos.js');

const domErr = (name) => Object.assign(new Error(name), { name });

describe('clasificarError', () => {
  it('reconoce el "no permitir" en sus tres nombres', () => {
    for (const n of ['NotAllowedError', 'PermissionDeniedError', 'SecurityError']) expect(clasificarError(domErr(n))).toBe('denegado');
  });
  it('distingue sin cámara, cámara ocupada y navegador sin soporte', () => {
    expect(clasificarError(domErr('NotFoundError'))).toBe('sin-dispositivo');
    expect(clasificarError(domErr('NotReadableError'))).toBe('ocupado');
    expect(clasificarError(new TypeError('navigator.mediaDevices is undefined'))).toBe('no-soportado');
    expect(clasificarError(domErr('AlgoRaro'))).toBe('desconocido');
    expect(clasificarError(undefined)).toBe('desconocido');
  });
});

describe('explicarErrorDeCamara', () => {
  it('con permiso denegado en iOS: explica, da el camino a Ajustes y ofrece abrirlos', () => {
    const r = explicarErrorDeCamara(domErr('NotAllowedError'), 'ios');
    expect(r.tipo).toBe('denegado');
    expect(r.titulo).toMatch(/bloqueada/);
    expect(r.texto).toContain('Ajustes → FairScan → Cámara');
    expect(r.puedeAbrirAjustes).toBe(true);
    expect(r.sugerirGaleria).toBe(true);
  });
  it('en Android el camino es el de Android', () => {
    expect(explicarErrorDeCamara(domErr('NotAllowedError'), 'android').texto).toContain('Aplicaciones → FairScan → Permisos → Cámara');
  });
  it('en la web no hay botón de ajustes: van las instrucciones del navegador', () => {
    const r = explicarErrorDeCamara(domErr('NotAllowedError'), 'web');
    expect(r.puedeAbrirAjustes).toBe(false);
    expect(r.texto).toMatch(/candado|aA/);
  });
  it('siempre ofrece la galería como salida, sea cual sea el error', () => {
    for (const n of ['NotFoundError', 'NotReadableError', 'Otro']) expect(explicarErrorDeCamara(domErr(n), 'ios').sugerirGaleria).toBe(true);
    expect(explicarErrorDeCamara(new TypeError('x'), 'web').texto).toMatch(/galería/);
  });
});

describe('explicarErrorDeMicrofono', () => {
  it('denegado: camino a Ajustes y alternativa de escribir la nota', () => {
    const r = explicarErrorDeMicrofono(domErr('NotAllowedError'), 'ios');
    expect(r.texto).toContain('Ajustes → FairScan → Micrófono');
    expect(r.texto).toMatch(/escribir la nota/);
    expect(r.puedeAbrirAjustes).toBe(true);
    expect(r.sugerirGaleria).toBe(false);
  });
});

describe('instruccionesDeAjustes', () => {
  it('escribe el permiso con mayúscula en el camino', () => {
    expect(instruccionesDeAjustes('micrófono', 'android')).toContain('Micrófono');
  });
});

describe('abrirAjustesDeLaApp', () => {
  it('en la web no abre nada y lo dice', async () => {
    expect(await abrirAjustesDeLaApp('web')).toBe(false);
    expect(open).not.toHaveBeenCalled();
  });
  it('en nativo abre la pantalla de la app en los ajustes', async () => {
    expect(await abrirAjustesDeLaApp('ios')).toBe(true);
    expect(open).toHaveBeenCalledWith({ optionAndroid: 'application_details', optionIOS: 'app' });
  });
  it('si el plugin falla, devuelve false en vez de romper', async () => {
    open.mockRejectedValueOnce(new Error('sin plugin'));
    expect(await abrirAjustesDeLaApp('android')).toBe(false);
  });
});
