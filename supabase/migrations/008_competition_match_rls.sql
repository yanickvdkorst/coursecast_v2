-- ============================================================
-- 008_competition_match_rls.sql
-- Allow all competition participants to see every match in their competition
-- (Without this, players only see matches they personally played)
-- ============================================================

CREATE POLICY "matches_select_competition_participant"
  ON matches FOR SELECT TO authenticated
  USING (
    competition_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM competition_players
      WHERE competition_id = matches.competition_id
        AND player_id = auth.uid()
    )
  );
