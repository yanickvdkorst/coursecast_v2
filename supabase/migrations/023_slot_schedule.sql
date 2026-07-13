-- ============================================================
-- 023_slot_schedule.sql
-- Pre-scheduling of knock-out matches that don't exist as rows yet
-- (future rounds). Keyed by "round:bracket_pos" → ISO timestamp.
-- Applied to matches.scheduled_at when the match is created.
-- ============================================================

ALTER TABLE tournaments ADD COLUMN slot_schedule jsonb;
