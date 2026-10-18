-- =============================================================================
-- ConED · Overseer Type 1 / Type 2 hierarchy
-- - overseer_tier: 'type1' | 'type2' (NULL for non-overseer roles)
-- - Index reports_to for Type2 → Type1 lookups
-- - Backfill existing องคมนตรี (role=overseer) as type1
-- =============================================================================

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS overseer_tier text;

DO $$
BEGIN
  ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_overseer_tier_check;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_overseer_tier_check
  CHECK (
    overseer_tier IS NULL
    OR overseer_tier IN ('type1', 'type2')
  );

COMMENT ON COLUMN public.user_profiles.overseer_tier IS
  'Overseer hierarchy: type1 = top องคมนตรี; type2 = sub-overseer under a type1 via reports_to. NULL for non-overseer.';

-- Fast Type2 → Type1 / staff → boss lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_reports_to
  ON public.user_profiles (reports_to);

CREATE INDEX IF NOT EXISTS idx_user_profiles_overseer_tier
  ON public.user_profiles (overseer_tier)
  WHERE overseer_tier IS NOT NULL;

-- Existing overseer accounts (OS01–OS14 etc.) are Type 1
UPDATE public.user_profiles
SET overseer_tier = 'type1'
WHERE role = 'overseer'
  AND (overseer_tier IS NULL OR overseer_tier NOT IN ('type1', 'type2'));

-- Non-overseer roles must not carry a tier
UPDATE public.user_profiles
SET overseer_tier = NULL
WHERE role IS DISTINCT FROM 'overseer'
  AND overseer_tier IS NOT NULL;

-- New overseer inserts via create_coned_user default to type1 when column present
CREATE OR REPLACE FUNCTION public.trg_user_profiles_overseer_tier_default()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.role = 'overseer' AND NEW.overseer_tier IS NULL THEN
    NEW.overseer_tier := 'type1';
  ELSIF NEW.role IS DISTINCT FROM 'overseer' THEN
    NEW.overseer_tier := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_profiles_overseer_tier_default ON public.user_profiles;
CREATE TRIGGER trg_user_profiles_overseer_tier_default
  BEFORE INSERT OR UPDATE OF role, overseer_tier ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_user_profiles_overseer_tier_default();
