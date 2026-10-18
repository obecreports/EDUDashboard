-- =============================================================================
-- ConED · Overseer Type 2: position + display as อาสาสมัคร
-- (role stays 'overseer' with overseer_tier = 'type2')
-- =============================================================================

UPDATE public.user_profiles
SET
  position = 'อาสาสมัคร',
  updated_at = timezone('utc', now())
WHERE role = 'overseer'
  AND overseer_tier = 'type2'
  AND (position IS DISTINCT FROM 'อาสาสมัคร');
