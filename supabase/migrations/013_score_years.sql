-- =============================================================================
-- Score years: School_Score + school_pillar_scores support YoY rows.
--
-- RULE: school_year is ALWAYS Christian Era / A.D. text ('2025', '2026', …).
--       Buddhist Era is converted only in the application UI (+543).
--
-- Existing rows → '2025' (current published year). Insert '2026' for next year.
-- =============================================================================

-- ---------- school_pillar_scores ----------
ALTER TABLE public.school_pillar_scores
  ADD COLUMN IF NOT EXISTS school_year text;

-- Null / blank → 2025
UPDATE public.school_pillar_scores
SET school_year = '2025'
WHERE school_year IS NULL OR btrim(school_year) = '';

-- Convert any legacy Buddhist Era values (e.g. 2568 → 2025)
UPDATE public.school_pillar_scores
SET school_year = (school_year::integer - 543)::text
WHERE school_year ~ '^[0-9]+$'
  AND school_year::integer >= 2400;

ALTER TABLE public.school_pillar_scores
  ALTER COLUMN school_year SET DEFAULT '2025';

ALTER TABLE public.school_pillar_scores
  ALTER COLUMN school_year SET NOT NULL;

-- Replace single-school PK with composite (school_id, school_year)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.school_pillar_scores'::regclass
      AND contype = 'p'
  ) THEN
    ALTER TABLE public.school_pillar_scores DROP CONSTRAINT school_pillar_scores_pkey;
  END IF;
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_object THEN
    BEGIN
      EXECUTE (
        SELECT 'ALTER TABLE public.school_pillar_scores DROP CONSTRAINT ' || quote_ident(conname)
        FROM pg_constraint
        WHERE conrelid = 'public.school_pillar_scores'::regclass
          AND contype = 'p'
        LIMIT 1
      );
    EXCEPTION
      WHEN others THEN NULL;
    END;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.school_pillar_scores'::regclass
      AND contype = 'p'
  ) THEN
    ALTER TABLE public.school_pillar_scores
      ADD CONSTRAINT school_pillar_scores_pkey PRIMARY KEY (school_id, school_year);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_school_pillar_year
  ON public.school_pillar_scores (school_year);

COMMENT ON COLUMN public.school_pillar_scores.school_year IS
  'Christian Era / A.D. year text (e.g. 2025, 2026). UI converts to Buddhist Era (+543).';

-- ---------- School_Score (SMS / 5-angle scores) ----------
ALTER TABLE public."School_Score"
  ADD COLUMN IF NOT EXISTS school_year text;

UPDATE public."School_Score"
SET school_year = '2025'
WHERE school_year IS NULL OR btrim(school_year) = '';

UPDATE public."School_Score"
SET school_year = (school_year::integer - 543)::text
WHERE school_year ~ '^[0-9]+$'
  AND school_year::integer >= 2400;

ALTER TABLE public."School_Score"
  ALTER COLUMN school_year SET DEFAULT '2025';

-- Drop school_id-only primary/unique so multi-year rows can coexist
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.conname, c.contype
    FROM pg_constraint c
    WHERE c.conrelid = 'public."School_Score"'::regclass
      AND c.contype IN ('p', 'u')
      AND pg_get_constraintdef(c.oid) ~* 'school_id'
      AND pg_get_constraintdef(c.oid) !~* 'school_year'
  LOOP
    EXECUTE format('ALTER TABLE public."School_Score" DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS school_score_school_year_uidx
  ON public."School_Score" (school_id, school_year);

CREATE INDEX IF NOT EXISTS idx_school_score_year
  ON public."School_Score" (school_year);

COMMENT ON COLUMN public."School_Score".school_year IS
  'Christian Era / A.D. year text (e.g. 2025, 2026). Same architecture as school_pillar_scores.';

-- Insert next year (keep 2025 rows), e.g.:
--   INSERT INTO public."School_Score" (school_id, school_year, …) VALUES (…, '2026', …);
--   INSERT INTO public.school_pillar_scores (school_id, school_year, …) VALUES (…, '2026', …);
-- Then set SCORE_YEAR_CURRENT = '2026' in lib/scores/years.ts.
