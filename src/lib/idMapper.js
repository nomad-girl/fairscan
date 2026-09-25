// Sin importar la base: db.js ahora registra acá los ids que crea, y dos archivos
// que se importan entre sí se rompen al arrancar. La base se pasa como parámetro.

/**
 * IdMapper: Bidirectional mapping between Dexie local IDs (integers) and Supabase UUIDs.
 *
 * Dexie uses ++id (auto-increment) internally. Supabase uses UUIDs as primary keys.
 * Foreign keys (districtId, supplierId) in Dexie are integers that need to be
 * translated to UUIDs when pushing to cloud, and back when pulling.
 */
class IdMapper {
  constructor() {
    // { table: { localId: uuid, uuid: localId } }
    this.cache = { districts: {}, suppliers: {}, products: {}, orders: {} };
  }

  /** Build the mapping from all local Dexie records */
  async buildFromLocal(db) {
    if (!db) return;
    for (const table of ['districts', 'suppliers', 'products', 'orders']) {
      let records;
      try { records = await db.table(table).toArray(); } catch { continue; } // una base vieja sin la tabla
      this.cache[table] = {};
      records.forEach(r => {
        if (r.uuid) {
          this.cache[table][`local_${r.id}`] = r.uuid;
          this.cache[table][`uuid_${r.uuid}`] = r.id;
        }
      });
    }
  }

  /** Register a new mapping (when creating records or pulling from cloud) */
  register(table, localId, uuid) {
    if (!this.cache[table]) this.cache[table] = {};
    this.cache[table][`local_${localId}`] = uuid;
    this.cache[table][`uuid_${uuid}`] = localId;
  }

  /** Get UUID from local ID */
  getUuid(table, localId) {
    return this.cache[table]?.[`local_${localId}`] || null;
  }

  /** Get local ID from UUID */
  getLocalId(table, uuid) {
    return this.cache[table]?.[`uuid_${uuid}`] || null;
  }

  /**
   * Convert a local Dexie record to cloud format for Supabase.
   * - Uses uuid as the cloud primary key
   * - Translates FK integer references to UUIDs
   * - Converts camelCase to snake_case
   * - Strips base64 photo data (only URLs go to cloud)
   */
  toCloud(table, localRecord, roomId) {
    const cloud = {
      id: localRecord.uuid,
      room_id: roomId,
      device_id: this._getDeviceId(),
      created_at: localRecord.createdAt ? new Date(localRecord.createdAt).toISOString() : new Date().toISOString(),
      updated_at: localRecord.updatedAt ? new Date(localRecord.updatedAt).toISOString() : new Date().toISOString(),
    };

    if (table === 'districts') {
      cloud.name = localRecord.name || null;
      cloud.location = localRecord.location || null;
      cloud.emoji = localRecord.emoji || null;
      cloud.dates = localRecord.dates || null;
    }

    if (table === 'suppliers') {
      cloud.district_id = localRecord.districtId ? this.getUuid('districts', localRecord.districtId) : null;
      cloud.company = localRecord.company || null;
      cloud.contact = localRecord.contact || null;
      cloud.phone = localRecord.phone || null;
      cloud.email = localRecord.email || null;
      cloud.wechat = localRecord.wechat || null;
      cloud.wechat_link = localRecord.wechatLink || null;
      cloud.whatsapp = localRecord.whatsapp || null;
      cloud.whatsapp_link = localRecord.whatsappLink || null;
      cloud.website = localRecord.website || null;
      cloud.address = localRecord.address || null;
      cloud.products_description = localRecord.products || null;
      cloud.card_photo_url = localRecord.cardPhotoUrl || null;
      cloud.card_data = localRecord.cardData || null;
      cloud.booth_number = localRecord.boothNumber || null;
      cloud.rating = localRecord.rating || null; // 7.5
      cloud.favorite = !!localRecord.favorito; // decisión 1 (16/09): favorito en proveedor
    }

    if (table === 'orders') {
      // Pedido (16/09): los ítems viajan con el uuid del producto; lo que todavía no
      // tiene uuid (producto sin subir) no viaja, y vuelve a subir con el próximo cambio.
      cloud.supplier_id = localRecord.supplierId ? this.getUuid('suppliers', localRecord.supplierId) : null;
      cloud.district_id = localRecord.districtId ? this.getUuid('districts', localRecord.districtId) : null;
      cloud.status = localRecord.estado || 'en_curso';
      cloud.comments = localRecord.comentarios || null;
      cloud.items = (localRecord.items || [])
        .map(i => ({ product_id: this.getUuid('products', i.productId), quantity: i.cantidad }))
        .filter(i => i.product_id && i.quantity > 0);
      cloud.sent_at = localRecord.enviadoEl ? new Date(localRecord.enviadoEl).toISOString() : null;
    }

    if (table === 'products') {
      cloud.district_id = localRecord.districtId ? this.getUuid('districts', localRecord.districtId) : null;
      cloud.supplier_id = localRecord.supplierId ? this.getUuid('suppliers', localRecord.supplierId) : null;
      cloud.name = localRecord.name || null;
      cloud.description = localRecord.description || null;
      cloud.supplier_company = localRecord.supplierCompany || null;
      cloud.category = localRecord.category || null;
      cloud.material = localRecord.material || null;
      cloud.photo_urls = localRecord.photoUrls || null;
      cloud.price = localRecord.price != null ? String(localRecord.price) : null;
      cloud.moq = localRecord.moq || null;
      cloud.rating = localRecord.rating || 0;
      cloud.notes = localRecord.notes || null;
      cloud.audio_transcript = localRecord.audioTranscript || null;
      cloud.viability = localRecord.viability || null;
      cloud.cost_total = localRecord.costTotal || null;
      cloud.cost_data = localRecord.costData || null;
      cloud.target_price = localRecord.targetPrice || null;
      // Datos de compra (decisiones 1, 2 y 4 del 16/09): favorito, MOQ con base, piezas y CBM por caja.
      cloud.favorite = !!localRecord.favorito;
      cloud.moq_base = localRecord.moqBase || null;                 // 'producto' | 'caja' | 'pedido'
      cloud.pieces_per_carton = localRecord.piezasPorCaja ?? null;
      cloud.cbm_per_carton = localRecord.cbmPorCaja ?? null;
      cloud.discarded = !!localRecord.descartado;                 // escritorio, tanda A (25/09): descartar no borra
      cloud.extras = localRecord.extras && typeof localRecord.extras === "object" ? localRecord.extras : {}; // campos propios del equipo (25/09)
    }

    return cloud;
  }

  /**
   * Convert a cloud record from Supabase to local Dexie format.
   * - Translates UUID FKs back to local integer IDs
   * - Converts snake_case to camelCase
   */
  toLocal(table, cloudRecord) {
    const local = {
      uuid: cloudRecord.id,
      createdAt: cloudRecord.created_at ? new Date(cloudRecord.created_at).getTime() : Date.now(),
      updatedAt: cloudRecord.updated_at ? new Date(cloudRecord.updated_at).getTime() : Date.now(),
    };

    if (table === 'districts') {
      local.name = cloudRecord.name || "";
      local.location = cloudRecord.location || "";
      local.emoji = cloudRecord.emoji || "📍";
      local.dates = cloudRecord.dates || "";
    }

    if (table === 'suppliers') {
      local.districtId = cloudRecord.district_id ? this.getLocalId('districts', cloudRecord.district_id) : null;
      local.company = cloudRecord.company || "";
      local.contact = cloudRecord.contact || "";
      local.phone = cloudRecord.phone || "";
      local.email = cloudRecord.email || "";
      local.wechat = cloudRecord.wechat || "";
      local.wechatLink = cloudRecord.wechat_link || "";
      local.whatsapp = cloudRecord.whatsapp || "";
      local.whatsappLink = cloudRecord.whatsapp_link || "";
      local.website = cloudRecord.website || "";
      local.address = cloudRecord.address || "";
      local.products = cloudRecord.products_description || "";
      local.cardPhotoUrl = cloudRecord.card_photo_url || null;
      local.cardData = cloudRecord.card_data || null;
      local.boothNumber = cloudRecord.booth_number || null;
      local.rating = cloudRecord.rating || 0;
      local.favorito = cloudRecord.favorite ? 1 : 0;
    }

    if (table === 'orders') {
      local.supplierId = cloudRecord.supplier_id ? this.getLocalId('suppliers', cloudRecord.supplier_id) : null;
      local.districtId = cloudRecord.district_id ? this.getLocalId('districts', cloudRecord.district_id) : null;
      local.estado = cloudRecord.status || 'en_curso';
      local.comentarios = cloudRecord.comments || "";
      local.items = (cloudRecord.items || [])
        .map(i => ({ productId: this.getLocalId('products', i.product_id), cantidad: Number(i.quantity) || 0 }))
        .filter(i => i.productId != null && i.cantidad > 0);
      local.enviadoEl = cloudRecord.sent_at ? new Date(cloudRecord.sent_at).getTime() : null;
    }

    if (table === 'products') {
      local.districtId = cloudRecord.district_id ? this.getLocalId('districts', cloudRecord.district_id) : null;
      local.supplierId = cloudRecord.supplier_id ? this.getLocalId('suppliers', cloudRecord.supplier_id) : null;
      local.name = cloudRecord.name || "";
      local.description = cloudRecord.description || "";
      local.supplierCompany = cloudRecord.supplier_company || "";
      local.category = cloudRecord.category || "";
      local.material = cloudRecord.material || [];
      local.photoUrls = cloudRecord.photo_urls || null;
      local.photos = cloudRecord.photo_urls || []; // Use URLs as photos for remote records
      local.price = cloudRecord.price || null;
      local.moq = cloudRecord.moq || "";
      local.rating = cloudRecord.rating || 0;
      local.notes = cloudRecord.notes || "";
      local.audioTranscript = cloudRecord.audio_transcript || "";
      local.viability = cloudRecord.viability || null;
      local.costTotal = cloudRecord.cost_total || null;
      local.costData = cloudRecord.cost_data || null;
      local.targetPrice = cloudRecord.target_price || null;
      local.favorito = cloudRecord.favorite ? 1 : 0;
      local.moqBase = cloudRecord.moq_base || null;
      local.piezasPorCaja = cloudRecord.pieces_per_carton ?? null;
      local.cbmPorCaja = cloudRecord.cbm_per_carton ?? null;
      local.descartado = cloudRecord.discarded ? 1 : 0;
      local.extras = cloudRecord.extras && typeof cloudRecord.extras === "object" ? cloudRecord.extras : {};
    }

    return local;
  }

  _getDeviceId() {
    let id = localStorage.getItem('fairscan_device_id');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('fairscan_device_id', id);
    }
    return id;
  }
}

// Singleton
const idMapper = new IdMapper();
export default idMapper;
