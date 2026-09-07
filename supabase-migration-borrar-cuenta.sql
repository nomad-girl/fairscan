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
-- APARTE · una pregunta que quedó abierta y conviene contestar
-- ═══════════════════════════════════════════════════════════════════
--
-- Las tablas de datos (districts, suppliers, products, backups) tienen una
-- columna `room_id` que hoy guarda el id del EQUIPO — así lo dice la migración
-- de equipos y las políticas de acceso. Pero la restricción original apuntaba a
-- la tabla `rooms`, no a `teams`.
--
-- Cuando se hizo la migración se copiaron los rooms como teams con el mismo id,
-- así que los equipos viejos tienen su fila en `rooms` y todo cierra. El
-- problema es que los equipos NUEVOS (los que crea el registro automático) se
-- insertan solo en `teams`. Si la restricción sigue apuntando a `rooms`, una
-- usuaria nueva no puede subir NADA a la nube: cada intento choca contra la
-- restricción, el sync lo encola y no se entera nadie.
--
-- Correr esto para saber si el problema existe de verdad:

SELECT
  tc.table_name        AS tabla,
  ccu.table_name       AS apunta_a
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON kcu.constraint_name = tc.constraint_name
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.constraint_type = 'FOREIGN KEY'
  AND kcu.column_name = 'room_id';

-- Y esto para ver si hay equipos sin su fila espejo en `rooms`:

SELECT count(*) AS equipos_sin_room
FROM public.teams t
WHERE NOT EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = t.id);

-- Si `apunta_a` dice "rooms" Y `equipos_sin_room` es mayor que cero, el
-- problema es real. NO se arregla acá a propósito: es un tema aparte del
-- borrado de cuenta y merece su propia decisión. Está anotado en 🧰 Producto.
