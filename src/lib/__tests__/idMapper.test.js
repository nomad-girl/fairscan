import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock db module before importing idMapper
vi.mock('../../db.js', () => ({
  default: {
    table: () => ({ toArray: () => Promise.resolve([]) }),
  },
}));

// Mock localStorage for _getDeviceId
const DEVICE_ID = 'test-device-id-1234';
vi.stubGlobal('localStorage', {
  getItem: () => DEVICE_ID,
  setItem: () => {},
});

vi.stubGlobal('crypto', { randomUUID: () => 'random-uuid-1234' });

// Dynamic import to get a fresh instance
const { default: idMapper } = await import('../idMapper.js');

beforeEach(() => {
  idMapper.cache = { districts: {}, suppliers: {}, products: {} };
});

describe('IdMapper: register / getUuid / getLocalId', () => {
  it('registers and retrieves mappings bidirectionally', () => {
    idMapper.register('districts', 1, 'uuid-dist-1');

    expect(idMapper.getUuid('districts', 1)).toBe('uuid-dist-1');
    expect(idMapper.getLocalId('districts', 'uuid-dist-1')).toBe(1);
  });

  it('returns null for unknown mappings', () => {
    expect(idMapper.getUuid('districts', 999)).toBeNull();
    expect(idMapper.getLocalId('districts', 'nonexistent')).toBeNull();
  });

  it('handles multiple tables independently', () => {
    idMapper.register('districts', 1, 'uuid-d1');
    idMapper.register('suppliers', 1, 'uuid-s1');

    expect(idMapper.getUuid('districts', 1)).toBe('uuid-d1');
    expect(idMapper.getUuid('suppliers', 1)).toBe('uuid-s1');
  });
});

describe('IdMapper: toCloud (local → cloud)', () => {
  const ROOM_ID = 'room-abc';

  beforeEach(() => {
    idMapper.register('districts', 1, 'uuid-dist-1');
    idMapper.register('suppliers', 5, 'uuid-sup-5');
  });

  it('converts district correctly', () => {
    const local = {
      id: 1, uuid: 'uuid-dist-1', name: 'Canton Fair',
      location: 'Guangzhou', emoji: '🏮', dates: 'Abr 2026',
      createdAt: 1700000000000, updatedAt: 1700000001000,
    };
    const cloud = idMapper.toCloud('districts', local, ROOM_ID);

    expect(cloud.id).toBe('uuid-dist-1');
    expect(cloud.room_id).toBe(ROOM_ID);
    expect(cloud.device_id).toBe(DEVICE_ID);
    expect(cloud.name).toBe('Canton Fair');
    expect(cloud.location).toBe('Guangzhou');
    // Should NOT have local-only fields
    expect(cloud).not.toHaveProperty('districtId');
  });

  it('converts supplier correctly with FK translation', () => {
    const local = {
      id: 5, uuid: 'uuid-sup-5', districtId: 1,
      company: 'Kingking', contact: 'John', phone: '+86123',
      email: 'j@k.com', wechat: 'wc123', whatsapp: 'wa456',
      cardPhoto: 'data:image/jpeg;base64,/9j/HUGE_BASE64_DATA',
      cardPhotoUrl: 'https://r2.dev/cards/kingking.jpg',
      cardData: { company: 'Kingking' },
      createdAt: 1700000000000, updatedAt: 1700000001000,
    };
    const cloud = idMapper.toCloud('suppliers', local, ROOM_ID);

    expect(cloud.district_id).toBe('uuid-dist-1'); // FK translated
    expect(cloud.company).toBe('Kingking');
    expect(cloud.card_photo_url).toBe('https://r2.dev/cards/kingking.jpg');
    expect(cloud.card_data).toEqual({ company: 'Kingking' });
    // CRITICAL: base64 cardPhoto must NOT be in cloud record
    expect(cloud).not.toHaveProperty('cardPhoto');
    expect(cloud).not.toHaveProperty('card_photo');
  });

  it('converts product correctly with FK translations', () => {
    const local = {
      id: 10, uuid: 'uuid-prod-10', districtId: 1, supplierId: 5,
      name: 'Porcelain Cup', description: 'White cup', supplierCompany: 'Kingking',
      category: 'Vajilla', material: ['Porcelana'], price: '3.50', moq: '500',
      photos: ['data:image/jpeg;base64,/9j/BIG_DATA', 'https://r2.dev/photo.jpg'],
      photoUrls: ['https://r2.dev/photo.jpg'],
      rating: 4, notes: 'Good quality',
      createdAt: 1700000000000, updatedAt: 1700000001000,
    };
    const cloud = idMapper.toCloud('products', local, ROOM_ID);

    expect(cloud.district_id).toBe('uuid-dist-1');
    expect(cloud.supplier_id).toBe('uuid-sup-5');
    expect(cloud.name).toBe('Porcelain Cup');
    expect(cloud.photo_urls).toEqual(['https://r2.dev/photo.jpg']);
    expect(cloud.price).toBe('3.50'); // Converted to string
    // CRITICAL: base64 photos must NOT be in cloud record
    expect(cloud).not.toHaveProperty('photos');
  });

  it('handles null/missing FK gracefully', () => {
    const local = {
      id: 10, uuid: 'uuid-prod-10', districtId: null, supplierId: null,
      name: 'Unknown Product', createdAt: Date.now(), updatedAt: Date.now(),
    };
    const cloud = idMapper.toCloud('products', local, ROOM_ID);

    expect(cloud.district_id).toBeNull();
    expect(cloud.supplier_id).toBeNull();
  });

  it('handles unmapped FK (returns null, not crash)', () => {
    const local = {
      id: 10, uuid: 'uuid-prod-10', districtId: 999, supplierId: 888,
      name: 'Orphan', createdAt: Date.now(), updatedAt: Date.now(),
    };
    const cloud = idMapper.toCloud('products', local, ROOM_ID);

    // FK for unmapped IDs should be null (not throw)
    expect(cloud.district_id).toBeNull();
    expect(cloud.supplier_id).toBeNull();
  });
});

describe('IdMapper: toLocal (cloud → local)', () => {
  beforeEach(() => {
    idMapper.register('districts', 1, 'uuid-dist-1');
    idMapper.register('suppliers', 5, 'uuid-sup-5');
  });

  it('converts cloud district to local', () => {
    const cloud = {
      id: 'uuid-dist-1', name: 'Canton Fair', location: 'Guangzhou',
      emoji: '🏮', dates: 'Abr 2026',
      created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-02T00:00:00Z',
    };
    const local = idMapper.toLocal('districts', cloud);

    expect(local.uuid).toBe('uuid-dist-1');
    expect(local.name).toBe('Canton Fair');
    expect(local.createdAt).toBeTypeOf('number');
    expect(local.updatedAt).toBeTypeOf('number');
  });

  it('converts cloud supplier to local with FK reverse-mapping', () => {
    const cloud = {
      id: 'uuid-sup-5', district_id: 'uuid-dist-1',
      company: 'Kingking', contact: 'John', phone: '+86123',
      email: 'j@k.com', wechat: 'wc123', wechat_link: 'weixin://wc123',
      whatsapp: 'wa456', whatsapp_link: 'https://wa.me/wa456',
      website: 'kingking.com', address: 'Guangzhou',
      card_photo_url: 'https://r2.dev/cards/kingking.jpg',
      card_data: { company: 'Kingking' },
      created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-02T00:00:00Z',
    };
    const local = idMapper.toLocal('suppliers', cloud);

    expect(local.districtId).toBe(1); // FK reverse-mapped
    expect(local.company).toBe('Kingking');
    expect(local.cardPhotoUrl).toBe('https://r2.dev/cards/kingking.jpg');
    expect(local.cardData).toEqual({ company: 'Kingking' });
    expect(local.wechatLink).toBe('weixin://wc123');
    expect(local.whatsappLink).toBe('https://wa.me/wa456');
  });

  it('converts cloud product to local with FK reverse-mapping', () => {
    const cloud = {
      id: 'uuid-prod-10', district_id: 'uuid-dist-1', supplier_id: 'uuid-sup-5',
      name: 'Porcelain Cup', supplier_company: 'Kingking',
      category: 'Vajilla', material: ['Porcelana'],
      photo_urls: ['https://r2.dev/photo.jpg'], price: '3.50', moq: '500',
      rating: 4, notes: 'Good', audio_transcript: 'Audio notes',
      created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-02T00:00:00Z',
    };
    const local = idMapper.toLocal('products', cloud);

    expect(local.districtId).toBe(1);
    expect(local.supplierId).toBe(5);
    expect(local.name).toBe('Porcelain Cup');
    expect(local.photoUrls).toEqual(['https://r2.dev/photo.jpg']);
    expect(local.photos).toEqual(['https://r2.dev/photo.jpg']); // photos = photo_urls for remote
    expect(local.material).toEqual(['Porcelana']);
    expect(local.audioTranscript).toBe('Audio notes');
  });

  it('handles missing fields with defaults (not undefined)', () => {
    const cloud = {
      id: 'uuid-sup-empty',
      created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-02T00:00:00Z',
    };
    const local = idMapper.toLocal('suppliers', cloud);

    expect(local.company).toBe('');
    expect(local.contact).toBe('');
    expect(local.phone).toBe('');
    expect(local.cardPhotoUrl).toBeNull();
  });

  it('handles unmapped FK on reverse (returns null)', () => {
    const cloud = {
      id: 'uuid-prod-orphan', district_id: 'unknown-uuid', supplier_id: 'unknown-sup',
      name: 'Orphan',
      created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-02T00:00:00Z',
    };
    const local = idMapper.toLocal('products', cloud);

    expect(local.districtId).toBeNull();
    expect(local.supplierId).toBeNull();
  });
});

describe('IdMapper: roundtrip (toCloud → toLocal)', () => {
  it('preserves data through cloud→local roundtrip', () => {
    idMapper.register('districts', 1, 'uuid-dist-1');
    idMapper.register('suppliers', 5, 'uuid-sup-5');

    const original = {
      id: 10, uuid: 'uuid-prod-10', districtId: 1, supplierId: 5,
      name: 'Test Product', supplierCompany: 'TestCo',
      category: 'Vajilla', material: ['Porcelana', 'Bone China'],
      price: '5.00', moq: '1000', rating: 3, notes: 'Nice',
      createdAt: 1700000000000, updatedAt: 1700000001000,
    };

    idMapper.register('products', 10, 'uuid-prod-10');
    const cloud = idMapper.toCloud('products', original, 'room-1');
    const restored = idMapper.toLocal('products', cloud);

    expect(restored.name).toBe(original.name);
    expect(restored.supplierCompany).toBe(original.supplierCompany);
    expect(restored.category).toBe(original.category);
    expect(restored.material).toEqual(original.material);
    expect(restored.price).toBe(original.price);
    expect(restored.districtId).toBe(original.districtId);
    expect(restored.supplierId).toBe(original.supplierId);
  });
});

describe('datos de compra (16/09): favorito, MOQ con base, piezas y CBM por caja', () => {
  it('van a la nube con sus nombres y vuelven iguales', async () => {
    const { default: mapper } = await import('../idMapper.js');
    const cloud = mapper.toCloud('products', { id: 1, name: 'Taza', favorito: 1, moq: '500', moqBase: 'caja', piezasPorCaja: 48, cbmPorCaja: 0.042 }, 'room-1');
    expect(cloud.favorite).toBe(true);
    expect(cloud.moq_base).toBe('caja');
    expect(cloud.pieces_per_carton).toBe(48);
    expect(cloud.cbm_per_carton).toBe(0.042);
    const local = mapper.toLocal('products', { id: 'u1', favorite: true, moq_base: 'caja', pieces_per_carton: 48, cbm_per_carton: 0.042 });
    expect(local.favorito).toBe(1);
    expect(local.moqBase).toBe('caja');
    expect(local.piezasPorCaja).toBe(48);
    expect(local.cbmPorCaja).toBe(0.042);
  });
  it('vacíos quedan vacíos, nunca cero inventado', async () => {
    const { default: mapper } = await import('../idMapper.js');
    const cloud = mapper.toCloud('products', { id: 2, name: 'Vela' }, 'room-1');
    expect(cloud.favorite).toBe(false);
    expect(cloud.moq_base).toBeNull();
    expect(cloud.pieces_per_carton).toBeNull();
    expect(cloud.cbm_per_carton).toBeNull();
    const local = mapper.toLocal('products', { id: 'u2' });
    expect(local.favorito).toBe(0);
    expect(local.piezasPorCaja).toBeNull();
  });
  it('el proveedor también tiene favorito', async () => {
    const { default: mapper } = await import('../idMapper.js');
    expect(mapper.toCloud('suppliers', { id: 1, company: 'Sunrise', favorito: 1 }, 'room-1').favorite).toBe(true);
    expect(mapper.toLocal('suppliers', { id: 's1', company: 'Sunrise', favorite: true }).favorito).toBe(1);
  });
});
