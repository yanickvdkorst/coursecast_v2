-- ============================================================
-- 021_bracket.sql
-- Knock-out bracket support.
--   tournaments.bracket  — round-1 slot order as a JSON array of player ids
--                          (null = bye), length = bracket size (power of 2).
--   matches.bracket_pos  — 0-indexed match position within its round.
-- Advancement (creating later-round matches from winners) is done server-side
-- in TypeScript (src/lib/bracket.ts) via a service-role reconcile action.
-- ============================================================

ALTER TABLE tournaments ADD COLUMN bracket jsonb;
ALTER TABLE matches ADD COLUMN bracket_pos int;
