-- ============================================================
-- 004_friendships.sql
-- Friendships table with request/accept flow
-- ============================================================

CREATE TABLE friendships (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (requester_id, addressee_id),
  CHECK (requester_id != addressee_id)
);

ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- Both parties can see their own friendships
CREATE POLICY "friendships_select_own"
  ON friendships FOR SELECT TO authenticated
  USING (requester_id = auth.uid() OR addressee_id = auth.uid());

-- Only the requester can send a request
CREATE POLICY "friendships_insert_own"
  ON friendships FOR INSERT TO authenticated
  WITH CHECK (requester_id = auth.uid());

-- Only the addressee can accept/decline
CREATE POLICY "friendships_update_addressee"
  ON friendships FOR UPDATE TO authenticated
  USING (addressee_id = auth.uid());

-- Either party can remove the friendship
CREATE POLICY "friendships_delete_own"
  ON friendships FOR DELETE TO authenticated
  USING (requester_id = auth.uid() OR addressee_id = auth.uid());

CREATE INDEX idx_friendships_requester ON friendships(requester_id);
CREATE INDEX idx_friendships_addressee ON friendships(addressee_id);
