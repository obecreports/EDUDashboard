-- =============================================================================
-- ConED · VL / field profile bio fields on user_profiles
-- Avatar already exists (avatar_url). Safe to re-run.
-- =============================================================================

ALTER TABLE IF EXISTS public.user_profiles
  ADD COLUMN IF NOT EXISTS contact_address text;

ALTER TABLE IF EXISTS public.user_profiles
  ADD COLUMN IF NOT EXISTS contact_tel text;

ALTER TABLE IF EXISTS public.user_profiles
  ADD COLUMN IF NOT EXISTS contact_email text;

ALTER TABLE IF EXISTS public.user_profiles
  ADD COLUMN IF NOT EXISTS duty text;

ALTER TABLE IF EXISTS public.user_profiles
  ADD COLUMN IF NOT EXISTS last_position_title text;

ALTER TABLE IF EXISTS public.user_profiles
  ADD COLUMN IF NOT EXISTS last_position_year text;

ALTER TABLE IF EXISTS public.user_profiles
  ADD COLUMN IF NOT EXISTS last_position_affiliation text;

ALTER TABLE IF EXISTS public.user_profiles
  ADD COLUMN IF NOT EXISTS max_education text;

COMMENT ON COLUMN public.user_profiles.duty IS 'VL duty / หน้าที่';
COMMENT ON COLUMN public.user_profiles.last_position_title IS 'Last position before retire — title';
COMMENT ON COLUMN public.user_profiles.last_position_year IS 'Last position before retire — year';
COMMENT ON COLUMN public.user_profiles.last_position_affiliation IS 'Last position before retire — affiliation';
COMMENT ON COLUMN public.user_profiles.max_education IS 'Highest education level';
