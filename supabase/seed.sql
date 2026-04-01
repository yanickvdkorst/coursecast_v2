-- ============================================================
-- seed.sql — Development seed data
-- Run after migrations with: supabase db reset
-- ============================================================

-- Insert a sample course
INSERT INTO courses (id, name, holes, par) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Augusta National', 18,
   ARRAY[4,5,4,3,4,3,4,5,4,4,4,3,5,4,5,3,4,4]);

-- Note: Users must be created via Supabase Auth (triggers auto-create profiles).
-- To seed an admin, after creating a user via auth, run:
-- UPDATE profiles SET role = 'admin' WHERE username = 'your_username';
