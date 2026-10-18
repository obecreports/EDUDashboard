-- =============================================================================
-- ConED · Overseer Type 2 under OS10 (องคมนตรี ไพบูลย์ คุ้มฉายา)
-- Provinces: กาญจนบุรี · สุพรรณบุรี · อุดรธานี
-- Login: OS10T01–OS10T13 · password: login1234
-- Requires: 014 (OS10), 019 (overseer_tier)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- OS10 must include อุดรธานี so Type 2 province subsets validate
UPDATE public.user_profiles
SET
  assigned_provinces = ARRAY['กาญจนบุรี', 'สุพรรณบุรี', 'อุทัยธานี', 'อุดรธานี'],
  overseer_tier = 'type1',
  updated_at = timezone('utc', now())
WHERE id = 'a1111111-1111-4111-8111-111111111210'::uuid
  AND role = 'overseer';

CREATE TEMP TABLE _os10_t2 (
  id uuid PRIMARY KEY,
  login_id text NOT NULL,
  auth_email text NOT NULL,
  full_name text NOT NULL,
  name_prefix text,
  position text NOT NULL DEFAULT 'องคมนตรี',
  role text NOT NULL DEFAULT 'overseer',
  password text NOT NULL DEFAULT 'login1234',
  assigned_provinces text[] NOT NULL,
  reports_to uuid NOT NULL,
  overseer_tier text NOT NULL DEFAULT 'type2'
);

-- Deduped people (union of provinces where each name appears)
INSERT INTO _os10_t2 (
  id, login_id, auth_email, full_name, name_prefix, assigned_provinces, reports_to
) VALUES
  -- กาญจนบุรี + สุพรรณบุรี + อุดรธานี
  (
    'a1111111-1111-4111-8111-111111111301', 'OS10T01', 'os10t01@edu.local',
    'สุนันทา แสงทอง', 'นางสาว',
    ARRAY['กาญจนบุรี', 'สุพรรณบุรี', 'อุดรธานี'],
    'a1111111-1111-4111-8111-111111111210'
  ),
  -- กาญจนบุรี + สุพรรณบุรี
  (
    'a1111111-1111-4111-8111-111111111302', 'OS10T02', 'os10t02@edu.local',
    'วรรณดี นาคสุขปาน', 'นาง',
    ARRAY['กาญจนบุรี', 'สุพรรณบุรี'],
    'a1111111-1111-4111-8111-111111111210'
  ),
  -- กาญจนบุรี only
  (
    'a1111111-1111-4111-8111-111111111303', 'OS10T03', 'os10t03@edu.local',
    'อนันต์ กัลปะ', 'นาย',
    ARRAY['กาญจนบุรี'],
    'a1111111-1111-4111-8111-111111111210'
  ),
  (
    'a1111111-1111-4111-8111-111111111304', 'OS10T04', 'os10t04@edu.local',
    'เสวก สังขจันทร์', 'นาย',
    ARRAY['กาญจนบุรี'],
    'a1111111-1111-4111-8111-111111111210'
  ),
  (
    'a1111111-1111-4111-8111-111111111305', 'OS10T05', 'os10t05@edu.local',
    'วิบูลย์ ชมละม้าย', 'นาย',
    ARRAY['กาญจนบุรี'],
    'a1111111-1111-4111-8111-111111111210'
  ),
  (
    'a1111111-1111-4111-8111-111111111306', 'OS10T06', 'os10t06@edu.local',
    'อาลัย พรหมชนะ', 'นาง',
    ARRAY['กาญจนบุรี'],
    'a1111111-1111-4111-8111-111111111210'
  ),
  (
    'a1111111-1111-4111-8111-111111111307', 'OS10T07', 'os10t07@edu.local',
    'สรศักดิ์ ไสยะหุต', 'นาย',
    ARRAY['กาญจนบุรี'],
    'a1111111-1111-4111-8111-111111111210'
  ),
  (
    'a1111111-1111-4111-8111-111111111308', 'OS10T08', 'os10t08@edu.local',
    'โดม แผนสมบูรณ์', 'นาย',
    ARRAY['กาญจนบุรี'],
    'a1111111-1111-4111-8111-111111111210'
  ),
  (
    'a1111111-1111-4111-8111-111111111309', 'OS10T09', 'os10t09@edu.local',
    'ประยุทธ นิลวงศ์', 'นาย',
    ARRAY['กาญจนบุรี'],
    'a1111111-1111-4111-8111-111111111210'
  ),
  (
    'a1111111-1111-4111-8111-111111111310', 'OS10T10', 'os10t10@edu.local',
    'อำนาจ ทัดสวน', 'นาย',
    ARRAY['กาญจนบุรี'],
    'a1111111-1111-4111-8111-111111111210'
  ),
  -- สุพรรณบุรี only
  (
    'a1111111-1111-4111-8111-111111111311', 'OS10T11', 'os10t11@edu.local',
    'จิราพร เอี่ยมระหงษ์', 'นางสาว',
    ARRAY['สุพรรณบุรี'],
    'a1111111-1111-4111-8111-111111111210'
  ),
  (
    'a1111111-1111-4111-8111-111111111312', 'OS10T12', 'os10t12@edu.local',
    'บุญรอด พลเสน', 'นาย',
    ARRAY['สุพรรณบุรี'],
    'a1111111-1111-4111-8111-111111111210'
  ),
  -- อุดรธานี only
  (
    'a1111111-1111-4111-8111-111111111313', 'OS10T13', 'os10t13@edu.local',
    'ชาติชาย ม่วงปฐม', 'นาย',
    ARRAY['อุดรธานี'],
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
FROM _os10_t2 u
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
FROM _os10_t2 u
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
FROM _os10_t2 u
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
FROM _os10_t2 u
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

DROP TABLE _os10_t2;
