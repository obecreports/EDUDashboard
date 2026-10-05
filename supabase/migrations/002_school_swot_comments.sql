-- =============================================================================
-- ConED · Supabase DDL — school_swot + school_staff_comments
-- Run in Supabase SQL Editor after 001_rbac_visits_settings.sql
-- =============================================================================

-- school_id type must match public."School_Basic"(school_id) — bigint in production
CREATE TABLE IF NOT EXISTS public.school_swot (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id bigint NOT NULL REFERENCES public."School_Basic" (school_id) ON DELETE CASCADE,
  internal_strengths text,   -- จุดแข็ง
  internal_weaknesses text,  -- จุดอ่อน
  external_opportunities text, -- โอกาส
  external_threats text,       -- อุปสรรค
  updated_by uuid REFERENCES public.user_profiles (id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (school_id)
);

CREATE TABLE IF NOT EXISTS public.school_staff_comments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id bigint NOT NULL REFERENCES public."School_Basic" (school_id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.user_profiles (id) ON DELETE SET NULL,
  staff_name text, -- denormalized for display when staff_id is null (mock auth)
  comment_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_school_swot_school ON public.school_swot (school_id);
CREATE INDEX IF NOT EXISTS idx_school_comments_school ON public.school_staff_comments (school_id);
CREATE INDEX IF NOT EXISTS idx_school_comments_created ON public.school_staff_comments (created_at DESC);

DROP TRIGGER IF EXISTS trg_school_swot_updated ON public.school_swot;
CREATE TRIGGER trg_school_swot_updated
  BEFORE UPDATE ON public.school_swot
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.school_swot ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_staff_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access on school_swot" ON public.school_swot;
CREATE POLICY "Allow public read access on school_swot"
  ON public.school_swot FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert/update on school_swot" ON public.school_swot;
CREATE POLICY "Allow authenticated insert/update on school_swot"
  ON public.school_swot FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ConED also uses anon key + mock cookie auth; allow upserts for demo/ops
DROP POLICY IF EXISTS "Allow anon write on school_swot" ON public.school_swot;
CREATE POLICY "Allow anon write on school_swot"
  ON public.school_swot FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read access on school_staff_comments" ON public.school_staff_comments;
CREATE POLICY "Allow public read access on school_staff_comments"
  ON public.school_staff_comments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert on school_staff_comments" ON public.school_staff_comments;
CREATE POLICY "Allow authenticated insert on school_staff_comments"
  ON public.school_staff_comments FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow anon insert on school_staff_comments" ON public.school_staff_comments;
CREATE POLICY "Allow anon insert on school_staff_comments"
  ON public.school_staff_comments FOR INSERT
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.school_swot TO anon, authenticated;
GRANT SELECT, INSERT ON public.school_staff_comments TO anon, authenticated;

COMMENT ON TABLE public.school_swot IS 'Classic SWOT (S/W/O/T) per school; one row per school_id';
COMMENT ON TABLE public.school_staff_comments IS 'Staff visit notes / progress comments per school';
