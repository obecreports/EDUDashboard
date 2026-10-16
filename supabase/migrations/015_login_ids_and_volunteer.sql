-- =============================================================================
-- ConED · Short login IDs + password login1234 + AS01 as volunteer
-- Updates legacy UAT accounts from 007/012 to match lib/auth/mock-users.ts
-- Run after 014_overseer_os_accounts.sql
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Ensure volunteer role is allowed (idempotent with 014)
DO $$
BEGIN
  ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_role_check
  CHECK (role IN (
    'guest', 'staff', 'overseer', 'volunteer', 'super_overseer',
    'admin', 'super_admin', 'global'
  ));

CREATE TEMP TABLE _login_remap (
  id uuid PRIMARY KEY,
  login_id text NOT NULL,
  auth_email text NOT NULL,
  full_name text NOT NULL,
  name_prefix text,
  position text NOT NULL,
  role text NOT NULL,
  password text NOT NULL DEFAULT 'login1234',
  reports_to uuid,
  assigned_provinces text[] DEFAULT '{}'
);

INSERT INTO _login_remap (
  id, login_id, auth_email, full_name, name_prefix, position, role,
  reports_to, assigned_provinces
) VALUES
  ('a1111111-1111-4111-8111-111111111101', 'staff01', 'staff01@edu.local', 'สมชาย ใจดี', NULL, 'ศึกษานิเทศก์', 'staff', 'a1111111-1111-4111-8111-111111111103', '{}'),
  ('a1111111-1111-4111-8111-111111111102', 'staff02', 'staff02@edu.local', 'มานี รักงาน', NULL, 'ศึกษานิเทศก์', 'staff', 'a1111111-1111-4111-8111-111111111103', '{}'),
  ('a1111111-1111-4111-8111-111111111103', 'AS01', 'as01@edu.local', 'วิภาดา ศรีสุข', NULL, 'อาสาสมัคร', 'volunteer', 'a1111111-1111-4111-8111-111111111210', ARRAY['กาญจนบุรี']),
  ('a1111111-1111-4111-8111-111111111104', 'sirdawpong', 'sirdawpong@edu.local', 'ดาว์พงษ์ รัตนสุวรรณ', 'พลเอก', 'ผู้กำกับดูแลสูงสุด', 'super_overseer', NULL, '{}'),
  ('a1111111-1111-4111-8111-111111111107', 'sirthanu', 'sirthanu@edu.local', 'ธนุ วงษ์จินดา', 'ดร.', 'ผู้กำกับดูแลสูงสุด', 'super_overseer', NULL, '{}'),
  ('a1111111-1111-4111-8111-111111111105', 'admin', 'admin@edu.local', 'อรรถพล ระบบดี', NULL, 'ผู้ดูแลระบบ', 'admin', NULL, '{}'),
  ('a1111111-1111-4111-8111-111111111106', 'superadmin', 'superadmin@edu.local', 'สุดา ควบคุมทั้งหมด', NULL, 'ผู้ดูแลระบบสูงสุด', 'super_admin', NULL, '{}');

UPDATE auth.users au
SET
  email = r.auth_email,
  encrypted_password = crypt(r.password, gen_salt('bf')),
  raw_user_meta_data = coalesce(au.raw_user_meta_data, '{}'::jsonb)
    || jsonb_build_object(
      'full_name', r.full_name,
      'name_prefix', r.name_prefix,
      'role', r.role,
      'login_id', r.login_id
    ),
  updated_at = timezone('utc', now())
FROM _login_remap r
WHERE au.id = r.id;

UPDATE public.user_profiles up
SET
  email = r.login_id,
  full_name = r.full_name,
  name_prefix = r.name_prefix,
  position = r.position,
  role = r.role,
  reports_to = r.reports_to,
  assigned_provinces = CASE
    WHEN cardinality(r.assigned_provinces) > 0 THEN r.assigned_provinces
    ELSE up.assigned_provinces
  END,
  must_change_password = false,
  updated_at = timezone('utc', now())
FROM _login_remap r
WHERE up.id = r.id;

-- Sync OS auth passwords to login1234 if 014 already ran with Overseer123!
UPDATE auth.users
SET
  encrypted_password = crypt('login1234', gen_salt('bf')),
  updated_at = timezone('utc', now())
WHERE id IN (
  'a1111111-1111-4111-8111-111111111201',
  'a1111111-1111-4111-8111-111111111202',
  'a1111111-1111-4111-8111-111111111203',
  'a1111111-1111-4111-8111-111111111204',
  'a1111111-1111-4111-8111-111111111205',
  'a1111111-1111-4111-8111-111111111206',
  'a1111111-1111-4111-8111-111111111207',
  'a1111111-1111-4111-8111-111111111208',
  'a1111111-1111-4111-8111-111111111209',
  'a1111111-1111-4111-8111-111111111210',
  'a1111111-1111-4111-8111-111111111211',
  'a1111111-1111-4111-8111-111111111212',
  'a1111111-1111-4111-8111-111111111213',
  'a1111111-1111-4111-8111-111111111214'
);

-- Normalize OS rows to short login IDs + องคมนตรี
UPDATE public.user_profiles SET email = 'OS01', position = 'องคมนตรี', role = 'overseer', must_change_password = false WHERE id = 'a1111111-1111-4111-8111-111111111201';
UPDATE public.user_profiles SET email = 'OS02', position = 'องคมนตรี', role = 'overseer', must_change_password = false WHERE id = 'a1111111-1111-4111-8111-111111111202';
UPDATE public.user_profiles SET email = 'OS03', position = 'องคมนตรี', role = 'overseer', must_change_password = false WHERE id = 'a1111111-1111-4111-8111-111111111203';
UPDATE public.user_profiles SET email = 'OS04', position = 'องคมนตรี', role = 'overseer', must_change_password = false WHERE id = 'a1111111-1111-4111-8111-111111111204';
UPDATE public.user_profiles SET email = 'OS05', position = 'องคมนตรี', role = 'overseer', must_change_password = false WHERE id = 'a1111111-1111-4111-8111-111111111205';
UPDATE public.user_profiles SET email = 'OS06', position = 'องคมนตรี', role = 'overseer', must_change_password = false WHERE id = 'a1111111-1111-4111-8111-111111111206';
UPDATE public.user_profiles SET email = 'OS07', position = 'องคมนตรี', role = 'overseer', must_change_password = false WHERE id = 'a1111111-1111-4111-8111-111111111207';
UPDATE public.user_profiles SET email = 'OS08', position = 'องคมนตรี', role = 'overseer', must_change_password = false WHERE id = 'a1111111-1111-4111-8111-111111111208';
UPDATE public.user_profiles SET email = 'OS09', position = 'องคมนตรี', role = 'overseer', must_change_password = false WHERE id = 'a1111111-1111-4111-8111-111111111209';
UPDATE public.user_profiles SET email = 'OS10', position = 'องคมนตรี', role = 'overseer', must_change_password = false WHERE id = 'a1111111-1111-4111-8111-111111111210';
UPDATE public.user_profiles SET email = 'OS11', position = 'องคมนตรี', role = 'overseer', must_change_password = false WHERE id = 'a1111111-1111-4111-8111-111111111211';
UPDATE public.user_profiles SET email = 'OS12', position = 'องคมนตรี', role = 'overseer', must_change_password = false WHERE id = 'a1111111-1111-4111-8111-111111111212';
UPDATE public.user_profiles SET email = 'OS13', position = 'องคมนตรี', role = 'overseer', must_change_password = false WHERE id = 'a1111111-1111-4111-8111-111111111213';
UPDATE public.user_profiles SET email = 'OS14', position = 'องคมนตรี', role = 'overseer', must_change_password = false WHERE id = 'a1111111-1111-4111-8111-111111111214';

DROP TABLE _login_remap;
