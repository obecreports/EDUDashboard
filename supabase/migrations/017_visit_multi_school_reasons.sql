-- =============================================================================
-- ConED · Multi-school visits, multi reasons, participants + report onsite fields
-- UAT: RLS stays disabled / wide GRANT (cookie session, anon key).
-- =============================================================================

-- site_visit_events: multi-school + multi-reason + team participants
ALTER TABLE public.site_visit_events
  ADD COLUMN IF NOT EXISTS school_ids bigint[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS visit_reasons text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS participant_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS group_id uuid,
  ADD COLUMN IF NOT EXISTS province_name text;

COMMENT ON COLUMN public.site_visit_events.school_ids IS
  'All schools in this visit (same province). school_id keeps primary/legacy.';
COMMENT ON COLUMN public.site_visit_events.visit_reasons IS
  'Multi-select visit reasons; activity_type keeps first/display label.';
COMMENT ON COLUMN public.site_visit_events.participant_ids IS
  'Team members who should see this event on their calendar (includes booker).';
COMMENT ON COLUMN public.site_visit_events.group_id IS
  'Optional shared id when multiple linked rows are created.';
COMMENT ON COLUMN public.site_visit_events.province_name IS
  'Province lock for multi-school visits.';

-- Backfill from singular columns
UPDATE public.site_visit_events
SET school_ids = ARRAY[school_id]::bigint[]
WHERE school_id IS NOT NULL
  AND (school_ids IS NULL OR cardinality(school_ids) = 0);

UPDATE public.site_visit_events
SET visit_reasons = ARRAY[activity_type]::text[]
WHERE activity_type IS NOT NULL
  AND trim(activity_type) <> ''
  AND (visit_reasons IS NULL OR cardinality(visit_reasons) = 0);

UPDATE public.site_visit_events
SET participant_ids = ARRAY[staff_id]::uuid[]
WHERE staff_id IS NOT NULL
  AND (participant_ids IS NULL OR cardinality(participant_ids) = 0);

CREATE INDEX IF NOT EXISTS idx_site_visit_events_school_ids
  ON public.site_visit_events USING GIN (school_ids);
CREATE INDEX IF NOT EXISTS idx_site_visit_events_participant_ids
  ON public.site_visit_events USING GIN (participant_ids);
CREATE INDEX IF NOT EXISTS idx_site_visit_events_visit_reasons
  ON public.site_visit_events USING GIN (visit_reasons);

-- school_staff_comments: onsite reason / visitor mapping / ops notes
ALTER TABLE public.school_staff_comments
  ADD COLUMN IF NOT EXISTS onsite_reasons text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS visitor_reason_map jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS ops_notes text;

COMMENT ON COLUMN public.school_staff_comments.onsite_reasons IS
  'Actual onsite visit reasons (may differ from schedule).';
COMMENT ON COLUMN public.school_staff_comments.visitor_reason_map IS
  'Map participant_id → array of reason labels they were involved in.';
COMMENT ON COLUMN public.school_staff_comments.ops_notes IS
  'แนวทางการดำเนินงาน/การปฏิบัติงาน ณ หน้างาน';

-- report_drafts: create if missing (migration 009 may not have been applied), then add columns
CREATE TABLE IF NOT EXISTS public.report_drafts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id uuid NOT NULL REFERENCES public.user_profiles (id) ON DELETE CASCADE,
  school_id bigint REFERENCES public."School_Basic" (school_id) ON DELETE SET NULL,
  school_name text NOT NULL DEFAULT '',
  province text NOT NULL DEFAULT '',
  district text NOT NULL DEFAULT '',
  report_date date,
  boxes jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_report_drafts_staff ON public.report_drafts (staff_id);
CREATE INDEX IF NOT EXISTS idx_report_drafts_updated ON public.report_drafts (updated_at DESC);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'set_updated_at'
  ) THEN
    DROP TRIGGER IF EXISTS trg_report_drafts_updated ON public.report_drafts;
    CREATE TRIGGER trg_report_drafts_updated
      BEFORE UPDATE ON public.report_drafts
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

ALTER TABLE public.report_drafts
  ADD COLUMN IF NOT EXISTS onsite_reasons text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS visitor_reason_map jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS ops_notes text,
  ADD COLUMN IF NOT EXISTS calendar_event_id text;

COMMENT ON TABLE public.report_drafts IS
  'Staff report drafts (boxes jsonb); UAT uses DB instead of cookies';

-- UAT grants (match 008)
ALTER TABLE IF EXISTS public.site_visit_events DISABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_visit_events TO anon, authenticated;

ALTER TABLE IF EXISTS public.school_staff_comments DISABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_staff_comments TO anon, authenticated;

ALTER TABLE IF EXISTS public.report_drafts DISABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.report_drafts TO anon, authenticated;
