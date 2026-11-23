-- =============================================================================
-- ConED · Batch create school_admin logins (1:1 School_Basic.school_id)
-- Login = 10-digit school_id · assigned_schools = [school_id]
-- full_name = 'ผู้จัดการโรงเรียน ' || school_name
-- Default password: password12345 · must_change_password = true
-- Idempotent: upsert by login_id (user_profiles.email)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TEMP TABLE _school_admin_map (
  school_id text PRIMARY KEY,
  school_name text NOT NULL
);

INSERT INTO _school_admin_map (school_id, school_name) VALUES
  ('1014310089', 'วัดทางหลวง (เทพราษฎร์รังสรรค์)'),
  ('1014310126', 'วัดจุฬามณี(ชุณหะจันทนประชาสรรค์)'),
  ('1014310298', 'มาลาอีสงเคราะห์'),
  ('1014310370', 'วัดหนองไม้ซุง'),
  ('1016490181', 'บ้านโกรกรกฟ้า'),
  ('1016490275', 'บ้านเขาขวาง'),
  ('1016490278', 'ชุมชนบ้านแก่งเสือเต้น'),
  ('1016490351', 'บ้านลำโป่งเพชร'),
  ('1024070250', 'บ้านทุ่งส่อหงษา'),
  ('1024070258', 'บ้านหนองใหญ่'),
  ('1024070297', 'บ้านหนองปลาซิว'),
  ('1024070318', 'สียัดพัฒนา'),
  ('1024070319', 'บ้านอ่างเสือดำ'),
  ('1027740067', 'บ้านเขาดิน'),
  ('1027740098', 'บ้านโคกไพล'),
  ('1027740107', 'เพชรรัตนราชสุดา'),
  ('1027740302', 'ซับม่วงวิทยา'),
  ('1027740314', 'วังไพรวิทยาคม'),
  ('1031260307', 'นิคมสร้างตนเอง 5'),
  ('1031260447', 'บ้านน้อยหนองหว้า'),
  ('1031260450', 'บ้านแท่นทัพไทย'),
  ('1031260783', 'บ้านลำนางรอง'),
  ('1032650536', 'สตรีวิทยาสมาคม'),
  ('1032650624', 'บ้านโจรก'),
  ('1032650666', 'บ้านโอทะลัน'),
  ('1032650694', 'บ้านอำปึล'),
  ('1032650698', 'บ้านหนองคันนา'),
  ('1033530271', 'บ้านจันลม'),
  ('1033530458', 'บ้านขุนหาญ'),
  ('1033530498', 'บ้านดอนข่า'),
  ('1034710142', 'บ้านกุ่ม'),
  ('1034710457', 'สมเด็จพระราชชนนี'),
  ('1034710519', 'บ้านค้อ'),
  ('1034710527', 'บ้านคำบาก'),
  ('1034710827', 'บ้านโนนหนองบัว'),
  ('1034710947', 'บ้านห้วยเดื่อ'),
  ('1039760197', 'บ้านหนองกุงแก้ว'),
  ('1039760212', 'บ้านนาดีค่ายสว่างวิทยา'),
  ('1039760225', 'บ้านกุดผึ้ง'),
  ('1039760292', 'บ้านดงบาก'),
  ('1039760295', 'บ้านวังมน'),
  ('1039760340', 'กุงแก้ววิทยาคาร'),
  ('1041680077', 'บ้านหมากตูมดอนยานาง'),
  ('1041680142', 'บ้านทองอินทร์สวนมอญ'),
  ('1041680215', 'บ้านท่าลี่'),
  ('1041680398', 'บ้านดอนกลอยดอนอุดม'),
  ('1041680432', 'บ้านหนองบ่อ'),
  ('1041680651', 'บ้านดอนบาก'),
  ('1047540126', 'นาจานกล้วยน้อย'),
  ('1047540305', 'บ้านโพนสวาง'),
  ('1047540324', 'บ้านบะนกทา'),
  ('1047540499', 'บ้านถ้ำเต่า'),
  ('1047540506', 'ชุมชนบ้านหนองปลิง'),
  ('1047540527', 'บ้านหนองบัวสิม'),
  ('1047540615', 'บ้านกกปลาซิวนาโด่'),
  ('1049730187', 'บ้านกกตูม'),
  ('1049730188', 'บ้านแก้งนาง'),
  ('1049730202', 'บ้านหนองคอง'),
  ('1050130065', 'บ้านขุนแปะ'),
  ('1050130290', 'บ้านโม่งหลวง'),
  ('1050130325', 'บ้านปางอุ๋ง'),
  ('1050130471', 'เจ้าพ่อหลวงอุปถัมภ์ ๙'),
  ('1050130927', 'บ้านห้วยตอง'),
  ('1050130955', 'ทาเหนือวิทยา'),
  ('1050131065', 'มัธยมกัลยาณิวัฒนาเฉลิมพระเกียรติ'),
  ('1053690151', 'บ้านห้วยคอม'),
  ('1053690290', 'บ้านบ่อเบี้ย'),
  ('1053690292', 'บ้านห้วยยาง'),
  ('1054390123', 'บ้านห้วยฮ่อม'),
  ('1054390160', 'บ้านแม่แรม'),
  ('1054390210', 'บ้านวังเลียง'),
  ('1054390317', 'สรอยเสรีวิทยา'),
  ('1055250146', 'ประกิตเวชศักดิ์'),
  ('1055250326', 'บ้านนายาง'),
  ('1055250431', 'บ้านหลวง'),
  ('1055250446', 'ทุ่งช้าง'),
  ('1055250453', 'ไตรเขตประชาสามัคคี รัชมังคลาภิเษก'),
  ('1056320132', 'บ้านสระ'),
  ('1056320198', 'บ้านสันติสุข'),
  ('1056320303', 'ปงรัชดาภิเษก'),
  ('1057120595', 'บ้านเทอดไทย'),
  ('1057120720', 'บ้านแซววิทยาคม'),
  ('1058420171', 'ศิษย์เก่าพยาบาลศิริราชบ้านดง'),
  ('1058420255', 'บ้านอมพาย'),
  ('1061700139', 'บ้านใหม่คลองอังวะ'),
  ('1061700142', 'บ้านอีมาดอีทราย'),
  ('1061700239', 'ห้วยขาแข้งวิทยาคม'),
  ('1061700256', 'บ้านสมอทอง'),
  ('1062040311', 'บ้านสุขสำราญ'),
  ('1062040417', 'บ้านหนองแดน'),
  ('1062040453', 'พิไกรวิทยา'),
  ('1063160158', 'บ้านสามหมื่น'),
  ('1063160160', 'บ้านน้ำหอม'),
  ('1063160181', 'บ้านแม่ตื่น'),
  ('1063160196', 'บ้านกล้อทอ'),
  ('1064620149', 'บ้านโซกม่วง'),
  ('1064620230', 'บ้านสันหีบ'),
  ('1065360081', 'บ้านน้ำจวง'),
  ('1065360082', 'บ้านร่มเกล้า'),
  ('1070480317', 'รุจิรพัฒน์'),
  ('1070480322', 'บ้านตะโกล่าง'),
  ('1070480339', 'บ้านโป่งกระทิงบน'),
  ('1071020078', 'บ้านไร่'),
  ('1071020084', 'สมาคมป่าไม้แห่งประเทศไทยอุทิศ'),
  ('1071020342', 'บ้านดงเสลา'),
  ('1071020345', 'วัดถ้ำองจุ'),
  ('1071020347', 'บ้านโป่งหวาย'),
  ('1071020368', 'บ้านกองม่องทะ'),
  ('1071020370', 'บ้านหินตั้ง'),
  ('1071020413', 'บ้านห้วยหวาย'),
  ('1071020417', 'บ้านหนองสาหร่าย'),
  ('1071020457', 'ศรีสวัสดิ์พิทยาคม'),
  ('1071020478', 'หนองปรือพิทยาคม'),
  ('1072630110', 'บ้านพุน้ำร้อน'),
  ('1072630123', 'บ้านละว้าวังควาย'),
  ('1072630126', 'บ้านห้วยหินดำ'),
  ('1072630127', 'บ้านกล้วย'),
  ('1072630130', 'วัดคอกช้าง'),
  ('1076370075', 'บ้านดอนขุนห้วย'),
  ('1076370078', 'บ้านหุบกะพง'),
  ('1076370092', 'บ้านหนองเขื่อน'),
  ('1076370207', 'บ้านท่าตะคร้อมิตรภาพที่ 192 (อนุสรณ์แด่พลเอกกฤษณ์'),
  ('1076370211', 'บ้านพุพลู'),
  ('1076370227', 'บ้านแม่คะเมย'),
  ('1076370233', 'บ้านหนองปืนแตก'),
  ('1076370237', 'บ้านด่านโง'),
  ('1076370238', 'บ้านป่าเด็ง'),
  ('1076370258', 'ห้วยทรายประชาสรรค์'),
  ('1076370270', 'ป่าเด็งวิทยา'),
  ('1077280178', 'อานันท์'),
  ('1077280181', 'บ้านห้วยไคร้'),
  ('1077280183', 'วไลย'),
  ('1090550187', 'บ้านป่าโอน'),
  ('1090550197', 'บ้านกระอาน'),
  ('1090550250', 'บ้านคูนายสังข์'),
  ('1094300289', 'บ้านตะโละไกรทอง'),
  ('1094300322', 'บ้านวังกว้าง'),
  ('1095440009', 'คุรุชนพัฒนา'),
  ('1095440199', 'บ้านบาละ'),
  ('1096240155', 'บ้านสาเมาะ'),
  ('1096240229', 'บ้านบูเกะตา'),
  ('1096240242', 'บ้านมูโนะ'),
  ('1096240311', 'นิคมพัฒนา10');

-- Warn if school_id missing from School_Basic — still create accounts
DO $$
DECLARE
  missing text;
BEGIN
  SELECT string_agg(m.school_id, ', ' ORDER BY m.school_id)
  INTO missing
  FROM _school_admin_map m
  LEFT JOIN public."School_Basic" s ON s.school_id::text = m.school_id
  WHERE s.school_id IS NULL;

  IF missing IS NOT NULL THEN
    RAISE NOTICE 'School admin map school_id not found in School_Basic: %', missing;
  END IF;
END $$;

-- Reject if another school_admin already owns the school under a different login
DO $$
DECLARE
  clash text;
BEGIN
  SELECT string_agg(
    format('%s→%s (existing %s)', m.school_id, m.school_id, p.email),
    ', '
  )
  INTO clash
  FROM _school_admin_map m
  JOIN public.user_profiles p
    ON p.role IN ('school_admin', 'director')
   AND (
     m.school_id = ANY (p.assigned_schools)
     OR lower(p.email) = lower(m.school_id)
   )
   AND lower(p.email) <> lower(m.school_id);

  IF clash IS NOT NULL THEN
    RAISE EXCEPTION 'School already has a school_admin under another login: %', clash;
  END IF;
END $$;

CREATE TEMP TABLE _school_admin_to_create AS
SELECT
  gen_random_uuid() AS id,
  m.school_id,
  m.school_name,
  lower(m.school_id) || '@edu.local' AS auth_email,
  'ผู้จัดการโรงเรียน ' || m.school_name AS full_name,
  'ผู้ดูแลโรงเรียน' AS position,
  'school_admin' AS role,
  'password12345' AS password
FROM _school_admin_map m
WHERE NOT EXISTS (
  SELECT 1
  FROM public.user_profiles p
  WHERE lower(p.email) = lower(m.school_id)
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
  c.id,
  'authenticated',
  'authenticated',
  c.auth_email,
  crypt(c.password, gen_salt('bf')),
  timezone('utc', now()),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object(
    'full_name', c.full_name,
    'role', c.role,
    'login_id', c.school_id
  ),
  timezone('utc', now()),
  timezone('utc', now()),
  '', '', '', ''
FROM _school_admin_to_create c
ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (
  id, user_id, identity_data, provider, provider_id,
  last_sign_in_at, created_at, updated_at
)
SELECT
  c.id,
  c.id,
  jsonb_build_object('sub', c.id::text, 'email', c.auth_email, 'email_verified', true),
  'email',
  c.auth_email,
  timezone('utc', now()),
  timezone('utc', now()),
  timezone('utc', now())
FROM _school_admin_to_create c
ON CONFLICT DO NOTHING;

INSERT INTO public.user_profiles (
  id, email, full_name, name_prefix, position, role,
  assigned_zone, assigned_provinces, assigned_districts, assigned_schools,
  reports_to, disabled, must_change_password
)
SELECT
  c.id,
  c.school_id,
  c.full_name,
  NULL,
  c.position,
  c.role,
  NULL,
  '{}'::text[],
  '{}'::text[],
  ARRAY[c.school_id]::text[],
  NULL,
  false,
  true
FROM _school_admin_to_create c
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = 'school_admin',
  assigned_schools = EXCLUDED.assigned_schools,
  must_change_password = true,
  updated_at = timezone('utc', now());

-- Existing logins in the map: refresh school_admin scope + display name
UPDATE public.user_profiles p
SET
  role = 'school_admin',
  full_name = 'ผู้จัดการโรงเรียน ' || m.school_name,
  position = COALESCE(NULLIF(TRIM(p.position), ''), 'ผู้ดูแลโรงเรียน'),
  assigned_schools = ARRAY[m.school_id]::text[],
  must_change_password = true,
  updated_at = timezone('utc', now())
FROM _school_admin_map m
WHERE lower(p.email) = lower(m.school_id)
  AND NOT EXISTS (
    SELECT 1 FROM _school_admin_to_create c WHERE c.school_id = m.school_id
  );

DROP TABLE IF EXISTS _school_admin_to_create;
DROP TABLE IF EXISTS _school_admin_map;
