-- ============================================================
-- 006_tournament_match_rls.sql
-- Allow all tournament participants to see every match in their tournament
-- (Without this, players only see matches they personally played)
-- ============================================================

CREATE POLICY "matches_select_tournament_participant"
  ON matches FOR SELECT TO authenticated
  USING (
    tournament_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM tournament_players
      WHERE tournament_id = matches.tournament_id
        AND player_id = auth.uid()
    )
  );
