-- ============================================================
-- 003_realtime_enable.sql
-- Enable Supabase Realtime on tables that need live sync
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE
  matches,
  hole_results,
  competition_players,
  tournament_players;
