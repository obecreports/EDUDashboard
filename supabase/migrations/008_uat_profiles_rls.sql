-- =============================================================================
-- ConED · UAT: DISABLE RLS on operational tables
-- App uses anon key + cookie session (auth.uid() is NULL), so 001 policies
-- block admin domain saves / schedule / reports. Re-enable + tighten policies
-- only after switching to real Supabase Auth sessions.
-- Safe to re-run.
-- =============================================================================

-- Profiles (admin assign Gov_Domain / provinces)
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_profiles TO anon, authenticated;

-- Schedule
ALTER TABLE IF EXISTS public.site_visit_events DISABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_visit_events TO anon, authenticated;

-- Reports / comments
ALTER TABLE IF EXISTS public.school_staff_comments DISABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_staff_comments TO anon, authenticated;

-- SWOT
ALTER TABLE IF EXISTS public.school_swot DISABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_swot TO anon, authenticated;

-- Tickets
ALTER TABLE IF EXISTS public.data_tickets DISABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.data_tickets TO anon, authenticated;

-- Visit logs
ALTER TABLE IF EXISTS public.school_visit_logs DISABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_visit_logs TO anon, authenticated;

-- Optional: drop leftover UAT policies (harmless if RLS is disabled)
DROP POLICY IF EXISTS "uat_profiles_read_all" ON public.user_profiles;
DROP POLICY IF EXISTS "uat_profiles_write_all" ON public.user_profiles;
