-- =============================================================================
-- ConED · Add school_admin role; migrate school logins off reserved director
-- - school_admin = school-scoped login (10-digit school_id)
-- - director remains allowed for a future different meaning
-- =============================================================================

DO $$
BEGIN
  ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- Existing school-login accounts were role=director
UPDATE public.user_profiles
SET
  role = 'school_admin',
  position = CASE
    WHEN NULLIF(TRIM(position), '') IS NULL
      OR TRIM(position) IN ('ผู้อำนวยการโรงเรียน', 'ผู้อำนวยการ')
      THEN 'ผู้ดูแลโรงเรียน'
    ELSE position
  END
WHERE role = 'director'
  AND (
    COALESCE(cardinality(assigned_schools), 0) > 0
    OR email ~ '^[0-9]{10}$'
  );

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
    'school_admin',
    'director',
    'super_overseer',
    'admin',
    'super_admin',
    'global'
  ));

COMMENT ON COLUMN public.user_profiles.role IS
  'RBAC role: guest|staff|overseer|volunteer_*|covert_overseer|school_admin|director|super_overseer|admin|super_admin';

COMMENT ON COLUMN public.user_profiles.assigned_schools IS
  'School-admin login scope — school_id strings. Empty for other roles.';

-- Allow school_admin (and current field roles) in create_coned_user RPC
CREATE OR REPLACE FUNCTION public.create_coned_user(
  p_login_id text,
  p_full_name text,
  p_position text,
  p_role text,
  p_password text DEFAULT 'password12345',
  p_name_prefix text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_id uuid := gen_random_uuid();
  v_login text := trim(p_login_id);
  v_auth_email text;
  v_instance uuid;
  v_password text := coalesce(nullif(trim(p_password), ''), 'password12345');
  v_schools text[] := '{}'::text[];
BEGIN
  IF v_login IS NULL OR v_login = '' THEN
    RAISE EXCEPTION 'login_id required';
  END IF;
  IF position('@' in v_login) > 0 THEN
    RAISE EXCEPTION 'login_id must not contain @';
  END IF;
  IF trim(p_full_name) = '' OR trim(p_position) = '' THEN
    RAISE EXCEPTION 'full_name and position required';
  END IF;
  IF p_role NOT IN (
    'staff',
    'overseer',
    'volunteer',
    'volunteer_center',
    'volunteer_border',
    'special_volunteer',
    'covert_overseer',
    'school_admin',
    'director',
    'super_overseer',
    'admin',
    'super_admin'
  ) THEN
    RAISE EXCEPTION 'invalid role: %', p_role;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE lower(email) = lower(v_login)
       OR lower(split_part(coalesce(email, ''), '@', 1)) = lower(v_login)
  ) THEN
    RAISE EXCEPTION 'login_id already exists: %', v_login;
  END IF;

  IF p_role IN ('school_admin', 'director') THEN
    v_schools := ARRAY[v_login];
  END IF;

  v_auth_email := lower(v_login) || '@edu.local';
  v_instance := COALESCE(
    (SELECT id FROM auth.instances LIMIT 1),
    '00000000-0000-0000-0000-000000000000'::uuid
  );

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) VALUES (
    v_instance,
    v_id,
    'authenticated',
    'authenticated',
    v_auth_email,
    crypt(v_password, gen_salt('bf')),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object(
      'full_name', trim(p_full_name),
      'role', p_role,
      'login_id', v_login,
      'name_prefix', p_name_prefix
    ),
    timezone('utc', now()),
    timezone('utc', now()),
    '', '', '', ''
  );

  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    v_id,
    v_id,
    jsonb_build_object('sub', v_id::text, 'email', v_auth_email, 'email_verified', true),
    'email',
    v_auth_email,
    timezone('utc', now()),
    timezone('utc', now()),
    timezone('utc', now())
  )
  ON CONFLICT DO NOTHING;

  INSERT INTO public.user_profiles (
    id, email, full_name, name_prefix, position, role,
    assigned_zone, assigned_provinces, assigned_districts, assigned_schools,
    reports_to, disabled, must_change_password
  ) VALUES (
    v_id,
    v_login,
    trim(p_full_name),
    nullif(trim(coalesce(p_name_prefix, '')), ''),
    trim(p_position),
    p_role,
    NULL,
    '{}'::text[],
    '{}'::text[],
    v_schools,
    NULL,
    false,
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    name_prefix = EXCLUDED.name_prefix,
    position = EXCLUDED.position,
    role = EXCLUDED.role,
    assigned_schools = EXCLUDED.assigned_schools,
    disabled = false,
    must_change_password = EXCLUDED.must_change_password,
    updated_at = timezone('utc', now());

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_coned_user(text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_coned_user(text, text, text, text, text, text) TO anon, authenticated;

COMMENT ON FUNCTION public.create_coned_user IS
  'Create ConED login (auth.users + user_profiles). school_admin sets assigned_schools from login school_id.';
