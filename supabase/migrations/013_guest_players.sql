-- ============================================================
-- 013_guest_players.sql
-- Guest players via Supabase anonymous auth + a join-code lobby.
--
-- PREREQUISITE: enable Anonymous sign-ins in the Supabase dashboard
-- (Authentication → Providers → Anonymous sign-ins).
-- ============================================================

-- ── 1. Anonymous-safe profile creation ───────────────────────
-- Anonymous users have no email and no username metadata. The old trigger
-- would then insert username = NULL (NOT NULL violation) and abort the
-- anonymous sign-in entirely. Give them a unique fallback username.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO profiles (id, username, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'username', ''),
      NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), ''),
      'guest_' || substr(NEW.id::text, 1, 8)
    ),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN NEW;
END;
$$;

-- ── 2. Guest invite lobby ─────────────────────────────────────
CREATE TABLE guest_invites (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code       text NOT NULL,
  host_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  guest_id   uuid REFERENCES profiles(id) ON DELETE SET NULL,
  course_id  uuid REFERENCES courses(id) ON DELETE SET NULL,
  match_id   uuid REFERENCES matches(id) ON DELETE SET NULL,
  status     text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'joined', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Code must be unique among still-open invites (codes can be reused later).
CREATE UNIQUE INDEX guest_invites_open_code ON guest_invites (code) WHERE status = 'open';
CREATE INDEX idx_guest_invites_host ON guest_invites (host_id);

ALTER TABLE guest_invites ENABLE ROW LEVEL SECURITY;

-- Host manages own invites; all guest interactions go via SECURITY DEFINER RPCs.
CREATE POLICY "guest_invites_select_host"
  ON guest_invites FOR SELECT TO authenticated
  USING (host_id = auth.uid());

CREATE POLICY "guest_invites_insert_host"
  ON guest_invites FOR INSERT TO authenticated
  WITH CHECK (host_id = auth.uid());

CREATE POLICY "guest_invites_update_host"
  ON guest_invites FOR UPDATE TO authenticated
  USING (host_id = auth.uid());

-- Realtime: host waiting screen listens for status → 'joined'.
ALTER PUBLICATION supabase_realtime ADD TABLE guest_invites;

-- ── 3. RPCs ───────────────────────────────────────────────────

-- Host: create an invite with a unique 4-digit code.
CREATE OR REPLACE FUNCTION create_guest_invite(p_course_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_code  text;
  v_id    uuid;
  v_tries int := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Niet ingelogd';
  END IF;

  LOOP
    v_tries := v_tries + 1;
    v_code := lpad((floor(random() * 10000))::int::text, 4, '0');
    BEGIN
      INSERT INTO guest_invites (code, host_id, course_id)
      VALUES (v_code, auth.uid(), p_course_id)
      RETURNING id INTO v_id;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      IF v_tries > 20 THEN RAISE EXCEPTION 'Kon geen vrije code vinden'; END IF;
    END;
  END LOOP;

  RETURN jsonb_build_object('invite_id', v_id, 'code', v_code);
END;
$$;

-- Guest (or anyone): look up an open invite by code → host + course name.
-- Granted to anon so the code can be validated before an anon user is created.
CREATE OR REPLACE FUNCTION lookup_guest_invite(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_invite      guest_invites%ROWTYPE;
  v_host_name   text;
  v_course_name text;
BEGIN
  SELECT * INTO v_invite FROM guest_invites
  WHERE code = p_code AND status = 'open'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(NULLIF(full_name, ''), username) INTO v_host_name
  FROM profiles WHERE id = v_invite.host_id;

  SELECT name INTO v_course_name FROM courses WHERE id = v_invite.course_id;

  RETURN jsonb_build_object(
    'invite_id', v_invite.id,
    'host_name', v_host_name,
    'course_name', v_course_name
  );
END;
$$;

-- Guest (anonymous, already signed in): claim the invite, set name, create match.
CREATE OR REPLACE FUNCTION join_guest_match(p_code text, p_guest_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_invite   guest_invites%ROWTYPE;
  v_match_id uuid;
  v_guest    uuid := auth.uid();
BEGIN
  IF v_guest IS NULL THEN
    RAISE EXCEPTION 'Niet ingelogd';
  END IF;
  IF p_guest_name IS NULL OR length(trim(p_guest_name)) = 0 THEN
    RAISE EXCEPTION 'Naam is verplicht';
  END IF;

  -- Lock the open invite so two guests cannot claim the same code.
  SELECT * INTO v_invite FROM guest_invites
  WHERE code = p_code AND status = 'open'
  FOR UPDATE
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Code is ongeldig of al gebruikt';
  END IF;
  IF v_invite.host_id = v_guest THEN
    RAISE EXCEPTION 'Je kunt niet je eigen gast zijn';
  END IF;

  -- Set the guest's display name.
  UPDATE profiles SET full_name = trim(p_guest_name) WHERE id = v_guest;

  -- Create the match: host = player A, guest = player B.
  INSERT INTO matches (player_a_id, player_b_id, course_id, status)
  VALUES (v_invite.host_id, v_guest, v_invite.course_id, 'pending')
  RETURNING id INTO v_match_id;

  -- Consume the invite.
  UPDATE guest_invites
  SET status = 'joined', guest_id = v_guest, match_id = v_match_id
  WHERE id = v_invite.id;

  RETURN v_match_id;
END;
$$;

REVOKE ALL ON FUNCTION create_guest_invite(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION lookup_guest_invite(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION join_guest_match(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_guest_invite(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION lookup_guest_invite(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION join_guest_match(text, text) TO authenticated;
