-- =============================================================================
-- ConED · directors.phone + school_buildings
-- Safe to re-run.
-- =============================================================================

ALTER TABLE IF EXISTS public.directors
  ADD COLUMN IF NOT EXISTS phone text;

COMMENT ON COLUMN public.directors.phone IS 'Director contact telephone';

CREATE TABLE IF NOT EXISTS public.school_buildings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id bigint NOT NULL REFERENCES public."School_Basic" (school_id) ON DELETE CASCADE,
  building_number text NOT NULL,
  categorize text NOT NULL,
  building_type text,
  room_plan integer,
  room_build integer,
  room_special integer,
  room_expand integer,
  build_year text,
  building_lifetime text,
  budget_cost numeric,
  budget_origin text,
  building_quality text,
  building_status text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (school_id, building_number)
);

CREATE INDEX IF NOT EXISTS idx_school_buildings_school
  ON public.school_buildings (school_id);

DROP TRIGGER IF EXISTS trg_school_buildings_updated ON public.school_buildings;
CREATE TRIGGER trg_school_buildings_updated
  BEFORE UPDATE ON public.school_buildings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.school_buildings DISABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_buildings TO anon, authenticated;

COMMENT ON TABLE public.school_buildings IS 'School building inventory for ConED buildings tab carousel';
