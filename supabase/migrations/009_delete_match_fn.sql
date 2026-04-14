-- ============================================================
-- 009_delete_match_fn.sql
-- Atomic match deletion + competition standings recompute
-- SECURITY DEFINER bypasses RLS so the function can:
--   1. Delete hole_results for the match
--   2. Delete the match itself (no DELETE policy exists on matches)
--   3. Recompute competition_players from remaining completed matches
-- ============================================================

CREATE OR REPLACE FUNCTION delete_match_and_recompute(
  p_match_id  uuid,
  p_user_id   uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_match         matches%ROWTYPE;
  v_comp_id       uuid;
  v_tournament_id uuid;
  v_format        text;
  rec             RECORD;
BEGIN
  -- Fetch match
  SELECT * INTO v_match FROM matches WHERE id = p_match_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'match_not_found');
  END IF;

  -- Verify caller is a participant
  IF v_match.player_a_id != p_user_id AND v_match.player_b_id != p_user_id THEN
    RETURN jsonb_build_object('error', 'not_participant');
  END IF;

  v_comp_id       := v_match.competition_id;
  v_tournament_id := v_match.tournament_id;

  -- Delete hole results first (trigger fires but match still exists — safe)
  DELETE FROM hole_results WHERE match_id = p_match_id;

  -- Delete the match
  DELETE FROM matches WHERE id = p_match_id;

  -- Recompute competition standings from remaining completed matches
  IF v_comp_id IS NOT NULL THEN
    SELECT format INTO v_format FROM competitions WHERE id = v_comp_id;

    -- Zero out all players in this competition
    UPDATE competition_players
    SET wins = 0, losses = 0, draws = 0, matches_played = 0, points = 0
    WHERE competition_id = v_comp_id;

    -- Re-aggregate from remaining completed matches
    FOR rec IN
      SELECT player_a_id, player_b_id, winner_id
      FROM matches
      WHERE competition_id = v_comp_id
        AND status = 'complete'
    LOOP
      IF rec.winner_id IS NOT NULL THEN
        -- Winner
        UPDATE competition_players SET
          wins           = wins + 1,
          matches_played = matches_played + 1,
          points         = points + CASE WHEN v_format = 'matchplay_points' THEN 2 ELSE 1 END
        WHERE competition_id = v_comp_id AND player_id = rec.winner_id;

        -- Loser
        UPDATE competition_players SET
          losses         = losses + 1,
          matches_played = matches_played + 1
        WHERE competition_id = v_comp_id
          AND player_id IN (rec.player_a_id, rec.player_b_id)
          AND player_id != rec.winner_id;
      ELSE
        -- Draw
        UPDATE competition_players SET
          draws          = draws + 1,
          matches_played = matches_played + 1,
          points         = points + CASE WHEN v_format = 'matchplay_points' THEN 1 ELSE 0 END
        WHERE competition_id = v_comp_id
          AND player_id IN (rec.player_a_id, rec.player_b_id);
      END IF;
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'competition_id',  v_comp_id,
    'tournament_id',   v_tournament_id
  );
END;
$$;
