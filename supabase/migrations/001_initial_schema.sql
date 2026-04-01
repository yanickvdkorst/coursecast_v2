-- ============================================================
-- 001_initial_schema.sql
-- Golf Matchplay App — Full schema, triggers, and functions
-- ============================================================

-- ── Profiles ─────────────────────────────────────────────────
CREATE TABLE profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username    text UNIQUE NOT NULL,
  full_name   text,
  avatar_url  text,
  role        text NOT NULL DEFAULT 'player' CHECK (role IN ('player', 'admin')),
  theme       text NOT NULL DEFAULT 'dark'   CHECK (theme IN ('dark', 'light')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Auto-create profile on sign-up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, username, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

-- ── Courses ───────────────────────────────────────────────────
CREATE TABLE courses (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  holes       int  NOT NULL DEFAULT 18,
  par         int[],
  created_by  uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── Tournaments ───────────────────────────────────────────────
CREATE TABLE tournaments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  format      text NOT NULL CHECK (format IN ('bracket', 'round_robin')),
  status      text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'complete')),
  course_id   uuid REFERENCES courses(id) ON DELETE SET NULL,
  created_by  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  starts_at   timestamptz,
  ends_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE tournament_players (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id   uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  player_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  seed            int,
  group_name      text,
  joined_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, player_id)
);

-- ── Competitions ──────────────────────────────────────────────
CREATE TABLE competitions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  format      text NOT NULL CHECK (format IN ('matchplay_points', 'winsonly')),
  status      text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'complete')),
  created_by  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  starts_at   timestamptz,
  ends_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE competition_players (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id  uuid NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  player_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  points          numeric NOT NULL DEFAULT 0,
  wins            int     NOT NULL DEFAULT 0,
  draws           int     NOT NULL DEFAULT 0,
  losses          int     NOT NULL DEFAULT 0,
  matches_played  int     NOT NULL DEFAULT 0,
  joined_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (competition_id, player_id)
);

-- ── Matches ───────────────────────────────────────────────────
CREATE TABLE matches (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id       uuid REFERENCES courses(id) ON DELETE SET NULL,
  player_a_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  player_b_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'active', 'complete', 'conceded')),
  winner_id       uuid REFERENCES profiles(id) ON DELETE SET NULL,
  result_summary  text,
  tournament_id   uuid REFERENCES tournaments(id) ON DELETE SET NULL,
  competition_id  uuid REFERENCES competitions(id) ON DELETE SET NULL,
  round           int,
  created_at      timestamptz NOT NULL DEFAULT now(),
  started_at      timestamptz,
  completed_at    timestamptz
);

-- ── Hole Results ──────────────────────────────────────────────
CREATE TABLE hole_results (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id    uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  hole_number int  NOT NULL CHECK (hole_number BETWEEN 1 AND 18),
  result      text NOT NULL CHECK (result IN ('player_a', 'player_b', 'halved')),
  recorded_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (match_id, hole_number)
);

-- ── Match Status Trigger ──────────────────────────────────────
-- Recalculates match status after any hole result change.
-- Sets match to 'complete' when result is mathematically decided.
CREATE OR REPLACE FUNCTION update_match_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_match         matches%ROWTYPE;
  v_total_holes   int;
  v_holes_played  int;
  v_a_wins        int := 0;
  v_b_wins        int := 0;
  v_holes_up      int;
  v_holes_left    int;
  v_winner_id     uuid := NULL;
  v_summary       text := '';
  rec             RECORD;
BEGIN
  SELECT * INTO v_match FROM matches WHERE id = COALESCE(NEW.match_id, OLD.match_id);

  -- Get total holes from course, default 18
  SELECT COALESCE(holes, 18) INTO v_total_holes
  FROM courses WHERE id = v_match.course_id;
  v_total_holes := COALESCE(v_total_holes, 18);

  -- Count hole wins per player
  FOR rec IN
    SELECT result FROM hole_results WHERE match_id = v_match.id
  LOOP
    IF rec.result = 'player_a' THEN v_a_wins := v_a_wins + 1;
    ELSIF rec.result = 'player_b' THEN v_b_wins := v_b_wins + 1;
    END IF;
  END LOOP;

  v_holes_played := v_a_wins + v_b_wins +
    (SELECT COUNT(*) FROM hole_results WHERE match_id = v_match.id AND result = 'halved');
  v_holes_left := v_total_holes - v_holes_played;
  v_holes_up := ABS(v_a_wins - v_b_wins);

  -- Check if match is decided
  IF v_a_wins > v_b_wins AND v_a_wins - v_b_wins > v_holes_left THEN
    -- Player A wins e.g. "3&2"
    v_winner_id := v_match.player_a_id;
    v_summary := (v_a_wins - v_b_wins)::text || '&' || v_holes_left::text;
    -- Edge: last hole win → "1UP"
    IF v_holes_left = 0 THEN v_summary := '1UP'; END IF;
  ELSIF v_b_wins > v_a_wins AND v_b_wins - v_a_wins > v_holes_left THEN
    -- Player B wins
    v_winner_id := v_match.player_b_id;
    v_summary := (v_b_wins - v_a_wins)::text || '&' || v_holes_left::text;
    IF v_holes_left = 0 THEN v_summary := '1UP'; END IF;
  ELSIF v_holes_played = v_total_holes THEN
    -- All holes played
    IF v_a_wins > v_b_wins THEN
      v_winner_id := v_match.player_a_id;
      v_summary := '1UP';
    ELSIF v_b_wins > v_a_wins THEN
      v_winner_id := v_match.player_b_id;
      v_summary := '1UP';
    ELSE
      v_winner_id := NULL;
      v_summary := 'AS';
    END IF;
  END IF;

  -- Only update if status is changing meaningfully
  IF v_winner_id IS NOT NULL OR v_summary = 'AS' THEN
    UPDATE matches SET
      status         = 'complete',
      winner_id      = v_winner_id,
      result_summary = v_summary,
      completed_at   = now()
    WHERE id = v_match.id AND status != 'complete';
  ELSE
    -- Ensure match is 'active' once scoring starts
    UPDATE matches SET
      status     = 'active',
      started_at = COALESCE(started_at, now())
    WHERE id = v_match.id AND status = 'pending';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_hole_result_change
  AFTER INSERT OR UPDATE OR DELETE ON hole_results
  FOR EACH ROW EXECUTE PROCEDURE update_match_status();

-- ── Competition Standings Trigger ─────────────────────────────
CREATE OR REPLACE FUNCTION update_competition_standings()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_comp_id uuid;
  v_format  text;
BEGIN
  -- Only act when match transitions to 'complete'
  IF NEW.status != 'complete' OR OLD.status = 'complete' THEN
    RETURN NEW;
  END IF;

  v_comp_id := NEW.competition_id;
  IF v_comp_id IS NULL THEN RETURN NEW; END IF;

  SELECT format INTO v_format FROM competitions WHERE id = v_comp_id;

  -- Points: matchplay_points = 2/1/0, winsonly = 1/0/0
  IF NEW.winner_id IS NOT NULL THEN
    -- Winner
    UPDATE competition_players SET
      wins           = wins + 1,
      matches_played = matches_played + 1,
      points         = points + CASE WHEN v_format = 'matchplay_points' THEN 2 ELSE 1 END
    WHERE competition_id = v_comp_id AND player_id = NEW.winner_id;

    -- Loser
    UPDATE competition_players SET
      losses         = losses + 1,
      matches_played = matches_played + 1
    WHERE competition_id = v_comp_id
      AND player_id IN (NEW.player_a_id, NEW.player_b_id)
      AND player_id != NEW.winner_id;
  ELSE
    -- Draw (All Square)
    UPDATE competition_players SET
      draws          = draws + 1,
      matches_played = matches_played + 1,
      points         = points + CASE WHEN v_format = 'matchplay_points' THEN 1 ELSE 0 END
    WHERE competition_id = v_comp_id
      AND player_id IN (NEW.player_a_id, NEW.player_b_id);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_match_complete
  AFTER UPDATE ON matches
  FOR EACH ROW EXECUTE PROCEDURE update_competition_standings();

-- ── Indexes ───────────────────────────────────────────────────
CREATE INDEX idx_matches_player_a    ON matches(player_a_id);
CREATE INDEX idx_matches_player_b    ON matches(player_b_id);
CREATE INDEX idx_matches_tournament  ON matches(tournament_id);
CREATE INDEX idx_matches_competition ON matches(competition_id);
CREATE INDEX idx_hole_results_match  ON hole_results(match_id);
CREATE INDEX idx_comp_players_comp   ON competition_players(competition_id);
CREATE INDEX idx_tourn_players_tourn ON tournament_players(tournament_id);
