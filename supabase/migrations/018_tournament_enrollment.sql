-- ============================================================
-- 018_tournament_enrollment.sql
-- Membership status for tournament players:
--   accepted  — full participant (counts in standings + matches)
--   requested — asked to join a private tournament (awaits owner)
--   invited   — owner invited the player (awaits player) [used later]
-- Existing rows default to 'accepted'.
--
-- Enrollment/accept happen via server actions using the service role with
-- explicit ownership/visibility checks, so no extra RLS is required here.
-- ============================================================

ALTER TABLE tournament_players
  ADD COLUMN status text NOT NULL DEFAULT 'accepted'
  CHECK (status IN ('accepted', 'requested', 'invited'));

CREATE INDEX idx_tournament_players_status ON tournament_players (tournament_id, status);
