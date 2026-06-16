-- ============================================================
-- 015_mark_guest_profiles.sql
-- Flag anonymous (guest) profiles so they don't pollute the
-- player-selection lists, friend search, etc.
--
-- An anonymous Supabase user still gets a profiles row (needed for the
-- match FK + RLS), which made guests show up everywhere registered
-- accounts are listed. We tag those rows and filter them out in the UI.
-- ============================================================

ALTER TABLE profiles ADD COLUMN is_guest boolean NOT NULL DEFAULT false;

-- Backfill: existing anonymous users are guests.
UPDATE profiles p
SET is_guest = true
FROM auth.users u
WHERE u.id = p.id AND COALESCE(u.is_anonymous, false) = true;

-- New profiles inherit the anonymous flag at creation.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO profiles (id, username, full_name, avatar_url, is_guest)
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'username', ''),
      NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), ''),
      'guest_' || substr(NEW.id::text, 1, 8)
    ),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    COALESCE(NEW.is_anonymous, false)
  );
  RETURN NEW;
END;
$$;
