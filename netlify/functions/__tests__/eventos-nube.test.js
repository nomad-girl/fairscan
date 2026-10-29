/**
 * eventos-nube (29/10/2026): de cada fila de la base sale el evento correcto para Loops y, cuando corresponde, el aviso
 * a Slack. Lo que no interesa (sesiones anónimas, compras de prueba, eventos sin nombre conocido) se ignora.
 */
import { describe, it, expect } from 'vitest';
import { interpretar } from '../eventos-nube.js';

describe('eventos-nube · qué sale de cada fila', () => {
  it('una cuenta nueva con mail es "alta"; una sesión anónima no', () => {
    expect(interpretar({ tabla: 'usuarios', tipo: 'INSERT', fila: { id: 'u1', email: 'a@b.c', is_anonymous: false } })).toMatchObject({ evento: 'alta', email: 'a@b.c', userId: 'u1' });
    expect(interpretar({ tabla: 'usuarios', tipo: 'INSERT', fila: { id: 'u1', email: null, is_anonymous: true } })).toBeNull();
  });

  it('los eventos de uso que importan pasan con su nombre; los demás y los sin cuenta se ignoran', () => {
    const r = interpretar({ tabla: 'eventos_uso', tipo: 'INSERT', fila: { user_id: 'u1', nombre: 'stand_cerrado', plataforma: 'ios', version: '1.0.3', datos: { productos: 4, tarjeta: true } } });
    expect(r.evento).toBe('stand_cerrado');
    expect(r.propiedades).toMatchObject({ plataforma: 'ios', productos: 4, conTarjeta: true });
    expect(r.contacto.ultimaActividad).toMatch(/^\d{4}-/);
    expect(interpretar({ tabla: 'eventos_uso', fila: { user_id: null, nombre: 'primera_foto' } })).toBeNull();
    expect(interpretar({ tabla: 'eventos_uso', fila: { user_id: 'u1', nombre: 'camara_ok' } })).toBeNull();
  });

  it('los 15 gratis agotados: solo cuando el saldo cae a cero sin haber comprado, y avisa en Slack', () => {
    const r = interpretar({ tabla: 'creditos', tipo: 'UPDATE', fila: { user_id: 'u1', saldo: 0, comprados: 0, consumidos: 15, trial_otorgado: 15 }, anterior: { saldo: 1 } });
    expect(r.evento).toBe('gratis_agotados');
    expect(r.slack).toMatch(/sin escaneos gratis/);
    expect(interpretar({ tabla: 'creditos', tipo: 'UPDATE', fila: { user_id: 'u1', saldo: 0, comprados: 500 }, anterior: { saldo: 1 } })).toBeNull();
    expect(interpretar({ tabla: 'creditos', tipo: 'UPDATE', fila: { user_id: 'u1', saldo: 0, comprados: 0 }, anterior: { saldo: 0 } })).toBeNull();
  });

  it('una compra real es "compra" y avisa en Slack; la de prueba no avisa ni manda mail; la cortesía va por canjes', () => {
    const real = interpretar({ tabla: 'compras', tipo: 'INSERT', fila: { user_id: 'u1', producto_id: 'pack_1000', escaneos: 1000, tienda: 'APP_STORE', entorno: 'production' } });
    expect(real.evento).toBe('compra');
    expect(real.slack).toMatch(/Venta real.*1000.*App Store/);
    const prueba = interpretar({ tabla: 'compras', tipo: 'INSERT', fila: { user_id: 'u1', producto_id: 'pack_500', escaneos: 500, tienda: 'PLAY_STORE', entorno: 'sandbox' } });
    expect(prueba.evento).toBeNull();
    expect(prueba.slack).toBeNull();
    expect(interpretar({ tabla: 'compras', tipo: 'INSERT', fila: { user_id: 'u1', producto_id: 'codigo', escaneos: 100, tienda: 'cortesia' } })).toBeNull();
  });

  it('un canje lleva el código y la agencia', () => {
    const r = interpretar({ tabla: 'canjes', tipo: 'INSERT', fila: { user_id: 'u1', codigo: 'INDIGO26', origen: 'IndiGO' } });
    expect(r.evento).toBe('codigo_canjeado');
    expect(r.propiedades).toEqual({ codigo: 'INDIGO26', origen: 'IndiGO' });
    expect(r.slack).toMatch(/INDIGO26.*IndiGO/);
  });

  it('lo desconocido se ignora sin romper', () => {
    expect(interpretar({})).toBeNull();
    expect(interpretar({ tabla: 'otra', fila: {} })).toBeNull();
  });
});
