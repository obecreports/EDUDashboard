-- =============================================================================
-- ConED · UAT seed users in auth.users + user_profiles
-- Fixed UUIDs match lib/auth/mock-users.ts (MOCK_USER_SEEDS).
-- Run in Supabase SQL Editor after 001–006.
-- Passwords (app login checks seeds; auth.users encrypted for future Auth use):
--   staff@coned.local        Staff123!
--   staff2@coned.local       Staff123!
--   overseer@coned.local     Overseer123!
--   super@coned.local        Super123!
--   admin@coned.local        Admin123!
--   superadmin@coned.local   SuperAdmin123!
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Stable UAT ids (must match app seeds)
-- staff          a1111111-1111-4111-8111-111111111101
-- staff2         a1111111-1111-4111-8111-111111111102
-- overseer       a1111111-1111-4111-8111-111111111103
-- super_overseer a1111111-1111-4111-8111-111111111104
-- admin          a1111111-1111-4111-8111-111111111105
-- super_admin    a1111111-1111-4111-8111-111111111106

CREATE TEMP TABLE _uat_users (
  id uuid PRIMARY KEY,
  email text NOT NULL,
  full_name text NOT NULL,
  position text NOT NULL,
  role text NOT NULL,
  password text NOT NULL,
  birthday date,
  assigned_provinces text[] NOT NULL DEFAULT '{}',
  reports_to uuid
);

INSERT INTO _uat_users (id, email, full_name, position, role, password, birthday, assigned_provinces, reports_to) VALUES
  ('a1111111-1111-4111-8111-111111111101', 'staff@coned.local',        'สมชาย ใจดี',       'เจ้าหน้าที่อำเภอ',     'staff',          'Staff123!',      '1990-10-10', '{}',            'a1111111-1111-4111-8111-111111111103'),
  ('a1111111-1111-4111-8111-111111111102', 'staff2@coned.local',       'มานี รักงาน',       'เจ้าหน้าที่อำเภอ',     'staff',          'Staff123!',      NULL,          '{}',            'a1111111-1111-4111-8111-111111111103'),
  ('a1111111-1111-4111-8111-111111111103', 'overseer@coned.local',     'วิภาดา ศรีสุข',     'ผู้กำกับดูแลจังหวัด', 'overseer',       'Overseer123!',   NULL,          ARRAY['กาญจนบุรี'], 'a1111111-1111-4111-8111-111111111104'),
  ('a1111111-1111-4111-8111-111111111104', 'super@coned.local',        'กิตติศักดิ์ ใหญ่ใหญ่', 'ผู้กำกับดูแลสูงสุด', 'super_overseer', 'Super123!',      NULL,          '{}',            NULL),
  ('a1111111-1111-4111-8111-111111111105', 'admin@coned.local',        'อรรถพล ระบบดี',     'ผู้ดูแลระบบ',         'admin',          'Admin123!',      NULL,          '{}',            NULL),
  ('a1111111-1111-4111-8111-111111111106', 'superadmin@coned.local',   'สุดา ควบคุมทั้งหมด', 'ผู้ดูแลระบบสูงสุด',   'super_admin',    'SuperAdmin123!', NULL,          '{}',            NULL);

-- auth.users
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
  u.id,
  'authenticated',
  'authenticated',
  u.email,
  crypt(u.password, gen_salt('bf')),
  timezone('utc', now()),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('full_name', u.full_name, 'role', u.role),
  timezone('utc', now()),
  timezone('utc', now()),
  '',
  '',
  '',
  ''
FROM _uat_users u
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  encrypted_password = EXCLUDED.encrypted_password,
  email_confirmed_at = COALESCE(auth.users.email_confirmed_at, EXCLUDED.email_confirmed_at),
  raw_user_meta_data = EXCLUDED.raw_user_meta_data,
  updated_at = timezone('utc', now());

-- auth.identities (required for email login in newer GoTrue)
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
  u.id,
  u.id,
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  'email',
  u.email,
  timezone('utc', now()),
  timezone('utc', now()),
  timezone('utc', now())
FROM _uat_users u
ON CONFLICT DO NOTHING;

-- Fallback if unique is on (provider, provider_id)
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
  u.id,
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  'email',
  u.id::text,
  timezone('utc', now()),
  timezone('utc', now()),
  timezone('utc', now())
FROM _uat_users u
WHERE NOT EXISTS (
  SELECT 1 FROM auth.identities i WHERE i.user_id = u.id AND i.provider = 'email'
);

-- user_profiles (trigger may have inserted a stub — upsert full UAT row)
INSERT INTO public.user_profiles (
  id, email, full_name, position, role,
  assigned_zone, assigned_provinces, assigned_districts,
  reports_to, birthday, disabled, must_change_password, name_prefix
)
SELECT
  u.id,
  u.email,
  u.full_name,
  u.position,
  u.role,
  NULL,
  u.assigned_provinces,
  CASE
    WHEN u.role = 'staff' THEN COALESCE(
      (
        SELECT array_agg(DISTINCT x.area_id)
        FROM (
          SELECT TRIM(area_id::text) AS area_id
          FROM public."School_Basic"
          WHERE province_name ILIKE '%กาญจนบุรี%'
            AND area_id IS NOT NULL
            AND TRIM(area_id::text) <> ''
          LIMIT 12
        ) x
      ),
      '{}'::text[]
    )
    ELSE '{}'::text[]
  END,
  u.reports_to,
  u.birthday,
  false,
  false,
  NULL
FROM _uat_users u
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  position = EXCLUDED.position,
  role = EXCLUDED.role,
  assigned_provinces = EXCLUDED.assigned_provinces,
  assigned_districts = EXCLUDED.assigned_districts,
  reports_to = EXCLUDED.reports_to,
  birthday = EXCLUDED.birthday,
  disabled = false,
  must_change_password = false;

-- Anon/authenticated R/W for UAT (cookie auth has no auth.uid() — see also 008)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "uat_profiles_read_all" ON public.user_profiles;
CREATE POLICY "uat_profiles_read_all" ON public.user_profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "uat_profiles_write_all" ON public.user_profiles;
CREATE POLICY "uat_profiles_write_all" ON public.user_profiles
  FOR ALL USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.user_profiles TO anon, authenticated;

COMMENT ON TABLE public.user_profiles IS
  'ConED RBAC profile; UAT seeds use fixed UUIDs a1111111-…-101..106';

DROP TABLE _uat_users;
