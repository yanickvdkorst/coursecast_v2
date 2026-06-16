-- ============================================================
-- 014_match_spectator.sql
-- Public, read-only spectator links for live match viewing.
--
-- A participant enables sharing → an unguessable token. Anyone with the
-- /watch/<token> link can read the match + scores via get_shared_match
-- (SECURITY DEFINER, granted to anon). There is no write path for
-- spectators, and RLS still blocks any direct table access.
-- ============================================================

ALTER TABLE matches ADD COLUMN share_token text;
CREATE UNIQUE INDEX matches_share_token_key ON matches (share_token) WHERE share_token IS NOT NULL;

-- Participant guard shared by the two mutating RPCs.
CREATE OR REPLACE FUNCTION assert_match_participant(p_match_id uuid)
RETURNS matches
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_match matches%ROWTYPE;
BEGIN
  SELECT * INTO v_match FROM matches WHERE id = p_match_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Wedstrijd niet gevonden'; END IF;
  IF auth.uid() IS NULL OR (v_match.player_a_id <> auth.uid() AND v_match.player_b_id <> auth.uid()) THEN
    RAISE EXCEPTION 'Geen deelnemer aan deze wedstrijd';
  END IF;
  RETURN v_match;
END;
$$;

-- Enable sharing (idempotent) → returns the token. Participant only.
CREATE OR REPLACE FUNCTION enable_match_sharing(p_match_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_match matches%ROWTYPE;
  v_token text;
BEGIN
  v_match := assert_match_participant(p_match_id);
  v_token := v_match.share_token;
  IF v_token IS NULL THEN
    v_token := replace(gen_random_uuid()::text, '-', '');
    UPDATE matches SET share_token = v_token WHERE id = p_match_id;
  END IF;
  RETURN v_token;
END;
$$;

-- Disable sharing. Participant only.
CREATE OR REPLACE FUNCTION disable_match_sharing(p_match_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM assert_match_participant(p_match_id);
  UPDATE matches SET share_token = NULL WHERE id = p_match_id;
END;
$$;

-- Public read-only fetch by token → match, player names, course, holes.
CREATE OR REPLACE FUNCTION get_shared_match(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_match  matches%ROWTYPE;
  v_a      profiles%ROWTYPE;
  v_b      profiles%ROWTYPE;
  v_course courses%ROWTYPE;
  v_holes  jsonb;
BEGIN
  IF p_token IS NULL OR length(p_token) = 0 THEN RETURN NULL; END IF;

  SELECT * INTO v_match FROM matches WHERE share_token = p_token;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT * INTO v_a FROM profiles WHERE id = v_match.player_a_id;
  SELECT * INTO v_b FROM profiles WHERE id = v_match.player_b_id;
  SELECT * INTO v_course FROM courses WHERE id = v_match.course_id;

  SELECT COALESCE(
           jsonb_agg(jsonb_build_object('hole_number', hr.hole_number, 'result', hr.result)
                     ORDER BY hr.hole_number),
           '[]'::jsonb)
  INTO v_holes
  FROM hole_results hr WHERE hr.match_id = v_match.id;

  RETURN jsonb_build_object(
    'match', jsonb_build_object(
      'id', v_match.id,
      'status', v_match.status,
      'result_summary', v_match.result_summary,
      'winner_id', v_match.winner_id,
      'player_a_id', v_match.player_a_id,
      'player_b_id', v_match.player_b_id
    ),
    'player_a_name', COALESCE(NULLIF(v_a.full_name, ''), v_a.username),
    'player_b_name', COALESCE(NULLIF(v_b.full_name, ''), v_b.username),
    'course_name', v_course.name,
    'total_holes', COALESCE(v_course.holes, 18),
    'course_par', v_course.par,
    'hole_results', v_holes
  );
END;
$$;

REVOKE ALL ON FUNCTION enable_match_sharing(uuid)  FROM PUBLIC;
REVOKE ALL ON FUNCTION disable_match_sharing(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION get_shared_match(text)      FROM PUBLIC;
GRANT EXECUTE ON FUNCTION enable_match_sharing(uuid)  TO authenticated;
GRANT EXECUTE ON FUNCTION disable_match_sharing(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_shared_match(text)      TO anon, authenticated;
