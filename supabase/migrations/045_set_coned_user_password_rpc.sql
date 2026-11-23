-- =============================================================================
-- ConED · Password RPCs for UAT training
-- - set_coned_user_password: update auth.users + must_change_password flag
-- - verify_coned_user_password: check password against auth.users
-- App uses anon key; SECURITY DEFINER (same pattern as create_coned_user).
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.set_coned_user_password(
  p_user_id uuid,
  p_password text,
  p_must_change boolean DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_password text := coalesce(nullif(trim(p_password), ''), '');
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user_id required';
  END IF;
  IF v_password = '' OR char_length(v_password) < 8 THEN
    RAISE EXCEPTION 'password must be at least 8 characters';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'user not found';
  END IF;

  UPDATE auth.users
  SET
    encrypted_password = crypt(v_password, gen_salt('bf')),
    updated_at = timezone('utc', now())
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'auth user not found';
  END IF;

  UPDATE public.user_profiles
  SET
    must_change_password = coalesce(p_must_change, true),
    updated_at = timezone('utc', now())
  WHERE id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_coned_user_password(
  p_user_id uuid,
  p_password text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_ok boolean := false;
BEGIN
  IF p_user_id IS NULL OR coalesce(nullif(trim(p_password), ''), '') = '' THEN
    RETURN false;
  END IF;

  SELECT (u.encrypted_password = crypt(trim(p_password), u.encrypted_password))
  INTO v_ok
  FROM auth.users u
  WHERE u.id = p_user_id;

  RETURN coalesce(v_ok, false);
END;
$$;

REVOKE ALL ON FUNCTION public.set_coned_user_password(uuid, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_coned_user_password(uuid, text, boolean) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.verify_coned_user_password(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_coned_user_password(uuid, text) TO anon, authenticated;

COMMENT ON FUNCTION public.set_coned_user_password IS
  'Set ConED user password in auth.users and must_change_password on user_profiles.';
COMMENT ON FUNCTION public.verify_coned_user_password IS
  'Verify ConED login password against auth.users (bcrypt).';
