-- ============================================================
-- 012_admin_manage_policies.sql
-- Let an admin fully manage competitions & tournaments.
--
-- Already present (002 / 005):
--   competitions_update_admin, competition_players_insert_admin
--   tournaments_update_admin, tournament_players_insert_admin,
--   tournament_players_delete_admin
--
-- Missing — DELETE policies. Without these the admin UI can edit and
-- add players but cannot remove a player or delete the whole event,
-- because "no policy" = deny under RLS.
-- ============================================================

-- Delete a whole competition (competition_players cascade,
-- matches.competition_id is set null by the FK).
CREATE POLICY "competitions_delete_admin"
  ON competitions FOR DELETE TO authenticated
  USING (is_admin());

-- Remove a player from any competition.
CREATE POLICY "competition_players_delete_admin"
  ON competition_players FOR DELETE TO authenticated
  USING (is_admin());

-- Delete a whole tournament (tournament_players cascade,
-- matches.tournament_id is set null by the FK).
CREATE POLICY "tournaments_delete_admin"
  ON tournaments FOR DELETE TO authenticated
  USING (is_admin());
