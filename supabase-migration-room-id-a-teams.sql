-- ═══════════════════════════════════════════════════════════════════
-- FairScan · room_id pasa a apuntar a `teams`
-- ═══════════════════════════════════════════════════════════════════
--
-- ⚠️ YA APLICADA en producción el 07/09/2026. Queda acá como registro.
--    Se puede volver a correr sin romper nada (no haría nada).
--
-- EL PROBLEMA
--
-- Las tablas de datos (districts, suppliers, products, backups) tienen una
-- columna `room_id` que guarda el id del EQUIPO. Pero su restricción exigía una
-- fila en la tabla `rooms`, de la época anterior a las cuentas.
--
-- Cuando se migró a equipos se copiaron los rooms existentes como teams con el
-- mismo id, así que el equipo de Nati quedó en las dos tablas y todo funcionaba.
-- El problema es que el registro automático crea los equipos SOLO en `teams`.
--
-- Consecuencia medida el 07/09: de 8 equipos, solo el de Nati tenía fila en
-- `rooms`. Los otros 7 —usuarios reales de marzo a junio— tenían CERO ferias,
-- CERO proveedores y CERO productos en la nube. Cada intento de subir algo
-- chocaba contra la restricción, el motor de sincronización lo encolaba, y no se
-- enteraba nadie. Confirmado con un insert de prueba:
--
--   insert or update on table "districts" violates foreign key constraint
--   "districts_room_id_fkey"
--
-- EL ARREGLO
--
-- Las cuatro restricciones pasan a apuntar a `teams`. Para que sea posible hubo
-- que crear primero un equipo espejo por cada room que no lo tenía (13), porque
-- había 213 filas apuntando a esas rooms. No se modificó ni se borró ningún dato.
--
-- Se descartó la alternativa (crear la fila en `rooms` al crear cada equipo)
-- porque dejaba dos tablas para un mismo concepto para siempre, y el error podía
-- volver en silencio.

DO $$
DECLARE
  huerfanas int;
  correctas int;
BEGIN
  INSERT INTO public.teams (id, name, created_at)
  SELECT r.id, COALESCE(r.name, 'Sala archivada ' || r.code), r.created_at
  FROM public.rooms r
  WHERE NOT EXISTS (SELECT 1 FROM public.teams t WHERE t.id = r.id);

  SELECT count(*) INTO huerfanas FROM (
    SELECT room_id FROM public.districts
    UNION ALL SELECT room_id FROM public.suppliers
    UNION ALL SELECT room_id FROM public.products
    UNION ALL SELECT room_id FROM public.backups
  ) x WHERE NOT EXISTS (SELECT 1 FROM public.teams t WHERE t.id = x.room_id);

  IF huerfanas > 0 THEN
    RAISE EXCEPTION 'Quedan % filas sin equipo. No se cambia nada.', huerfanas;
  END IF;

  ALTER TABLE public.districts DROP CONSTRAINT districts_room_id_fkey;
  ALTER TABLE public.districts ADD CONSTRAINT districts_room_id_fkey
    FOREIGN KEY (room_id) REFERENCES public.teams(id) ON DELETE CASCADE;

  ALTER TABLE public.suppliers DROP CONSTRAINT suppliers_room_id_fkey;
  ALTER TABLE public.suppliers ADD CONSTRAINT suppliers_room_id_fkey
    FOREIGN KEY (room_id) REFERENCES public.teams(id) ON DELETE CASCADE;

  ALTER TABLE public.products DROP CONSTRAINT products_room_id_fkey;
  ALTER TABLE public.products ADD CONSTRAINT products_room_id_fkey
    FOREIGN KEY (room_id) REFERENCES public.teams(id) ON DELETE CASCADE;

  ALTER TABLE public.backups DROP CONSTRAINT backups_room_id_fkey;
  ALTER TABLE public.backups ADD CONSTRAINT backups_room_id_fkey
    FOREIGN KEY (room_id) REFERENCES public.teams(id) ON DELETE CASCADE;

  SELECT count(DISTINCT tc.table_name) INTO correctas
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu ON kcu.constraint_name = tc.constraint_name
  JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
  WHERE tc.table_schema = 'public' AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'room_id' AND ccu.table_name = 'teams';

  IF correctas <> 4 THEN
    RAISE EXCEPTION 'Solo % de 4 restricciones quedaron bien. Se deshace todo.', correctas;
  END IF;
END $$;

-- ─── VUELTA ATRÁS, si alguna vez hiciera falta ─────────────────────
-- DO $$
-- BEGIN
--   ALTER TABLE public.districts DROP CONSTRAINT districts_room_id_fkey;
--   ALTER TABLE public.districts ADD CONSTRAINT districts_room_id_fkey
--     FOREIGN KEY (room_id) REFERENCES public.rooms(id) ON DELETE CASCADE;
--   ALTER TABLE public.suppliers DROP CONSTRAINT suppliers_room_id_fkey;
--   ALTER TABLE public.suppliers ADD CONSTRAINT suppliers_room_id_fkey
--     FOREIGN KEY (room_id) REFERENCES public.rooms(id) ON DELETE CASCADE;
--   ALTER TABLE public.products DROP CONSTRAINT products_room_id_fkey;
--   ALTER TABLE public.products ADD CONSTRAINT products_room_id_fkey
--     FOREIGN KEY (room_id) REFERENCES public.rooms(id) ON DELETE CASCADE;
--   ALTER TABLE public.backups DROP CONSTRAINT backups_room_id_fkey;
--   ALTER TABLE public.backups ADD CONSTRAINT backups_room_id_fkey
--     FOREIGN KEY (room_id) REFERENCES public.rooms(id) ON DELETE CASCADE;
-- END $$;
