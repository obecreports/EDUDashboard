-- =============================================================================
-- ConED · 14 องคมนตรี (OS01–OS14) + widen role for อาสาสมัคร (volunteer)
-- Login IDs are short (OS01), stored in user_profiles.email.
-- auth.users.email uses os01@edu.local for GoTrue compatibility.
-- Password: login1234
-- Fixed UUIDs match lib/auth/mock-users.ts (UAT_USER_IDS.os01–os14).
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Allow volunteer (อาสาสมัคร) alongside overseer (องคมนตรี)
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

CREATE TEMP TABLE _os_users (
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

INSERT INTO _os_users (
  id, login_id, auth_email, full_name, name_prefix, position, role, password,
  assigned_provinces, reports_to
) VALUES
  ('a1111111-1111-4111-8111-111111111201', 'OS01', 'os01@edu.local', 'อรรถนิติ ดิษฐอำนาจ', 'นาย', 'องคมนตรี', 'overseer', 'login1234', ARRAY['ฉะเชิงเทรา', 'สระแก้ว'], 'a1111111-1111-4111-8111-111111111104'),
  ('a1111111-1111-4111-8111-111111111202', 'OS02', 'os02@edu.local', 'จอม รุ่งสว่าง', 'พลอากาศเอก', 'องคมนตรี', 'overseer', 'login1234', ARRAY['บุรีรัมย์', 'ศรีสะเกษ', 'สุรินทร์'], 'a1111111-1111-4111-8111-111111111104'),
  ('a1111111-1111-4111-8111-111111111203', 'OS03', 'os03@edu.local', 'นุรักษ์ มาประณีต', 'นาย', 'องคมนตรี', 'overseer', 'login1234', ARRAY['เชียงใหม่', 'เชียงราย', 'แม่ฮ่องสอน'], 'a1111111-1111-4111-8111-111111111104'),
  ('a1111111-1111-4111-8111-111111111204', 'OS04', 'os04@edu.local', 'บัณฑิตย์ มลายอริศูนย์', 'พลเอก', 'องคมนตรี', 'overseer', 'login1234', ARRAY['ลพบุรี'], 'a1111111-1111-4111-8111-111111111104'),
  ('a1111111-1111-4111-8111-111111111205', 'OS05', 'os05@edu.local', 'เศรษฐพุฒิ สุทธิวาทนฤพุฒิ', 'นาย', 'องคมนตรี', 'overseer', 'login1234', ARRAY['มุกดาหาร', 'สกลนคร'], 'a1111111-1111-4111-8111-111111111104'),
  ('a1111111-1111-4111-8111-111111111206', 'OS06', 'os06@edu.local', 'ปนัดดา ดิศกุล', 'หม่อมหลวง', 'องคมนตรี', 'overseer', 'login1234', ARRAY['ราชบุรี', 'อุบลราชธานี'], 'a1111111-1111-4111-8111-111111111104'),
  ('a1111111-1111-4111-8111-111111111207', 'OS07', 'os07@edu.local', 'ชลิต พุกผาสุข', 'พลอากาศเอก', 'องคมนตรี', 'overseer', 'login1234', ARRAY['เพชรบุรี', 'ประจวบคีรีขันธ์'], 'a1111111-1111-4111-8111-111111111104'),
  ('a1111111-1111-4111-8111-111111111208', 'OS08', 'os08@edu.local', 'ประยุทธ์ จันทร์โอชา', 'พลเอก', 'องคมนตรี', 'overseer', 'login1234', ARRAY['แพร่', 'น่าน', 'พะเยา'], 'a1111111-1111-4111-8111-111111111104'),
  ('a1111111-1111-4111-8111-111111111209', 'OS09', 'os09@edu.local', 'ดาว์พงษ์ รัตนสุวรรณ', 'พลเอก', 'องคมนตรี', 'overseer', 'login1234', ARRAY['พระนครศรีอยุธยา'], 'a1111111-1111-4111-8111-111111111104'),
  ('a1111111-1111-4111-8111-111111111210', 'OS10', 'os10@edu.local', 'ไพบูลย์ คุ้มฉายา', 'พลเอก', 'องคมนตรี', 'overseer', 'login1234', ARRAY['กาญจนบุรี', 'สุพรรณบุรี', 'อุทัยธานี'], 'a1111111-1111-4111-8111-111111111104'),
  ('a1111111-1111-4111-8111-111111111211', 'OS11', 'os11@edu.local', 'กัมปนาท รุดดิษฐ์', 'พลเอก', 'องคมนตรี', 'overseer', 'login1234', ARRAY['กำแพงเพชร', 'พิษณุโลก'], 'a1111111-1111-4111-8111-111111111104'),
  ('a1111111-1111-4111-8111-111111111212', 'OS12', 'os12@edu.local', 'พงษ์เทพ หนูเทพ', 'พลเรือเอก', 'องคมนตรี', 'overseer', 'login1234', ARRAY['ตาก', 'สุโขทัย', 'อุตรดิตถ์'], 'a1111111-1111-4111-8111-111111111104'),
  ('a1111111-1111-4111-8111-111111111213', 'OS13', 'os13@edu.local', 'อำพน กิตติอำพน', 'นาย', 'องคมนตรี', 'overseer', 'login1234', ARRAY['หนองบัวลำภู', 'อุดรธานี'], 'a1111111-1111-4111-8111-111111111104'),
  ('a1111111-1111-4111-8111-111111111214', 'OS14', 'os14@edu.local', 'เฉลิมชัย สิทธิสาท', 'พลเอก', 'องคมนตรี', 'overseer', 'login1234', ARRAY['นราธิวาส', 'ปัตตานี', 'ยะลา', 'สงขลา'], 'a1111111-1111-4111-8111-111111111104');

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
FROM _os_users u
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
FROM _os_users u
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
FROM _os_users u
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
FROM _os_users u
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

DROP TABLE _os_users;
