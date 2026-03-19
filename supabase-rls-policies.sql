-- ═══════════════════════════════════════════════════════
-- FairScan: RLS Policies for Auth + Teams
-- Run this AFTER the new frontend with auth is deployed
-- and working. This replaces the permissive policies.
-- ═══════════════════════════════════════════════════════

-- ─── DROP OLD PERMISSIVE POLICIES ────────────────────
DROP POLICY IF EXISTS "Public access" ON rooms;
DROP POLICY IF EXISTS "Public access" ON districts;
DROP POLICY IF EXISTS "Public access" ON suppliers;
DROP POLICY IF EXISTS "Public access" ON products;
DROP POLICY IF EXISTS "Public access" ON backups;

-- ─── DATA TABLES: team-scoped access ─────────────────
-- room_id in these tables now maps to team_id

CREATE POLICY "Team access" ON districts FOR ALL
  USING (room_id IN (SELECT user_team_ids()))
  WITH CHECK (room_id IN (SELECT user_team_ids()));

CREATE POLICY "Team access" ON suppliers FOR ALL
  USING (room_id IN (SELECT user_team_ids()))
  WITH CHECK (room_id IN (SELECT user_team_ids()));

CREATE POLICY "Team access" ON products FOR ALL
  USING (room_id IN (SELECT user_team_ids()))
  WITH CHECK (room_id IN (SELECT user_team_ids()));

CREATE POLICY "Team access" ON backups FOR ALL
  USING (room_id IN (SELECT user_team_ids()))
  WITH CHECK (room_id IN (SELECT user_team_ids()));

-- ─── TEAMS: only see your own teams ──────────────────
CREATE POLICY "Team access" ON teams FOR SELECT
  USING (id IN (SELECT user_team_ids()));

CREATE POLICY "Team update" ON teams FOR UPDATE
  USING (id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role = 'admin'));

-- ─── TEAM MEMBERS: see members of your teams ────────
CREATE POLICY "View members" ON team_members FOR SELECT
  USING (team_id IN (SELECT user_team_ids()));

CREATE POLICY "Admin manage members" ON team_members FOR INSERT
  WITH CHECK (team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Admin delete members" ON team_members FOR DELETE
  USING (team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- ─── TEAM INVITES: admin only ────────────────────────
CREATE POLICY "Admin view invites" ON team_invites FOR SELECT
  USING (team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Admin create invites" ON team_invites FOR INSERT
  WITH CHECK (team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Admin delete invites" ON team_invites FOR DELETE
  USING (team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- ─── PROFILES: see profiles of your teammates ────────
CREATE POLICY "View team profiles" ON profiles FOR SELECT
  USING (id IN (
    SELECT user_id FROM team_members WHERE team_id IN (SELECT user_team_ids())
  ));

CREATE POLICY "Edit own profile" ON profiles FOR UPDATE
  USING (id = auth.uid());

-- ─── ROOMS: keep read access for backward compat ────
-- Can be dropped later once migration is fully verified
CREATE POLICY "Authenticated read" ON rooms FOR SELECT
  USING (auth.uid() IS NOT NULL);
