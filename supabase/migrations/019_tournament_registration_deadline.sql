-- ============================================================
-- 019_tournament_registration_deadline.sql
-- Latest date players may still enroll. NULL = no deadline.
-- Enrollment is allowed up to and including this date.
-- ============================================================

ALTER TABLE tournaments ADD COLUMN registration_deadline date;
