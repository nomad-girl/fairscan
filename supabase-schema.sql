-- ═══════════════════════════════════════════════════════
-- FairScan Cloud Sync - Supabase Schema
-- Run this in the Supabase SQL Editor to set up the DB
-- ═══════════════════════════════════════════════════════

-- 1. ROOMS
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by_device TEXT
);
CREATE INDEX idx_rooms_code ON rooms(code);

-- 2. DISTRICTS (Fairs)
CREATE TABLE districts (
  id UUID PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT,
  emoji TEXT DEFAULT '📍',
  dates TEXT,
  device_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_districts_room ON districts(room_id);

-- 3. SUPPLIERS
CREATE TABLE suppliers (
  id UUID PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  district_id UUID REFERENCES districts(id),
  company TEXT,
  contact TEXT,
  phone TEXT,
  email TEXT,
  wechat TEXT,
  wechat_link TEXT,
  whatsapp TEXT,
  whatsapp_link TEXT,
  website TEXT,
  address TEXT,
  products_description TEXT,
  card_photo_url TEXT,
  card_data JSONB,
  booth_number TEXT,
  device_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_suppliers_room ON suppliers(room_id);
CREATE INDEX idx_suppliers_district ON suppliers(district_id);

-- 4. PRODUCTS
CREATE TABLE products (
  id UUID PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  district_id UUID REFERENCES districts(id),
  supplier_id UUID REFERENCES suppliers(id),
  name TEXT,
  description TEXT,
  supplier_company TEXT,
  category TEXT,
  material TEXT[],
  photo_urls TEXT[],
  price TEXT,
  moq TEXT,
  rating INTEGER DEFAULT 0,
  notes TEXT,
  audio_transcript TEXT,
  viability TEXT,
  cost_total NUMERIC,
  cost_data JSONB,
  target_price TEXT,
  device_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_products_room ON products(room_id);
CREATE INDEX idx_products_district ON products(district_id);
CREATE INDEX idx_products_supplier ON products(supplier_id);
CREATE INDEX idx_products_updated ON products(room_id, updated_at);

-- 5. AUTO-UPDATE updated_at TRIGGER
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER districts_updated_at BEFORE UPDATE ON districts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER suppliers_updated_at BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 6. ENABLE REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE districts;
ALTER PUBLICATION supabase_realtime ADD TABLE suppliers;
ALTER PUBLICATION supabase_realtime ADD TABLE products;

-- 7. ROW LEVEL SECURITY (permissive - room code is the access control)
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public access" ON rooms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access" ON districts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access" ON suppliers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access" ON products FOR ALL USING (true) WITH CHECK (true);

-- 8. CLOUD BACKUPS (auto-backup every 1h)
CREATE TABLE IF NOT EXISTS backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  device_id TEXT,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_backups_room ON backups(room_id, created_at DESC);

ALTER TABLE backups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access" ON backups FOR ALL USING (true) WITH CHECK (true);

-- Keep only last 5 backups per room (cleanup old ones via app logic)
