-- =============================================================================
-- ConED · Split volunteer roles + director school scope
-- - volunteer → volunteer_border (default migration)
-- - Add volunteer_center, special_volunteer, director
-- - Add assigned_schools text[] for director login scope
-- =============================================================================

DO $$
BEGIN
  ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- Migrate legacy single volunteer role → Border
UPDATE public.user_profiles
SET
  role = 'volunteer_border',
  position = CASE
    WHEN NULLIF(TRIM(position), '') IS NULL OR TRIM(position) = 'อาสาสมัคร'
      THEN 'อาสาสมัครประจำพื้นที่'
    ELSE position
  END
WHERE role = 'volunteer';

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS assigned_schools text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.user_profiles.assigned_schools IS
  'Director (school-admin login) scope — school_id strings. Empty for other roles.';

ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_role_check
  CHECK (role IN (
    'guest',
    'staff',
    'overseer',
    'volunteer_center',
    'volunteer_border',
    'special_volunteer',
    'director',
    'super_overseer',
    'admin',
    'super_admin',
    'global'
  ));

COMMENT ON COLUMN public.user_profiles.role IS
  'RBAC role: guest|staff|overseer|volunteer_center|volunteer_border|special_volunteer|director|super_overseer|admin|super_admin';
