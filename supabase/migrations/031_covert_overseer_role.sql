-- =============================================================================
-- ConED · Add covert_overseer role (องคมนตรี ปกปิด)
-- =============================================================================

DO $$
BEGIN
  ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_role_check
  CHECK (role IN (
    'guest',
    'staff',
    'overseer',
    'volunteer_center',
    'volunteer_border',
    'special_volunteer',
    'covert_overseer',
    'director',
    'super_overseer',
    'admin',
    'super_admin',
    'global'
  ));

COMMENT ON COLUMN public.user_profiles.role IS
  'RBAC role incl. covert_overseer (display องคมนตรี; hidden from SO/OS activity dashboard)';
