-- ============================================================
-- 020_public_tournament.sql
-- Public, read-only tournament live overview + per-match viewing.
-- A tournament is identified by its (unguessable) UUID; anyone with the
-- /t/<id> link can follow it. Only matches that belong to a tournament are
-- exposed by get_public_tournament_match, never standalone private matches.
-- ============================================================

CREATE OR REPLACE FUNCTION get_public_tournament(p_tournament_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_t       tournaments%ROWTYPE;
  v_matches jsonb;
BEGIN
  SELECT * INTO v_t FROM tournaments WHERE id = p_tournament_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT COALESCE(
           jsonb_agg(jsonb_build_object(
             'id', m.id,
             'round', m.round,
             'status', m.status,
             'result_summary', m.result_summary,
             'winner_id', m.winner_id,
             'player_a_id', m.player_a_id,
             'player_b_id', m.player_b_id,
             'a_name', COALESCE(NULLIF(pa.full_name, ''), pa.username),
             'b_name', COALESCE(NULLIF(pb.full_name, ''), pb.username)
           ) ORDER BY m.round, m.created_at),
           '[]'::jsonb)
  INTO v_matches
  FROM matches m
  LEFT JOIN profiles pa ON pa.id = m.player_a_id
  LEFT JOIN profiles pb ON pb.id = m.player_b_id
  WHERE m.tournament_id = p_tournament_id;

  RETURN jsonb_build_object(
    'tournament', jsonb_build_object('id', v_t.id, 'name', v_t.name, 'format', v_t.format, 'status', v_t.status),
    'matches', v_matches
  );
END;
$$;

CREATE OR REPLACE FUNCTION get_public_tournament_match(p_match_id uuid)
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
  SELECT * INTO v_match FROM matches WHERE id = p_match_id AND tournament_id IS NOT NULL;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT * INTO v_a FROM profiles WHERE id = v_match.player_a_id;
  SELECT * INTO v_b FROM profiles WHERE id = v_match.player_b_id;
  SELECT * INTO v_course FROM courses WHERE id = v_match.course_id;

  SELECT COALESCE(
           jsonb_agg(jsonb_build_object('hole_number', hr.hole_number, 'result', hr.result) ORDER BY hr.hole_number),
           '[]'::jsonb)
  INTO v_holes
  FROM hole_results hr WHERE hr.match_id = v_match.id;

  RETURN jsonb_build_object(
    'match', jsonb_build_object(
      'id', v_match.id, 'status', v_match.status, 'result_summary', v_match.result_summary,
      'winner_id', v_match.winner_id, 'player_a_id', v_match.player_a_id, 'player_b_id', v_match.player_b_id
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

REVOKE ALL ON FUNCTION get_public_tournament(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION get_public_tournament_match(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_public_tournament(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_public_tournament_match(uuid) TO anon, authenticated;
