-- ============================================================
-- 002_rls_policies.sql
-- Row Level Security for all tables
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses            ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches            ENABLE ROW LEVEL SECURITY;
ALTER TABLE hole_results       ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_players ENABLE ROW LEVEL SECURITY;

-- Helper: check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Helper: check if current user is participant in a match
CREATE OR REPLACE FUNCTION is_match_participant(match_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM matches
    WHERE id = match_id
      AND (player_a_id = auth.uid() OR player_b_id = auth.uid())
  );
$$;

-- ── Profiles ─────────────────────────────────────────────────
CREATE POLICY "profiles_select_authenticated"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ── Courses ───────────────────────────────────────────────────
CREATE POLICY "courses_select_authenticated"
  ON courses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "courses_insert_admin"
  ON courses FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "courses_update_admin"
  ON courses FOR UPDATE
  TO authenticated
  USING (is_admin());

-- ── Matches ───────────────────────────────────────────────────
CREATE POLICY "matches_select_participants_or_admin"
  ON matches FOR SELECT
  TO authenticated
  USING (
    player_a_id = auth.uid()
    OR player_b_id = auth.uid()
    OR is_admin()
  );

CREATE POLICY "matches_insert_authenticated"
  ON matches FOR INSERT
  TO authenticated
  WITH CHECK (
    player_a_id = auth.uid() OR is_admin()
  );

CREATE POLICY "matches_update_participants_or_admin"
  ON matches FOR UPDATE
  TO authenticated
  USING (
    player_a_id = auth.uid()
    OR player_b_id = auth.uid()
    OR is_admin()
  );

-- ── Hole Results ──────────────────────────────────────────────
CREATE POLICY "hole_results_select_participants"
  ON hole_results FOR SELECT
  TO authenticated
  USING (is_match_participant(match_id) OR is_admin());

CREATE POLICY "hole_results_insert_participants"
  ON hole_results FOR INSERT
  TO authenticated
  WITH CHECK (is_match_participant(match_id));

CREATE POLICY "hole_results_update_participants"
  ON hole_results FOR UPDATE
  TO authenticated
  USING (is_match_participant(match_id))
  WITH CHECK (is_match_participant(match_id));

CREATE POLICY "hole_results_delete_participants"
  ON hole_results FOR DELETE
  TO authenticated
  USING (is_match_participant(match_id));

-- ── Tournaments ───────────────────────────────────────────────
CREATE POLICY "tournaments_select_authenticated"
  ON tournaments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "tournaments_insert_admin"
  ON tournaments FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "tournaments_update_admin"
  ON tournaments FOR UPDATE
  TO authenticated
  USING (is_admin());

-- ── Tournament Players ────────────────────────────────────────
CREATE POLICY "tournament_players_select_authenticated"
  ON tournament_players FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "tournament_players_insert_admin"
  ON tournament_players FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "tournament_players_delete_admin"
  ON tournament_players FOR DELETE
  TO authenticated
  USING (is_admin());

-- ── Competitions ──────────────────────────────────────────────
CREATE POLICY "competitions_select_authenticated"
  ON competitions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "competitions_insert_admin"
  ON competitions FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "competitions_update_admin"
  ON competitions FOR UPDATE
  TO authenticated
  USING (is_admin());

-- ── Competition Players ───────────────────────────────────────
CREATE POLICY "competition_players_select_authenticated"
  ON competition_players FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "competition_players_insert_admin"
  ON competition_players FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- Points updated via trigger (SECURITY DEFINER), no direct update policy needed
