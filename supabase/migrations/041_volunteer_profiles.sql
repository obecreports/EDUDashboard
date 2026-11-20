-- =============================================================================
-- ConED · volunteer_profiles (VL bio) + drop VL columns from user_profiles
-- Safe to re-run.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.volunteer_profiles (
  user_id uuid PRIMARY KEY REFERENCES public.user_profiles (id) ON DELETE CASCADE,
  contact_address text,
  contact_tel text,
  contact_email text,
  duty text,
  last_position_title text,
  last_position_year text,
  last_position_affiliation text,
  education_bachelor text,
  education_master text,
  birth_date date,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

DROP TRIGGER IF EXISTS trg_volunteer_profiles_updated ON public.volunteer_profiles;
CREATE TRIGGER trg_volunteer_profiles_updated
  BEFORE UPDATE ON public.volunteer_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.volunteer_profiles DISABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.volunteer_profiles TO anon, authenticated;

COMMENT ON TABLE public.volunteer_profiles IS
  'VL / volunteer bio detail linked 1:1 to user_profiles.id';

-- Drop VL bio columns from user_profiles (migration 037)
ALTER TABLE IF EXISTS public.user_profiles DROP COLUMN IF EXISTS contact_address;
ALTER TABLE IF EXISTS public.user_profiles DROP COLUMN IF EXISTS contact_tel;
ALTER TABLE IF EXISTS public.user_profiles DROP COLUMN IF EXISTS contact_email;
ALTER TABLE IF EXISTS public.user_profiles DROP COLUMN IF EXISTS duty;
ALTER TABLE IF EXISTS public.user_profiles DROP COLUMN IF EXISTS last_position_title;
ALTER TABLE IF EXISTS public.user_profiles DROP COLUMN IF EXISTS last_position_year;
ALTER TABLE IF EXISTS public.user_profiles DROP COLUMN IF EXISTS last_position_affiliation;
ALTER TABLE IF EXISTS public.user_profiles DROP COLUMN IF EXISTS max_education;
