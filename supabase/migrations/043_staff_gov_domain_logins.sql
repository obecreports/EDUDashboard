-- =============================================================================
-- ConED · Batch create 64 staff logins (1:1 Gov_Domain.area_id)
-- Login = pesao_* / sesao_* · assigned_districts = [area_id]
-- full_name = 'ศึกษานิเทศก์ ' || area_name
-- Default password: password12345 · must_change_password = true
-- Idempotent: upsert by login_id (user_profiles.email)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TEMP TABLE _staff_gov_map (
  area_id text PRIMARY KEY,
  login_id text NOT NULL UNIQUE,
  area_name text NOT NULL
);

INSERT INTO _staff_gov_map (area_id, login_id, area_name) VALUES
  ('ATH_P_002', 'pesao_ath_02', 'สพป.อุทัยธานี เขต 2'),
  ('AUB_P_003', 'pesao_aub_03', 'สพป.อุบลราชธานี เขต 3'),
  ('AUB_P_005', 'pesao_aub_05', 'สพป.อุบลราชธานี เขต 5'),
  ('AUD_P_001', 'pesao_aud_01', 'สพป.อุดรธานี เขต 1'),
  ('AUD_P_002', 'pesao_aud_02', 'สพป.อุดรธานี เขต 2'),
  ('AUD_P_004', 'pesao_aud_04', 'สพป.อุดรธานี เขต 4'),
  ('AUT_P_002', 'pesao_aut_02', 'สพป.อุตรดิตถ์ เขต 2'),
  ('AYT_P_001', 'pesao_ayt_01', 'สพป.พระนครศรีอยุธยา เขต 1'),
  ('AYT_P_002', 'pesao_ayt_02', 'สพป.พระนครศรีอยุธยา เขต 2'),
  ('BRR_P_002', 'pesao_brr_02', 'สพป.บุรีรัมย์ เขต 2'),
  ('BRR_P_003', 'pesao_brr_03', 'สพป.บุรีรัมย์ เขต 3'),
  ('CCS_P_002', 'pesao_ccs_02', 'สพป.ฉะเชิงเทรา เขต 2'),
  ('CXM_M_001', 'sesao_cxm_00', 'สพม.เชียงใหม่'),
  ('CXM_P_001', 'pesao_cxm_01', 'สพป.เชียงใหม่ เขต 1'),
  ('CXM_P_003', 'pesao_cxm_03', 'สพป.เชียงใหม่ เขต 3'),
  ('CXM_P_004', 'pesao_cxm_04', 'สพป.เชียงใหม่ เขต 4'),
  ('CXM_P_006', 'pesao_cxm_06', 'สพป.เชียงใหม่ เขต 6'),
  ('CXR_M_001', 'sesao_cxr_00', 'สพม.เชียงราย'),
  ('CXR_P_001', 'pesao_cxr_03', 'สพป.เชียงราย เขต 3'),
  ('KAN_M_001', 'sesao_kan_00', 'สพม.กาญจนบุรี'),
  ('KAN_P_001', 'pesao_kan_01', 'สพป.กาญจนบุรี เขต 1'),
  ('KAN_P_003', 'pesao_kan_03', 'สพป.กาญจนบุรี เขต 3'),
  ('KAN_P_004', 'pesao_kan_04', 'สพป.กาญจนบุรี เขต 4'),
  ('KPP_M_001', 'sesao_kpp_00', 'สพม.กำแพงเพชร'),
  ('KPP_P_001', 'pesao_kpp_01', 'สพป.กำแพงเพชร เขต 1'),
  ('KPP_P_002', 'pesao_kpp_02', 'สพป.กำแพงเพชร เขต 2'),
  ('LRB_P_002', 'pesao_lrb_02', 'สพป.ลพบุรี เขต 2'),
  ('MDH_P_001', 'pesao_mdh_00', 'สพป.มุกดาหาร'),
  ('MHS_P_002', 'pesao_mhs_02', 'สพป.แม่ฮ่องสอน เขต 2'),
  ('NAN_M_001', 'sesao_nan_00', 'สพม.น่าน'),
  ('NAN_P_001', 'pesao_nan_01', 'สพป.น่าน เขต 1'),
  ('NBL_M_001', 'sesao_nbl_00', 'สพม.เลย หนองบัวลำภู'),
  ('NBL_P_001', 'pesao_nbl_01', 'สพป.หนองบัวลำภู เขต 1'),
  ('NBL_P_002', 'pesao_nbl_02', 'สพป.หนองบัวลำภู เขต 2'),
  ('NTW_P_002', 'pesao_ntw_02', 'สพป.นราธิวาส เขต 2'),
  ('NTW_P_003', 'pesao_ntw_03', 'สพป.นราธิวาส เขต 3'),
  ('PAY_M_001', 'sesao_pay_00', 'สพม.พะเยา'),
  ('PAY_P_002', 'pesao_pay_02', 'สพป.พะเยา เขต 2'),
  ('PBR_M_001', 'sesao_pbr_00', 'สพม.เพชรบุรี'),
  ('PBR_P_001', 'pesao_pbr_01', 'สพป.เพชรบุรี เขต 1'),
  ('PBR_P_002', 'pesao_pbr_02', 'สพป.เพชรบุรี เขต 2'),
  ('PCU_P_002', 'pesao_pcu_02', 'สพป.ประจวบคีรีขันธ์ เขต 2'),
  ('PNL_P_003', 'pesao_pnl_03', 'สพป.พิษณุโลก เขต 3'),
  ('PRE_M_001', 'sesao_pre_00', 'สพม.แพร่'),
  ('PRE_P_001', 'pesao_pre_01', 'สพป.แพร่ เขต 1'),
  ('PRE_P_002', 'pesao_pre_02', 'สพป.แพร่ เขต 2'),
  ('PTN_P_002', 'pesao_ptn_02', 'สพป.ปัตตานี เขต 2'),
  ('PTN_P_003', 'pesao_ptn_03', 'สพป.ปัตตานี เขต 3'),
  ('RBR_P_001', 'pesao_rbr_01', 'สพป.ราชบุรี เขต 1'),
  ('SKA_M_001', 'sesao_ska_00', 'สพม.สระแก้ว'),
  ('SKA_P_001', 'pesao_ska_01', 'สพป.สระแก้ว เขต 1'),
  ('SKA_P_002', 'pesao_ska_02', 'สพป.สระแก้ว เขต 2'),
  ('SKL_P_003', 'pesao_skl_03', 'สพป.สงขลา เขต 3'),
  ('SKN_P_001', 'pesao_skn_01', 'สพป.สกลนคร เขต 1'),
  ('SKN_P_002', 'pesao_skn_02', 'สพป.สกลนคร เขต 2'),
  ('SKN_P_003', 'pesao_skn_03', 'สพป.สกลนคร เขต 3'),
  ('SKT_P_002', 'pesao_skt_02', 'สพป.สุโขทัย เขต 2'),
  ('SPB_P_003', 'pesao_spb_03', 'สพป.สุพรรณบุรี เขต 3'),
  ('SRN_P_003', 'pesao_srn_03', 'สพป.สุรินทร์ เขต 3'),
  ('SSK_P_003', 'pesao_ssk_03', 'สพป.ศรีสะเกษ เขต 3'),
  ('SSK_P_004', 'pesao_ssk_04', 'สพป.ศรีสะเกษ เขต 4'),
  ('TAK_P_002', 'pesao_tak_02', 'สพป.ตาก เขต 2'),
  ('YLA_P_001', 'pesao_yla_01', 'สพป.ยะลา เขต 1'),
  ('YLA_P_002', 'pesao_yla_02', 'สพป.ยะลา เขต 2');

-- Warn (as NOTICE) if area_id missing from Gov_Domain — still create accounts
DO $$
DECLARE
  missing text;
BEGIN
  SELECT string_agg(m.area_id, ', ' ORDER BY m.area_id)
  INTO missing
  FROM _staff_gov_map m
  LEFT JOIN public."Gov_Domain" g ON g.area_id::text = m.area_id
  WHERE g.area_id IS NULL;

  IF missing IS NOT NULL THEN
    RAISE NOTICE 'Staff map area_id not found in Gov_Domain: %', missing;
  END IF;
END $$;

-- Reject if another staff already owns the same area_id under a different login
DO $$
DECLARE
  clash text;
BEGIN
  SELECT string_agg(format('%s→%s (existing %s)', m.area_id, m.login_id, p.email), ', ')
  INTO clash
  FROM _staff_gov_map m
  JOIN public.user_profiles p
    ON p.role = 'staff'
   AND m.area_id = ANY (p.assigned_districts)
   AND lower(p.email) <> lower(m.login_id);

  IF clash IS NOT NULL THEN
    RAISE EXCEPTION 'Staff area_id already assigned to another login: %', clash;
  END IF;
END $$;

CREATE TEMP TABLE _staff_to_create AS
SELECT
  gen_random_uuid() AS id,
  m.area_id,
  m.login_id,
  m.area_name,
  lower(m.login_id) || '@edu.local' AS auth_email,
  'ศึกษานิเทศก์ ' || m.area_name AS full_name,
  'ศึกษานิเทศก์' AS position,
  'staff' AS role,
  'password12345' AS password
FROM _staff_gov_map m
WHERE NOT EXISTS (
  SELECT 1
  FROM public.user_profiles p
  WHERE lower(p.email) = lower(m.login_id)
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
    'login_id', c.login_id
  ),
  timezone('utc', now()),
  timezone('utc', now()),
  '', '', '', ''
FROM _staff_to_create c
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
FROM _staff_to_create c
ON CONFLICT DO NOTHING;

INSERT INTO public.user_profiles (
  id, email, full_name, name_prefix, position, role,
  assigned_zone, assigned_provinces, assigned_districts, assigned_schools,
  reports_to, disabled, must_change_password
)
SELECT
  c.id,
  c.login_id,
  c.full_name,
  NULL,
  c.position,
  c.role,
  NULL,
  '{}'::text[],
  ARRAY[c.area_id]::text[],
  '{}'::text[],
  NULL,
  false,
  true
FROM _staff_to_create c
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = 'staff',
  assigned_districts = EXCLUDED.assigned_districts,
  must_change_password = true,
  updated_at = timezone('utc', now());

-- Existing logins in the map: refresh staff scope + display name
UPDATE public.user_profiles p
SET
  role = 'staff',
  full_name = 'ศึกษานิเทศก์ ' || m.area_name,
  position = COALESCE(NULLIF(TRIM(p.position), ''), 'ศึกษานิเทศก์'),
  assigned_districts = ARRAY[m.area_id]::text[],
  assigned_schools = COALESCE(p.assigned_schools, '{}'::text[]),
  must_change_password = true,
  updated_at = timezone('utc', now())
FROM _staff_gov_map m
WHERE lower(p.email) = lower(m.login_id)
  AND NOT EXISTS (SELECT 1 FROM _staff_to_create c WHERE c.login_id = m.login_id);

DROP TABLE IF EXISTS _staff_to_create;
DROP TABLE IF EXISTS _staff_gov_map;
