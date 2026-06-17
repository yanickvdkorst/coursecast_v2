-- ============================================================
-- 017_tournament_visibility.sql
-- Public vs private tournaments. Public = anyone can self-enroll;
-- private = join only on approval/invite (enrollment flow added later).
-- ============================================================

ALTER TABLE tournaments
  ADD COLUMN visibility text NOT NULL DEFAULT 'public'
  CHECK (visibility IN ('public', 'private'));
