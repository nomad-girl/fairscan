-- ═══════════════════════════════════════════════════════
-- FairScan: Migration from Rooms to Auth + Teams
-- Run this in the Supabase SQL Editor BEFORE deploying
-- the new frontend code.
-- ═══════════════════════════════════════════════════════

-- ─── 1. ALLOWED EMAILS (whitelist) ───────────────────
CREATE TABLE allowed_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE allowed_emails ENABLE ROW LEVEL SECURITY;
-- No public access - managed via SQL editor or admin

-- ─── 2. PROFILES ─────────────────────────────────────
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ─── 3. TEAMS (conceptual replacement for rooms) ────
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- ─── 4. TEAM MEMBERS ────────────────────────────────
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_id, user_id)
);
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- ─── 5. TEAM INVITES ────────────────────────────────
CREATE TABLE team_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  invited_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_id, email)
);
ALTER TABLE team_invites ENABLE ROW LEVEL SECURITY;

-- ─── 6. AUTO-CREATE PROFILE + AUTO-JOIN/CREATE TEAM ──
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  _team_id UUID;
BEGIN
  -- Verify email is whitelisted
  IF NOT EXISTS (SELECT 1 FROM allowed_emails WHERE lower(email) = lower(NEW.email)) THEN
    RAISE EXCEPTION 'Email no autorizado: %', NEW.email;
  END IF;

  -- Create profile
  INSERT INTO profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));

  -- Auto-join teams where this email was invited
  INSERT INTO team_members (team_id, user_id, role)
  SELECT team_id, NEW.id, 'member'
  FROM team_invites WHERE lower(email) = lower(NEW.email);

  -- If no invites found, create a new team and be admin
  IF NOT EXISTS (SELECT 1 FROM team_members WHERE user_id = NEW.id) THEN
    INSERT INTO teams (name, created_by) VALUES ('Mi Equipo', NEW.id)
    RETURNING id INTO _team_id;
    INSERT INTO team_members (team_id, user_id, role) VALUES (_team_id, NEW.id, 'admin');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── 7. MIGRATE EXISTING ROOM → TEAM ────────────────
-- This copies your current room as a team with the SAME UUID,
-- so all existing data (districts, suppliers, products) stays linked.
INSERT INTO teams (id, name, created_at)
SELECT id, COALESCE(name, 'Mi Equipo'), created_at
FROM rooms
ON CONFLICT (id) DO NOTHING;

-- ─── 8. SEED DATA (customize these!) ────────────────

-- TODO: Replace with your actual emails
-- INSERT INTO allowed_emails (email) VALUES
--   ('your-email@example.com'),
--   ('mama-email@example.com'),
--   ('friend-email@example.com');

-- TODO: Replace team_id with your actual room UUID (check rooms table)
-- and emails with actual emails for your team
-- INSERT INTO team_invites (team_id, email) VALUES
--   ('<your-room-uuid>', 'your-email@example.com'),
--   ('<your-room-uuid>', 'mama-email@example.com');

-- Your friend does NOT need an invite - they'll get a new team automatically

-- ─── 9. HELPER FUNCTION FOR RLS ─────────────────────
CREATE OR REPLACE FUNCTION user_team_ids()
RETURNS SETOF UUID AS $$
  SELECT team_id FROM team_members WHERE user_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;
