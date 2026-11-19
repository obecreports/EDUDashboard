-- =============================================================================
-- ConED · UAT DB-only harden
-- 1) Open site_settings for anon (cookie auth → auth.uid() is NULL)
-- 2) Achievements columns on school_swot
-- 3) Idempotent reopen of operational tables (match 008)
-- Safe to re-run.
-- =============================================================================

-- site_settings (Content Access + Hero)
ALTER TABLE IF EXISTS public.site_settings DISABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_settings TO anon, authenticated;

-- Achievements (were cookie-only in school extras)
ALTER TABLE IF EXISTS public.school_swot
  ADD COLUMN IF NOT EXISTS achievement_school text;
ALTER TABLE IF EXISTS public.school_swot
  ADD COLUMN IF NOT EXISTS achievement_student text;

COMMENT ON COLUMN public.school_swot.achievement_school IS 'School-level achievement text';
COMMENT ON COLUMN public.school_swot.achievement_student IS 'Student-level achievement text';

-- Operational tables (idempotent reopen)
ALTER TABLE IF EXISTS public.user_profiles DISABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_profiles TO anon, authenticated;

ALTER TABLE IF EXISTS public.site_visit_events DISABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_visit_events TO anon, authenticated;

ALTER TABLE IF EXISTS public.school_visit_logs DISABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_visit_logs TO anon, authenticated;

ALTER TABLE IF EXISTS public.data_tickets DISABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.data_tickets TO anon, authenticated;

ALTER TABLE IF EXISTS public.school_swot DISABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_swot TO anon, authenticated;

ALTER TABLE IF EXISTS public.school_staff_comments DISABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_staff_comments TO anon, authenticated;

ALTER TABLE IF EXISTS public.report_drafts DISABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.report_drafts TO anon, authenticated;
