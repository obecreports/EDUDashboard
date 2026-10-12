-- =============================================================================
-- ConED · Report drafts (UAT / field staff) — replaces cookie draft store
-- Safe to re-run.
-- =============================================================================

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

DROP TRIGGER IF EXISTS trg_report_drafts_updated ON public.report_drafts;
CREATE TRIGGER trg_report_drafts_updated
  BEFORE UPDATE ON public.report_drafts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.report_drafts DISABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.report_drafts TO anon, authenticated;

COMMENT ON TABLE public.report_drafts IS
  'Staff report drafts (boxes jsonb); UAT uses DB instead of cookies';
