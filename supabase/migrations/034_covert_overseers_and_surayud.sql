-- =============================================================================
-- ConED · Seed 5 covert_overseer (COV01–COV05)
-- COV01 = พลเอก สุรยุทธ์ จุลานนท์ · ประธานองคมนตรี
-- Provinces empty — assign later via Domain Control.
-- Password: login1234 · reports_to SO (…111104)
-- Widens role check first (auth.users trigger handle_new_user inserts role).
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Ensure covert_overseer (and current role set) is allowed before auth insert
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
    'volunteer',
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

CREATE TEMP TABLE _cov_users (
  id uuid PRIMARY KEY,
  login_id text NOT NULL,
  auth_email text NOT NULL,
  full_name text NOT NULL,
  name_prefix text,
  position text NOT NULL,
  role text NOT NULL,
  password text NOT NULL,
  assigned_provinces text[] NOT NULL DEFAULT '{}',
  reports_to uuid
);

INSERT INTO _cov_users (
  id, login_id, auth_email, full_name, name_prefix, position, role, password,
  assigned_provinces, reports_to
) VALUES
  (
    'a1111111-1111-4111-8111-111111111402',
    'COV01',
    'cov01@edu.local',
    'สุรยุทธ์ จุลานนท์',
    'พลเอก',
    'ประธานองคมนตรี',
    'covert_overseer',
    'login1234',
    '{}'::text[],
    'a1111111-1111-4111-8111-111111111104'
  ),
  (
    'a1111111-1111-4111-8111-111111111403',
    'COV02',
    'cov02@edu.local',
    'เกษม วัฒนชัย',
    'นาย',
    'องคมนตรี',
    'covert_overseer',
    'login1234',
    '{}'::text[],
    'a1111111-1111-4111-8111-111111111104'
  ),
  (
    'a1111111-1111-4111-8111-111111111404',
    'COV03',
    'cov03@edu.local',
    'พลากร สุวรรณรัฐ',
    'นาย',
    'องคมนตรี',
    'covert_overseer',
    'login1234',
    '{}'::text[],
    'a1111111-1111-4111-8111-111111111104'
  ),
  (
    'a1111111-1111-4111-8111-111111111405',
    'COV04',
    'cov04@edu.local',
    'จิรายุ อิศรางกูร ณ อยุธยา',
    'นาย',
    'องคมนตรี',
    'covert_overseer',
    'login1234',
    '{}'::text[],
    'a1111111-1111-4111-8111-111111111104'
  ),
  (
    'a1111111-1111-4111-8111-111111111406',
    'COV05',
    'cov05@edu.local',
    'เกษม จันทร์แก้ว',
    'นาย',
    'องคมนตรี',
    'covert_overseer',
    'login1234',
    '{}'::text[],
    'a1111111-1111-4111-8111-111111111104'
  );

INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
SELECT
  COALESCE(
    (SELECT id FROM auth.instances LIMIT 1),
    '00000000-0000-0000-0000-000000000000'::uuid
  ),
  u.id,
  'authenticated',
  'authenticated',
  u.auth_email,
  crypt(u.password, gen_salt('bf')),
  timezone('utc', now()),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object(
    'full_name', u.full_name,
    'name_prefix', u.name_prefix,
    'role', u.role,
    'login_id', u.login_id
  ),
  timezone('utc', now()),
  timezone('utc', now()),
  '', '', '', ''
FROM _cov_users u
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  encrypted_password = EXCLUDED.encrypted_password,
  email_confirmed_at = COALESCE(auth.users.email_confirmed_at, EXCLUDED.email_confirmed_at),
  raw_user_meta_data = EXCLUDED.raw_user_meta_data,
  updated_at = timezone('utc', now());

INSERT INTO auth.identities (
  id, user_id, identity_data, provider, provider_id,
  last_sign_in_at, created_at, updated_at
)
SELECT
  u.id, u.id,
  jsonb_build_object('sub', u.id::text, 'email', u.auth_email, 'email_verified', true),
  'email', u.auth_email,
  timezone('utc', now()), timezone('utc', now()), timezone('utc', now())
FROM _cov_users u
ON CONFLICT DO NOTHING;

INSERT INTO auth.identities (
  id, user_id, identity_data, provider, provider_id,
  last_sign_in_at, created_at, updated_at
)
SELECT
  gen_random_uuid(), u.id,
  jsonb_build_object('sub', u.id::text, 'email', u.auth_email, 'email_verified', true),
  'email', u.id::text,
  timezone('utc', now()), timezone('utc', now()), timezone('utc', now())
FROM _cov_users u
WHERE NOT EXISTS (
  SELECT 1 FROM auth.identities i WHERE i.user_id = u.id AND i.provider = 'email'
);

INSERT INTO public.user_profiles (
  id, email, full_name, position, role,
  assigned_zone, assigned_provinces, assigned_districts,
  reports_to, birthday, disabled, must_change_password, name_prefix
)
SELECT
  u.id, u.login_id, u.full_name, u.position, u.role,
  NULL, u.assigned_provinces, '{}'::text[],
  u.reports_to, NULL, false, false, u.name_prefix
FROM _cov_users u
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  position = EXCLUDED.position,
  role = EXCLUDED.role,
  assigned_provinces = EXCLUDED.assigned_provinces,
  assigned_districts = EXCLUDED.assigned_districts,
  reports_to = EXCLUDED.reports_to,
  name_prefix = EXCLUDED.name_prefix,
  disabled = false,
  must_change_password = false,
  updated_at = timezone('utc', now());

DROP TABLE _cov_users;
