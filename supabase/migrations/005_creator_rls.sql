-- ============================================================
-- 005_creator_rls.sql
-- Allow any authenticated user to create tournaments/competitions
-- ============================================================

-- ── Tournaments ───────────────────────────────────────────────
DROP POLICY IF EXISTS "tournaments_insert_admin" ON tournaments;
CREATE POLICY "tournaments_insert_any"
  ON tournaments FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "tournaments_update_admin" ON tournaments;
CREATE POLICY "tournaments_update_creator"
  ON tournaments FOR UPDATE TO authenticated
  USING (created_by = auth.uid());

-- ── Tournament Players ────────────────────────────────────────
DROP POLICY IF EXISTS "tournament_players_insert_admin" ON tournament_players;
CREATE POLICY "tournament_players_insert_creator"
  ON tournament_players FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tournaments
      WHERE id = tournament_id AND created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "tournament_players_delete_admin" ON tournament_players;
CREATE POLICY "tournament_players_delete_creator"
  ON tournament_players FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tournaments
      WHERE id = tournament_id AND created_by = auth.uid()
    )
  );

-- ── Competitions ──────────────────────────────────────────────
DROP POLICY IF EXISTS "competitions_insert_admin" ON competitions;
CREATE POLICY "competitions_insert_any"
  ON competitions FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "competitions_update_admin" ON competitions;
CREATE POLICY "competitions_update_creator"
  ON competitions FOR UPDATE TO authenticated
  USING (created_by = auth.uid());

-- ── Competition Players ───────────────────────────────────────
DROP POLICY IF EXISTS "competition_players_insert_admin" ON competition_players;
CREATE POLICY "competition_players_insert_creator"
  ON competition_players FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM competitions
      WHERE id = competition_id AND created_by = auth.uid()
    )
  );

CREATE POLICY "competition_players_delete_creator"
  ON competition_players FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM competitions
      WHERE id = competition_id AND created_by = auth.uid()
    )
  );
