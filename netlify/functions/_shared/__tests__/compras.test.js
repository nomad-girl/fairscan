import { describe, it, expect } from 'vitest';
import { interpretarEvento, escaneosDePack, autorizado } from '../compras.js';

const UID = '3f2a9c1e-1111-4222-8333-444455556666';
const evento = (extra = {}) => ({ event: { type: 'NON_RENEWING_PURCHASE', app_user_id: UID, product_id: 'pack_1000', transaction_id: 'tx-1', store: 'APP_STORE', environment: 'SANDBOX', ...extra } });

describe('interpretarEvento', () => {
  it('lee una compra consumible válida', () => {
    expect(interpretarEvento(evento())).toEqual({ userId: UID, transaccionId: 'tx-1', productoId: 'pack_1000', tienda: 'APP_STORE', entorno: 'SANDBOX' });
  });
  it('ignora eventos que no acreditan y cuerpos rotos', () => {
    expect(interpretarEvento(evento({ type: 'CANCELLATION' }))).toBeNull();
    expect(interpretarEvento(evento({ type: 'TEST' }))).toBeNull();
    expect(interpretarEvento({})).toBeNull();
    expect(interpretarEvento(evento({ transaction_id: undefined, id: undefined }))).toBeNull();
  });
  it('rechaza ids de usuaria que no son de Supabase (anónimos de RevenueCat)', () => {
    expect(interpretarEvento(evento({ app_user_id: '$RCAnonymousID:abc' }))).toBeNull();
  });
});

describe('escaneosDePack', () => {
  const packs = [{ id: 'pack_500', escaneos: 500, usd: 19.99 }, { id: 'pack_1000', escaneos: 1000, usd: 29.99 }];
  it('mapea el producto de la tienda a escaneos desde la config', () => {
    expect(escaneosDePack(packs, 'pack_1000')).toBe(1000);
    expect(escaneosDePack(packs, 'pack_9999')).toBeNull();
    expect(escaneosDePack(null, 'pack_500')).toBeNull();
  });
});

describe('autorizado', () => {
  it('solo con el secreto compartido', () => {
    expect(autorizado({ authorization: 'Bearer s3cr3t' }, 's3cr3t')).toBe(true);
    expect(autorizado({ authorization: 'Bearer otro' }, 's3cr3t')).toBe(false);
    expect(autorizado({}, 's3cr3t')).toBe(false);
    expect(autorizado({ authorization: 'Bearer x' }, '')).toBe(false);
  });
});
