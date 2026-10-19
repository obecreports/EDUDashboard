-- =============================================================================
-- ConED · School directors master + School_Basic.director_id + history
-- Safe to re-run. Requires: 010 (School_Basic grants)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- directors
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.directors (
  director_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_prefix text,
  full_name text NOT NULL,
  position_name text,
  gender text CHECK (
    gender IS NULL OR gender IN ('male', 'female', 'other')
  ),
  picture_url text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS directors_full_name_idx
  ON public.directors (full_name);

COMMENT ON TABLE public.directors IS
  'School directors (ผู้อำนวยการ) — one person may serve multiple schools';

-- ---------------------------------------------------------------------------
-- School_Basic.director_id (+ optional denormalized director_name for display)
-- ---------------------------------------------------------------------------
ALTER TABLE public."School_Basic"
  ADD COLUMN IF NOT EXISTS director_id uuid;

-- Denormalized label (may not have existed on legacy DBs)
ALTER TABLE public."School_Basic"
  ADD COLUMN IF NOT EXISTS director_name text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'school_basic_director_id_fkey'
  ) THEN
    ALTER TABLE public."School_Basic"
      ADD CONSTRAINT school_basic_director_id_fkey
      FOREIGN KEY (director_id)
      REFERENCES public.directors (director_id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS school_basic_director_id_idx
  ON public."School_Basic" (director_id);

COMMENT ON COLUMN public."School_Basic".director_id IS
  'Active director FK; NULL = TBA (no director assigned)';

COMMENT ON COLUMN public."School_Basic".director_name IS
  'Denormalized director display name synced from directors.full_name';

-- ---------------------------------------------------------------------------
-- Assignment history (path of schools a director served)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.director_school_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  director_id uuid NOT NULL REFERENCES public.directors (director_id) ON DELETE CASCADE,
  school_id bigint NOT NULL,
  started_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- One active assignment per school
CREATE UNIQUE INDEX IF NOT EXISTS director_school_history_active_school_uidx
  ON public.director_school_history (school_id)
  WHERE ended_at IS NULL;

CREATE INDEX IF NOT EXISTS director_school_history_director_idx
  ON public.director_school_history (director_id, started_at DESC);

COMMENT ON TABLE public.director_school_history IS
  'Director ↔ school assignment path; ended_at NULL = currently assigned';

-- ---------------------------------------------------------------------------
-- Grants (UAT cookie-auth / anon pattern like migration 010)
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.directors TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.director_school_history TO anon, authenticated;
GRANT SELECT, UPDATE ON TABLE public."School_Basic" TO anon, authenticated;

ALTER TABLE public.directors DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.director_school_history DISABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Soft backfill: prefer School_People name fields, then School_Basic.director_name
-- (legacy DBs often store ผอ. on School_People only)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  has_people boolean;
  has_dn boolean;
  has_tdn boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'School_People'
  ) INTO has_people;
  IF NOT has_people THEN
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'School_People'
      AND column_name = 'director_name'
  ) INTO has_dn;
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'School_People'
      AND column_name = 'teacher_director_name'
  ) INTO has_tdn;

  -- Seed Basic.director_name from People text fields when Basic is empty
  IF has_dn AND has_tdn THEN
    UPDATE public."School_Basic" sb
    SET director_name = trim(COALESCE(
      NULLIF(trim(sp.director_name), ''),
      NULLIF(trim(sp.teacher_director_name), '')
    ))
    FROM public."School_People" sp
    WHERE sp.school_id = sb.school_id
      AND (sb.director_name IS NULL OR trim(sb.director_name) = '')
      AND COALESCE(
        NULLIF(trim(sp.director_name), ''),
        NULLIF(trim(sp.teacher_director_name), '')
      ) IS NOT NULL;
  ELSIF has_dn THEN
    UPDATE public."School_Basic" sb
    SET director_name = trim(sp.director_name)
    FROM public."School_People" sp
    WHERE sp.school_id = sb.school_id
      AND (sb.director_name IS NULL OR trim(sb.director_name) = '')
      AND sp.director_name IS NOT NULL
      AND trim(sp.director_name) <> '';
  ELSIF has_tdn THEN
    UPDATE public."School_Basic" sb
    SET director_name = trim(sp.teacher_director_name)
    FROM public."School_People" sp
    WHERE sp.school_id = sb.school_id
      AND (sb.director_name IS NULL OR trim(sb.director_name) = '')
      AND sp.teacher_director_name IS NOT NULL
      AND trim(sp.teacher_director_name) <> '';
  END IF;
END $$;

-- Names that appear on exactly one school (avoid ambiguous shared names)
WITH unique_names AS (
  SELECT trim(director_name) AS full_name
  FROM public."School_Basic"
  WHERE director_name IS NOT NULL
    AND trim(director_name) <> ''
    AND director_id IS NULL
  GROUP BY trim(director_name)
  HAVING COUNT(*) = 1
)
INSERT INTO public.directors (full_name, position_name)
SELECT u.full_name, 'ผู้อำนวยการโรงเรียน'
FROM unique_names u
WHERE NOT EXISTS (
  SELECT 1 FROM public.directors d WHERE d.full_name = u.full_name
);

UPDATE public."School_Basic" sb
SET director_id = d.director_id
FROM public.directors d
WHERE sb.director_id IS NULL
  AND sb.director_name IS NOT NULL
  AND trim(sb.director_name) = d.full_name
  AND (
    SELECT COUNT(*)
    FROM public."School_Basic" x
    WHERE x.director_name IS NOT NULL
      AND trim(x.director_name) = d.full_name
  ) = 1;

-- Open history for backfilled active links (idempotent)
INSERT INTO public.director_school_history (director_id, school_id, started_at, ended_at)
SELECT sb.director_id, sb.school_id, timezone('utc', now()), NULL
FROM public."School_Basic" sb
WHERE sb.director_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.director_school_history h
    WHERE h.school_id = sb.school_id
      AND h.ended_at IS NULL
  );
