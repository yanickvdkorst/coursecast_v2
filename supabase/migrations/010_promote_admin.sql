-- Promote a single dedicated admin account.
--
-- HOW TO USE:
--   1. First create the admin account by signing up normally in the app with
--      the email you want to use as admin (e.g. admin@digitalebazen.nl), and
--      confirm the email.
--   2. Replace the email below with that exact address.
--   3. Run this in the Supabase SQL editor (or via the migration).
--
-- The `is_admin()` helper + RLS policies already grant an admin SELECT access
-- to every match and hole_result, so no further changes are needed.

update public.profiles
set role = 'admin'
where id = (
  select id from auth.users
  where email = 'admin@digitalebazen.nl'
);

-- Verify (optional): should return exactly one row with role = 'admin'.
-- select p.id, u.email, p.role
-- from public.profiles p
-- join auth.users u on u.id = p.id
-- where p.role = 'admin';
