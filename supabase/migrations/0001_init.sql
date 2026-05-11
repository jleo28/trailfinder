-- ─────────────────────────────────────────────────────────────────────────────
-- TrailFinder — initial schema
-- ─────────────────────────────────────────────────────────────────────────────

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- for future ILIKE optimisation

-- ─── Enums ───────────────────────────────────────────────────────────────────

CREATE TYPE difficulty        AS ENUM ('easy', 'moderate', 'hard');
CREATE TYPE route_type        AS ENUM ('loop', 'out_and_back', 'point_to_point');
CREATE TYPE friendship_status AS ENUM ('pending', 'accepted', 'blocked');
CREATE TYPE reaction_type     AS ENUM ('like', 'fire', 'summit');

-- ─── Tables ──────────────────────────────────────────────────────────────────

-- profiles — extends auth.users, populated by trigger on signup
CREATE TABLE profiles (
  id           uuid        PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  username     text        UNIQUE NOT NULL CHECK (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text        NOT NULL,
  bio          text,
  avatar_url   text,
  location     text,
  created_at   timestamptz DEFAULT now()
);

-- trails
CREATE TABLE trails (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug              text        UNIQUE NOT NULL,
  name              text        NOT NULL,
  description       text,
  difficulty        difficulty  NOT NULL,
  distance_mi       numeric(5,2) NOT NULL,
  elevation_gain_ft integer     NOT NULL DEFAULT 0,
  route_type        route_type  NOT NULL,
  trailhead_lat     numeric(9,6) NOT NULL,
  trailhead_lng     numeric(9,6) NOT NULL,
  geometry          jsonb,                 -- GeoJSON LineString; nullable for v1 user submissions
  tags              text[]      DEFAULT '{}',
  hero_photo_url    text,
  submitted_by      uuid        REFERENCES profiles ON DELETE SET NULL,
  is_verified       boolean     DEFAULT false,
  created_at        timestamptz DEFAULT now()
);

CREATE INDEX trails_slug_idx     ON trails(slug);
CREATE INDEX trails_location_idx ON trails(trailhead_lat, trailhead_lng);
CREATE INDEX trails_tags_idx     ON trails USING GIN(tags);

-- search vector (added in T-15 migration; stub index here for schema completeness)
ALTER TABLE trails
  ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(name,        '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B')
  ) STORED;

CREATE INDEX trails_search_idx ON trails USING GIN(search_vector);

-- hikes
CREATE TABLE hikes (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL REFERENCES profiles ON DELETE CASCADE,
  trail_id         uuid        NOT NULL REFERENCES trails  ON DELETE CASCADE,
  hiked_at         date        NOT NULL,
  duration_minutes integer,
  notes            text,
  conditions       text,
  visibility       text        NOT NULL DEFAULT 'friends'
                               CHECK (visibility IN ('public', 'friends', 'private')),
  created_at       timestamptz DEFAULT now()
);

CREATE INDEX hikes_user_idx  ON hikes(user_id,  hiked_at DESC);
CREATE INDEX hikes_trail_idx ON hikes(trail_id, hiked_at DESC);

-- hike_photos
CREATE TABLE hike_photos (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  hike_id      uuid        NOT NULL REFERENCES hikes ON DELETE CASCADE,
  storage_path text        NOT NULL,
  position     smallint    NOT NULL DEFAULT 0,
  width        integer,
  height       integer,
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX hike_photos_hike_idx ON hike_photos(hike_id, position);

-- trail_photos — community gallery, separate from hike logs
CREATE TABLE trail_photos (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  trail_id     uuid        NOT NULL REFERENCES trails   ON DELETE CASCADE,
  storage_path text        NOT NULL,
  is_hero      boolean     DEFAULT false,
  submitted_by uuid        REFERENCES profiles ON DELETE SET NULL,
  created_at   timestamptz DEFAULT now()
);

-- reviews — one per user per trail, enforced by UNIQUE constraint
CREATE TABLE reviews (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES profiles ON DELETE CASCADE,
  trail_id   uuid        NOT NULL REFERENCES trails   ON DELETE CASCADE,
  rating     smallint    NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text       text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, trail_id)
);

CREATE INDEX reviews_trail_idx ON reviews(trail_id);

-- friendships
CREATE TABLE friendships (
  id           uuid              PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid              NOT NULL REFERENCES profiles ON DELETE CASCADE,
  addressee_id uuid              NOT NULL REFERENCES profiles ON DELETE CASCADE,
  status       friendship_status NOT NULL DEFAULT 'pending',
  created_at   timestamptz       DEFAULT now(),
  accepted_at  timestamptz,
  UNIQUE (requester_id, addressee_id),
  CHECK (requester_id != addressee_id)
);

CREATE INDEX friendships_addressee_idx ON friendships(addressee_id, status);
CREATE INDEX friendships_requester_idx ON friendships(requester_id, status);

-- comments
CREATE TABLE comments (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  hike_id    uuid        NOT NULL REFERENCES hikes    ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES profiles ON DELETE CASCADE,
  text       text        NOT NULL CHECK (length(text) <= 500),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX comments_hike_idx ON comments(hike_id, created_at);

-- reactions — one per type per user per hike
CREATE TABLE reactions (
  id         uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  hike_id    uuid          NOT NULL REFERENCES hikes    ON DELETE CASCADE,
  user_id    uuid          NOT NULL REFERENCES profiles ON DELETE CASCADE,
  type       reaction_type NOT NULL,
  created_at timestamptz   DEFAULT now(),
  UNIQUE (hike_id, user_id, type)
);

-- ─── Helper functions ─────────────────────────────────────────────────────────

-- Are two users friends (accepted)?
CREATE OR REPLACE FUNCTION are_friends(a uuid, b uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM friendships
    WHERE  status = 'accepted'
      AND  (
             (requester_id = a AND addressee_id = b)
          OR (requester_id = b AND addressee_id = a)
           )
  );
$$;

-- Count trails submitted by a user (for the 3-trail cap)
CREATE OR REPLACE FUNCTION user_trail_count(uid uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COUNT(*)::integer FROM trails WHERE submitted_by = uid;
$$;

-- Count photos uploaded by a user across hikes and trail gallery (for the 50-photo cap)
CREATE OR REPLACE FUNCTION user_photo_count(uid uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT (
    (SELECT COUNT(*) FROM hike_photos hp
       JOIN hikes h ON hp.hike_id = h.id WHERE h.user_id = uid)
    +
    (SELECT COUNT(*) FROM trail_photos WHERE submitted_by = uid)
  )::integer;
$$;

-- ─── Profile creation trigger ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, username, display_name)
  VALUES (
    NEW.id,
    'user_' || substring(NEW.id::text, 1, 8),
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'New Hiker')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── Row Level Security ───────────────────────────────────────────────────────

ALTER TABLE profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE trails       ENABLE ROW LEVEL SECURITY;
ALTER TABLE hikes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE hike_photos  ENABLE ROW LEVEL SECURITY;
ALTER TABLE trail_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews      ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships  ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions    ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "profiles_select_public"
  ON profiles FOR SELECT USING (true);

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE USING (auth.uid() = id);
-- INSERT handled by handle_new_user trigger (no INSERT policy needed)

-- trails
CREATE POLICY "trails_select_public"
  ON trails FOR SELECT USING (true);

CREATE POLICY "trails_insert_auth"
  ON trails FOR INSERT
  WITH CHECK (auth.uid() = submitted_by AND user_trail_count(auth.uid()) < 3);

CREATE POLICY "trails_update_submitter_unverified"
  ON trails FOR UPDATE
  USING (auth.uid() = submitted_by AND is_verified = false);
-- No DELETE policy — manual via service role only

-- hikes
CREATE POLICY "hikes_select_visibility"
  ON hikes FOR SELECT USING (
    visibility = 'public'
    OR user_id  = auth.uid()
    OR (visibility = 'friends' AND are_friends(auth.uid(), user_id))
  );

CREATE POLICY "hikes_insert_own"
  ON hikes FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "hikes_update_own"
  ON hikes FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "hikes_delete_own"
  ON hikes FOR DELETE USING (auth.uid() = user_id);

-- hike_photos
CREATE POLICY "hike_photos_select_visibility"
  ON hike_photos FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM hikes h WHERE h.id = hike_photos.hike_id
        AND (
          h.visibility = 'public'
          OR h.user_id  = auth.uid()
          OR (h.visibility = 'friends' AND are_friends(auth.uid(), h.user_id))
        )
    )
  );

CREATE POLICY "hike_photos_insert_own"
  ON hike_photos FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM hikes WHERE id = hike_id AND user_id = auth.uid())
    AND user_photo_count(auth.uid()) < 50
  );

CREATE POLICY "hike_photos_delete_own"
  ON hike_photos FOR DELETE USING (
    EXISTS (SELECT 1 FROM hikes WHERE id = hike_id AND user_id = auth.uid())
  );

-- trail_photos
CREATE POLICY "trail_photos_select_public"
  ON trail_photos FOR SELECT USING (true);

CREATE POLICY "trail_photos_insert_auth"
  ON trail_photos FOR INSERT
  WITH CHECK (auth.uid() = submitted_by AND user_photo_count(auth.uid()) < 50);

-- reviews
CREATE POLICY "reviews_select_public"
  ON reviews FOR SELECT USING (true);

CREATE POLICY "reviews_insert_own"
  ON reviews FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "reviews_update_own"
  ON reviews FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "reviews_delete_own"
  ON reviews FOR DELETE USING (auth.uid() = user_id);

-- friendships
CREATE POLICY "friendships_select_own"
  ON friendships FOR SELECT USING (
    auth.uid() = requester_id OR auth.uid() = addressee_id
  );

CREATE POLICY "friendships_insert_requester"
  ON friendships FOR INSERT WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "friendships_update_addressee"
  ON friendships FOR UPDATE USING (auth.uid() = addressee_id);

CREATE POLICY "friendships_delete_either"
  ON friendships FOR DELETE USING (
    auth.uid() IN (requester_id, addressee_id)
  );

-- comments
CREATE POLICY "comments_select_visibility"
  ON comments FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM hikes h WHERE h.id = comments.hike_id
        AND (
          h.visibility = 'public'
          OR h.user_id  = auth.uid()
          OR (h.visibility = 'friends' AND are_friends(auth.uid(), h.user_id))
        )
    )
  );

CREATE POLICY "comments_insert_auth"
  ON comments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM hikes h WHERE h.id = hike_id
        AND (
          h.visibility = 'public'
          OR h.user_id  = auth.uid()
          OR (h.visibility = 'friends' AND are_friends(auth.uid(), h.user_id))
        )
    )
  );

CREATE POLICY "comments_delete_owner"
  ON comments FOR DELETE USING (
    auth.uid() = user_id
    OR auth.uid() IN (SELECT user_id FROM hikes WHERE id = hike_id)
  );

-- reactions
CREATE POLICY "reactions_select_visibility"
  ON reactions FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM hikes h WHERE h.id = reactions.hike_id
        AND (
          h.visibility = 'public'
          OR h.user_id  = auth.uid()
          OR (h.visibility = 'friends' AND are_friends(auth.uid(), h.user_id))
        )
    )
  );

CREATE POLICY "reactions_insert_auth"
  ON reactions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM hikes WHERE id = hike_id)
  );

CREATE POLICY "reactions_delete_own"
  ON reactions FOR DELETE USING (auth.uid() = user_id);
