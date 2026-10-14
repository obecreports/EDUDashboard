-- =============================================================================
-- Update super_overseer demo accounts to the two named principals.
-- Matches lib/auth/mock-users.ts (UAT_USER_IDS.super_overseer / super_overseer2).
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Rename existing super_overseer → องคมนตรี (ดาวพงษ์)
UPDATE public.user_profiles
SET
  email = 'dawpong@coned.local',
  full_name = 'องคมนตรี (ดาวพงษ์)',
  position = 'องคมนตรี',
  updated_at = timezone('utc', now())
WHERE id = 'a1111111-1111-4111-8111-111111111104';

UPDATE auth.users
SET
  email = 'dawpong@coned.local',
  encrypted_password = crypt('Super123!', gen_salt('bf')),
  raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
    || jsonb_build_object('full_name', 'องคมนตรี (ดาวพงษ์)', 'role', 'super_overseer'),
  updated_at = timezone('utc', now())
WHERE id = 'a1111111-1111-4111-8111-111111111104';

-- Second super_overseer: ดร.ธนุ วงษ์จินดา
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
SELECT
  COALESCE(
    (SELECT id FROM auth.instances LIMIT 1),
    '00000000-0000-0000-0000-000000000000'::uuid
  ),
  'a1111111-1111-4111-8111-111111111107'::uuid,
  'authenticated',
  'authenticated',
  'thanu@coned.local',
  crypt('Super123!', gen_salt('bf')),
  timezone('utc', now()),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('full_name', 'ดร.ธนุ วงษ์จินดา', 'role', 'super_overseer'),
  timezone('utc', now()),
  timezone('utc', now()),
  '',
  '',
  '',
  ''
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users WHERE id = 'a1111111-1111-4111-8111-111111111107'::uuid
);

INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  'a1111111-1111-4111-8111-111111111107'::uuid,
  jsonb_build_object(
    'sub', 'a1111111-1111-4111-8111-111111111107',
    'email', 'thanu@coned.local',
    'email_verified', true
  ),
  'email',
  'a1111111-1111-4111-8111-111111111107',
  timezone('utc', now()),
  timezone('utc', now()),
  timezone('utc', now())
WHERE NOT EXISTS (
  SELECT 1 FROM auth.identities
  WHERE user_id = 'a1111111-1111-4111-8111-111111111107'::uuid
    AND provider = 'email'
);

INSERT INTO public.user_profiles (
  id, email, full_name, position, role,
  assigned_zone, assigned_provinces, assigned_districts,
  reports_to, birthday, disabled, must_change_password, name_prefix
)
SELECT
  'a1111111-1111-4111-8111-111111111107'::uuid,
  'thanu@coned.local',
  'ดร.ธนุ วงษ์จินดา',
  'ผู้กำกับดูแลสูงสุด',
  'super_overseer',
  NULL,
  '{}'::text[],
  '{}'::text[],
  NULL,
  NULL,
  false,
  false,
  NULL
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_profiles WHERE id = 'a1111111-1111-4111-8111-111111111107'::uuid
);

-- Align staff / overseer display titles
UPDATE public.user_profiles
SET position = 'ศึกษานิเทศก์', updated_at = timezone('utc', now())
WHERE id IN (
  'a1111111-1111-4111-8111-111111111101',
  'a1111111-1111-4111-8111-111111111102'
);

UPDATE public.user_profiles
SET position = 'อาสาสมัคร/องคมนตรี', updated_at = timezone('utc', now())
WHERE id = 'a1111111-1111-4111-8111-111111111103';
