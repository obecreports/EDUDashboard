-- ConED · Retire mock AS01; staff reports_to Type 1 (province), not Type 2
-- Link: staff Gov_Domain districts → province → OS Type 1 (e.g. OS10)

-- Point staff03 / staff04 / anyone under AS01 at OS10 (Type 1)
UPDATE public.user_profiles
SET
  reports_to = 'a1111111-1111-4111-8111-111111111210',
  updated_at = now()
WHERE
  id IN (
    'a1111111-1111-4111-8111-111111111101',
    'a1111111-1111-4111-8111-111111111102'
  )
  OR lower(trim(email)) IN ('staff03', 'staff04')
  OR reports_to = 'a1111111-1111-4111-8111-111111111103';

-- Staff currently under OS10 Type 2 (OS10T*) → move to OS10 Type 1
UPDATE public.user_profiles AS s
SET
  reports_to = 'a1111111-1111-4111-8111-111111111210',
  updated_at = now()
FROM public.user_profiles AS boss
WHERE
  s.role = 'staff'
  AND s.reports_to = boss.id
  AND boss.role = 'overseer'
  AND coalesce(boss.overseer_tier, 'type1') = 'type2'
  AND boss.reports_to = 'a1111111-1111-4111-8111-111111111210';

-- Disable AS01 mock account (keep row for legacy FKs)
UPDATE public.user_profiles
SET
  disabled = true,
  updated_at = now()
WHERE
  id = 'a1111111-1111-4111-8111-111111111103'
  OR lower(trim(email)) = 'as01';
