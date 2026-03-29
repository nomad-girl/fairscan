-- ═══════════════════════════════════════════════════════
-- FairScan: Abrir registro público + nombre de equipo
-- Correr en el SQL Editor de Supabase
-- ═══════════════════════════════════════════════════════

-- Reemplaza el trigger handle_new_user() para:
-- 1. Eliminar el chequeo de allowed_emails (cualquiera puede registrarse)
-- 2. Usar el nombre de equipo que el usuario elige al registrarse

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  _team_id UUID;
  _team_name TEXT;
BEGIN
  -- Create profile
  INSERT INTO profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));

  -- Auto-join teams where this email was invited
  INSERT INTO team_members (team_id, user_id, role)
  SELECT team_id, NEW.id, 'member'
  FROM team_invites WHERE lower(email) = lower(NEW.email);

  -- If no invites found, create a new team and be admin
  IF NOT EXISTS (SELECT 1 FROM team_members WHERE user_id = NEW.id) THEN
    _team_name := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'team_name'), ''), 'Mi Equipo');
    INSERT INTO teams (name, created_by) VALUES (_team_name, NEW.id)
    RETURNING id INTO _team_id;
    INSERT INTO team_members (team_id, user_id, role) VALUES (_team_id, NEW.id, 'admin');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
