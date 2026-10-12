-- =============================================================================
-- ConED · School cover + report images (Supabase Storage)
-- Safe to re-run.
-- =============================================================================

-- School profile / cover URL on master table
ALTER TABLE public."School_Basic"
  ADD COLUMN IF NOT EXISTS cover_image_url text;

COMMENT ON COLUMN public."School_Basic".cover_image_url IS
  'Public Supabase Storage URL for school profile/cover photo';

-- UAT: allow anon/authenticated to update School_Basic (cover + admin school edit).
-- Without this, PostgREST UPDATE can return success with 0 rows (RLS silent fail).
GRANT SELECT, UPDATE ON TABLE public."School_Basic" TO anon, authenticated;

ALTER TABLE public."School_Basic" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "school_basic_select" ON public."School_Basic";
DROP POLICY IF EXISTS "school_basic_update" ON public."School_Basic";
-- If RLS is re-enabled later, keep a permissive update policy for UAT:
-- CREATE POLICY "school_basic_update" ON public."School_Basic"
--   FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- Report comment image URLs (cap enforced in app: max 20 per report submit)
ALTER TABLE public.school_staff_comments
  ADD COLUMN IF NOT EXISTS image_urls text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.school_staff_comments.image_urls IS
  'Compressed public Storage URLs attached to this report comment';

-- Storage buckets (public read; anon write for UAT cookie-auth flow)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'school-covers',
    'school-covers',
    true,
    2097152, -- 2 MB after client compress
    ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
  ),
  (
    'report-images',
    'report-images',
    true,
    1572864, -- 1.5 MB after client compress
    ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
  )
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Policies: public read + anon/authenticated write (matches UAT anon pattern)
DROP POLICY IF EXISTS "school_covers_public_read" ON storage.objects;
CREATE POLICY "school_covers_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'school-covers');

DROP POLICY IF EXISTS "school_covers_public_write" ON storage.objects;
CREATE POLICY "school_covers_public_write"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'school-covers');

DROP POLICY IF EXISTS "school_covers_public_update" ON storage.objects;
CREATE POLICY "school_covers_public_update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'school-covers')
  WITH CHECK (bucket_id = 'school-covers');

DROP POLICY IF EXISTS "school_covers_public_delete" ON storage.objects;
CREATE POLICY "school_covers_public_delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'school-covers');

DROP POLICY IF EXISTS "report_images_public_read" ON storage.objects;
CREATE POLICY "report_images_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'report-images');

DROP POLICY IF EXISTS "report_images_public_write" ON storage.objects;
CREATE POLICY "report_images_public_write"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'report-images');

DROP POLICY IF EXISTS "report_images_public_update" ON storage.objects;
CREATE POLICY "report_images_public_update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'report-images')
  WITH CHECK (bucket_id = 'report-images');

DROP POLICY IF EXISTS "report_images_public_delete" ON storage.objects;
CREATE POLICY "report_images_public_delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'report-images');
