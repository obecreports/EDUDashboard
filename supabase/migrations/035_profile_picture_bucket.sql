-- =============================================================================
-- ConED · Storage bucket profile-picture (OS / person avatars)
-- Same public read/write pattern as school-covers (migration 010).
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-picture',
  'profile-picture',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "profile_picture_public_read" ON storage.objects;
CREATE POLICY "profile_picture_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-picture');

DROP POLICY IF EXISTS "profile_picture_public_write" ON storage.objects;
CREATE POLICY "profile_picture_public_write"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'profile-picture');

DROP POLICY IF EXISTS "profile_picture_public_update" ON storage.objects;
CREATE POLICY "profile_picture_public_update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'profile-picture')
  WITH CHECK (bucket_id = 'profile-picture');

DROP POLICY IF EXISTS "profile_picture_public_delete" ON storage.objects;
CREATE POLICY "profile_picture_public_delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'profile-picture');
