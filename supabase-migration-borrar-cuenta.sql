-- ═══════════════════════════════════════════════════════════════════
-- FairScan · Borrar cuenta (pieza 1.9)
-- Correr en el SQL Editor de Supabase. Se puede correr más de una vez
-- sin romper nada.
-- ═══════════════════════════════════════════════════════════════════
--
-- QUÉ ARREGLA
--
-- Las tablas `teams` y `team_invites` guardan quién las creó, apuntando a
-- `profiles`. Pero no dicen qué hacer si esa persona desaparece, y por defecto
-- Postgres entiende "no la dejes desaparecer". Resultado: al borrar una cuenta
-- que alguna vez creó un equipo o mandó una invitación, la base rechaza la
-- operación con un error de integridad y el borrado falla a mitad de camino.
--
-- Se cambia a "si la persona se va, dejá el campo vacío": el equipo sobrevive
-- sin dueño registrado, y la app le pasa la propiedad a otro miembro.
--
-- Se busca la restricción por columna en vez de por nombre, por si en algún
-- momento se creó con otro nombre.

-- ─── 1. teams.created_by ───────────────────────────────────────────
DO $$
DECLARE
  nombre text;
BEGIN
  SELECT tc.constraint_name INTO nombre
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON kcu.constraint_name = tc.constraint_name
   AND kcu.table_schema = tc.table_schema
  WHERE tc.table_schema = 'public'
    AND tc.table_name = 'teams'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'created_by'
  LIMIT 1;

  IF nombre IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.teams DROP CONSTRAINT %I', nombre);
  END IF;

  ALTER TABLE public.teams
    ADD CONSTRAINT teams_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
END $$;

-- ─── 2. team_invites.invited_by ────────────────────────────────────
DO $$
DECLARE
  nombre text;
BEGIN
  SELECT tc.constraint_name INTO nombre
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON kcu.constraint_name = tc.constraint_name
   AND kcu.table_schema = tc.table_schema
  WHERE tc.table_schema = 'public'
    AND tc.table_name = 'team_invites'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'invited_by'
  LIMIT 1;

  IF nombre IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.team_invites DROP CONSTRAINT %I', nombre);
  END IF;

  ALTER TABLE public.team_invites
    ADD CONSTRAINT team_invites_invited_by_fkey
    FOREIGN KEY (invited_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
END $$;

-- ─── 3. Verificación ───────────────────────────────────────────────
-- Después de correr lo de arriba, las dos filas tienen que decir SET NULL.

SELECT
  tc.table_name    AS tabla,
  kcu.column_name  AS columna,
  rc.delete_rule   AS al_borrar
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON kcu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.constraint_type = 'FOREIGN KEY'
  AND ((tc.table_name = 'teams' AND kcu.column_name = 'created_by')
    OR (tc.table_name = 'team_invites' AND kcu.column_name = 'invited_by'));

-- ═══════════════════════════════════════════════════════════════════
-- APARTE · la duda que dejó esta migración, ya contestada
-- ═══════════════════════════════════════════════════════════════════
--
-- Al escribir esto quedó una pregunta abierta: las tablas de datos guardaban en
-- `room_id` el id del EQUIPO, pero su restricción apuntaba a la tabla `rooms`.
--
-- Se verificó el 07/09/2026 contra producción y el problema era REAL: 7 de 8
-- equipos no podían subir nada a la nube. Está arreglado en
-- `supabase-migration-room-id-a-teams.sql`, que ya se aplicó.
