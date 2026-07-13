-- ============================================================
-- 022_match_schedule.sql
-- Optional per-match date/time, set by the tournament organiser.
-- ============================================================

ALTER TABLE matches ADD COLUMN scheduled_at timestamptz;
