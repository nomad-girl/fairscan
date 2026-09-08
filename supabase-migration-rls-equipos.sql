-- ═══════════════════════════════════════════════════════════════════════════
-- FairScan · pieza 1.18 · La base solo deja ver y tocar los datos del propio equipo
--
-- Hoy `products`, `suppliers`, `districts` y `backups` tienen una única regla
-- "Public access = true": cualquiera con la llave pública de la app (que va en el
-- paquete) puede leer y escribir todo, de todos los equipos. El 08/09 una cuenta
-- de prueba escribió un producto en el equipo de La Melange sin ser miembro.
--
-- Esto reemplaza esa regla por "solo si el equipo es uno de los míos", usando la
-- misma función `user_team_ids()` que ya protege `team_members`.
--
-- No afecta al servidor (borrar cuenta, funciones de Netlify usan la llave
-- maestra, que no pasa por estas reglas). Los equipos archivados sin miembros
-- quedan inaccesibles desde la app: es lo esperado.
--
-- Vuelta atrás: correr el bloque ROLLBACK de abajo.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- products
drop policy if exists "Public access" on public.products;
create policy "Miembros del equipo" on public.products
  for all to authenticated
  using (room_id in (select public.user_team_ids()))
  with check (room_id in (select public.user_team_ids()));

-- suppliers
drop policy if exists "Public access" on public.suppliers;
create policy "Miembros del equipo" on public.suppliers
  for all to authenticated
  using (room_id in (select public.user_team_ids()))
  with check (room_id in (select public.user_team_ids()));

-- districts
drop policy if exists "Public access" on public.districts;
create policy "Miembros del equipo" on public.districts
  for all to authenticated
  using (room_id in (select public.user_team_ids()))
  with check (room_id in (select public.user_team_ids()));

-- backups (snapshots automáticos por equipo)
drop policy if exists "Public access" on public.backups;
create policy "Miembros del equipo" on public.backups
  for all to authenticated
  using (room_id in (select public.user_team_ids()))
  with check (room_id in (select public.user_team_ids()));

-- rooms (tabla vieja; la app ya no la usa). Sin regla = nadie desde la app.
drop policy if exists "Public access" on public.rooms;

commit;

-- ─── ROLLBACK (solo si algo se rompe) ──────────────────────────────────────
-- begin;
-- drop policy if exists "Miembros del equipo" on public.products;  create policy "Public access" on public.products  for all using (true) with check (true);
-- drop policy if exists "Miembros del equipo" on public.suppliers; create policy "Public access" on public.suppliers for all using (true) with check (true);
-- drop policy if exists "Miembros del equipo" on public.districts; create policy "Public access" on public.districts for all using (true) with check (true);
-- drop policy if exists "Miembros del equipo" on public.backups;   create policy "Public access" on public.backups   for all using (true) with check (true);
-- create policy "Public access" on public.rooms for all using (true) with check (true);
-- commit;
