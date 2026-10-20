-- =============================================================================
-- ConED · Shared demo password → password12345 (all seeded / @edu.local users)
-- Replaces login1234 and Admin123456 in auth.users.
-- Also updates create_coned_user default for new accounts.
-- Prefer 027_set_all_passwords_password12345.sql for live DB updates.
-- Run in Supabase → SQL Editor (or via migration apply).
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) All ConED demo auth users (short login @edu.local + known UUIDs)
UPDATE auth.users
SET
  encrypted_password = crypt('password12345', gen_salt('bf')),
  updated_at = timezone('utc', now())
WHERE email ILIKE '%@edu.local'
   OR id IN (
    'a1111111-1111-4111-8111-111111111101'::uuid, -- staff01
    'a1111111-1111-4111-8111-111111111102'::uuid, -- staff02
    'a1111111-1111-4111-8111-111111111104'::uuid, -- sirdawpong (boss)
    'a1111111-1111-4111-8111-111111111105'::uuid, -- admin
    'a1111111-1111-4111-8111-111111111106'::uuid, -- super_admin
    'a1111111-1111-4111-8111-111111111107'::uuid  -- sirthanu
  );

UPDATE public.user_profiles
SET must_change_password = false
WHERE id IN (SELECT id FROM auth.users WHERE email ILIKE '%@edu.local')
   OR id::text LIKE 'a1111111-1111-4111-8111-%';

-- 2) New accounts via RPC: default password password12345
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
    'staff', 'overseer', 'volunteer', 'super_overseer', 'admin', 'super_admin'
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
    assigned_zone, assigned_provinces, assigned_districts,
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
    NULL,
    false,
    false
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    name_prefix = EXCLUDED.name_prefix,
    position = EXCLUDED.position,
    role = EXCLUDED.role,
    disabled = false,
    must_change_password = EXCLUDED.must_change_password,
    updated_at = timezone('utc', now());

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_coned_user(text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_coned_user(text, text, text, text, text, text) TO anon, authenticated;

COMMENT ON FUNCTION public.create_coned_user IS
  'Create ConED login (auth.users + user_profiles). Default password: password12345.';
