-- ============================================================
-- 024_match_viewers.sql
-- Live toeschouwer-teller voor de publieke kijkpagina's.
--
-- Elke open kijkpagina stuurt een heartbeat (track_match_viewer) met een
-- sleutel per tab. Een kijker telt mee zolang zijn heartbeat jonger is dan
-- 20 seconden; verlopen rijen worden bij elke call opgeruimd. De tabel is
-- alleen bereikbaar via de SECURITY DEFINER functie — RLS staat aan zonder
-- policies, dus anon/authenticated kunnen er niet rechtstreeks bij.
-- ============================================================

CREATE TABLE match_viewers (
  match_id   uuid        NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  viewer_key text        NOT NULL,
  last_seen  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (match_id, viewer_key)
);

CREATE INDEX match_viewers_match_seen_idx ON match_viewers (match_id, last_seen DESC);

ALTER TABLE match_viewers ENABLE ROW LEVEL SECURITY;

-- Heartbeat + telling in één call. De wedstrijd wordt op dezelfde manier
-- bepaald als in de publieke lees-RPC's: via de deel-token, of via het id
-- voor toernooiwedstrijden (die zijn per definitie openbaar). Geeft het
-- aantal actieve kijkers terug (jezelf meegeteld), of 0 als de link niet
-- (meer) geldig is.
CREATE OR REPLACE FUNCTION track_match_viewer(
  p_viewer_key text,
  p_token      text DEFAULT NULL,
  p_match_id   uuid DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_match_id uuid;
  v_count    integer;
BEGIN
  IF p_token IS NOT NULL AND length(p_token) > 0 THEN
    SELECT id INTO v_match_id FROM matches WHERE share_token = p_token;
  ELSIF p_match_id IS NOT NULL THEN
    SELECT id INTO v_match_id FROM matches WHERE id = p_match_id AND tournament_id IS NOT NULL;
  END IF;

  IF v_match_id IS NULL THEN RETURN 0; END IF;

  IF p_viewer_key IS NOT NULL AND length(p_viewer_key) BETWEEN 1 AND 64 THEN
    INSERT INTO match_viewers (match_id, viewer_key, last_seen)
    VALUES (v_match_id, p_viewer_key, now())
    ON CONFLICT (match_id, viewer_key) DO UPDATE SET last_seen = now();
  END IF;

  DELETE FROM match_viewers
   WHERE match_id = v_match_id
     AND last_seen < now() - interval '20 seconds';

  SELECT count(*) INTO v_count FROM match_viewers WHERE match_id = v_match_id;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION track_match_viewer(text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION track_match_viewer(text, text, uuid) TO anon, authenticated;
