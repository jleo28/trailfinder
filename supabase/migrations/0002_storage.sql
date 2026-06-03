-- ─────────────────────────────────────────────────────────────────────────────
-- Storage buckets + RLS
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars',      'avatars',      true,  5242880, ARRAY['image/jpeg','image/png','image/webp','image/gif']),
  ('trail-photos', 'trail-photos', true,  5242880, ARRAY['image/jpeg','image/png','image/webp']),
  ('hike-photos',  'hike-photos',  false, 5242880, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

-- avatars: public read, owner-only write (path = {uid}.webp)
CREATE POLICY "avatars_select"
  ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "avatars_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND name = auth.uid()::text || '.webp');

CREATE POLICY "avatars_update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND name = auth.uid()::text || '.webp');

CREATE POLICY "avatars_delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars' AND name = auth.uid()::text || '.webp');

-- trail-photos: public read, any authenticated user can upload
CREATE POLICY "trail_photos_select"
  ON storage.objects FOR SELECT USING (bucket_id = 'trail-photos');

CREATE POLICY "trail_photos_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'trail-photos' AND auth.role() = 'authenticated');

-- hike-photos: private (access via signed URLs), owner uploads into own folder
CREATE POLICY "hike_photos_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'hike-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "hike_photos_select"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'hike-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "hike_photos_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'hike-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
