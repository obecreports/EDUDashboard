-- =============================================================================
-- ConED · อุทัยธานี Type 2 under OS10
-- - Extend OS10T01 (สุนันทา แสงทอง) with อุทัยธานี
-- - Add OS10T14 ดิเรก ศรีสุวรรณ, OS10T15 วิเชียร จันทร
-- Login: OS10T14–OS10T15 · password: login1234
-- Requires: 014 (OS10), 019 (overseer_tier), 020 (OS10 Type 2)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Ensure OS10 still includes อุทัยธานี
UPDATE public.user_profiles
SET
  assigned_provinces = (
    SELECT ARRAY(
      SELECT DISTINCT p
      FROM unnest(
        COALESCE(assigned_provinces, '{}'::text[]) ||
        ARRAY['กาญจนบุรี', 'สุพรรณบุรี', 'อุทัยธานี', 'อุดรธานี']
      ) AS p
      ORDER BY p
    )
  ),
  overseer_tier = 'type1',
  updated_at = timezone('utc', now())
WHERE id = 'a1111111-1111-4111-8111-111111111210'::uuid
  AND role = 'overseer';

-- สุนันทา: add อุทัยธานี to existing provinces
UPDATE public.user_profiles
SET
  assigned_provinces = (
    SELECT ARRAY(
      SELECT DISTINCT p
      FROM unnest(
        COALESCE(assigned_provinces, '{}'::text[]) || ARRAY['อุทัยธานี']
      ) AS p
      ORDER BY p
    )
  ),
  updated_at = timezone('utc', now())
WHERE id = 'a1111111-1111-4111-8111-111111111301'::uuid;

CREATE TEMP TABLE _os10_uthai (
  id uuid PRIMARY KEY,
  login_id text NOT NULL,
  auth_email text NOT NULL,
  full_name text NOT NULL,
  name_prefix text,
  position text NOT NULL DEFAULT 'อาสาสมัคร',
  role text NOT NULL DEFAULT 'overseer',
  password text NOT NULL DEFAULT 'login1234',
  assigned_provinces text[] NOT NULL,
  reports_to uuid NOT NULL,
  overseer_tier text NOT NULL DEFAULT 'type2'
);

INSERT INTO _os10_uthai (
  id, login_id, auth_email, full_name, name_prefix, assigned_provinces, reports_to
) VALUES
  (
    'a1111111-1111-4111-8111-111111111314', 'OS10T14', 'os10t14@edu.local',
    'ดิเรก ศรีสุวรรณ', 'นาย',
    ARRAY['อุทัยธานี'],
    'a1111111-1111-4111-8111-111111111210'
  ),
  (
    'a1111111-1111-4111-8111-111111111315', 'OS10T15', 'os10t15@edu.local',
    'วิเชียร จันทร', 'นาย',
    ARRAY['อุทัยธานี'],
    'a1111111-1111-4111-8111-111111111210'
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
    'login_id', u.login_id,
    'overseer_tier', u.overseer_tier
  ),
  timezone('utc', now()),
  timezone('utc', now()),
  '', '', '', ''
FROM _os10_uthai u
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
FROM _os10_uthai u
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
FROM _os10_uthai u
WHERE NOT EXISTS (
  SELECT 1 FROM auth.identities i WHERE i.user_id = u.id AND i.provider = 'email'
);

INSERT INTO public.user_profiles (
  id, email, full_name, position, role, overseer_tier,
  assigned_zone, assigned_provinces, assigned_districts,
  reports_to, birthday, disabled, must_change_password, name_prefix
)
SELECT
  u.id, u.login_id, u.full_name, u.position, u.role, u.overseer_tier,
  NULL, u.assigned_provinces, '{}'::text[],
  u.reports_to, NULL, false, false, u.name_prefix
FROM _os10_uthai u
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  position = EXCLUDED.position,
  role = EXCLUDED.role,
  overseer_tier = EXCLUDED.overseer_tier,
  assigned_provinces = EXCLUDED.assigned_provinces,
  assigned_districts = EXCLUDED.assigned_districts,
  reports_to = EXCLUDED.reports_to,
  name_prefix = EXCLUDED.name_prefix,
  disabled = false,
  must_change_password = false,
  updated_at = timezone('utc', now());

DROP TABLE _os10_uthai;
