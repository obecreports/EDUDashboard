-- =============================================================================
-- ConED · Migrate Type 2 identity to role=volunteer (drop overseer_tier identity)
-- - overseer + type2 → volunteer
-- - Clear overseer_tier on all rows (identity is role only)
-- - Stop defaulting overseer inserts to type1
-- =============================================================================

-- Type 2 accounts become volunteer (อาสาสมัคร)
UPDATE public.user_profiles
SET
  role = 'volunteer',
  overseer_tier = NULL,
  position = COALESCE(NULLIF(TRIM(position), ''), 'อาสาสมัคร')
WHERE role = 'overseer'
  AND overseer_tier = 'type2';

-- Type 1 and any leftover tiers: clear column (role=overseer is องคมนตรี)
UPDATE public.user_profiles
SET overseer_tier = NULL
WHERE overseer_tier IS NOT NULL;

COMMENT ON COLUMN public.user_profiles.overseer_tier IS
  'Deprecated — identity is role only (overseer=องคมนตรี, volunteer=อาสาสมัคร). Kept nullable for legacy reads.';

-- No longer default overseer → type1; always clear tier
CREATE OR REPLACE FUNCTION public.trg_user_profiles_overseer_tier_default()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.overseer_tier := NULL;
  RETURN NEW;
END;
$$;
