-- ============================================================
-- 007_profile_hcp_club.sql
-- Add handicap index and golf club to profiles
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS handicap  numeric(4,1) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS golf_club text         DEFAULT NULL;
