-- =============================================================================
-- ConED · Supabase DDL — site_visit_events (Staff Calendar)
-- Run in Supabase SQL Editor after 002_school_swot_comments.sql
-- =============================================================================

-- school_id type must match public."School_Basic"(school_id) — bigint in production
CREATE TABLE IF NOT EXISTS public.site_visit_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id uuid REFERENCES public.user_profiles (id) ON DELETE CASCADE,
  school_id bigint REFERENCES public."School_Basic" (school_id) ON DELETE CASCADE,
  school_name text,
  area_id text,
  visit_date date NOT NULL,
  activity_type text NOT NULL, -- 'เยี่ยมชมโรงเรียน' | 'สำรวจข้อมูล' | 'ติดตามผล' | 'ประชุม'
  status text NOT NULL DEFAULT 'นัดหมายแล้ว'
    CHECK (status IN ('นัดหมายแล้ว', 'เยี่ยมชมเสร็จสิ้น', 'ยกเลิก')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_site_visit_staff ON public.site_visit_events (staff_id);
CREATE INDEX IF NOT EXISTS idx_site_visit_date ON public.site_visit_events (visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_site_visit_school ON public.site_visit_events (school_id);

ALTER TABLE public.site_visit_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read/write on site_visit_events"
  ON public.site_visit_events;
CREATE POLICY "Allow authenticated read/write on site_visit_events"
  ON public.site_visit_events FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ConED mock cookie auth uses anon key — allow demo writes/reads
DROP POLICY IF EXISTS "Allow public read on site_visit_events" ON public.site_visit_events;
CREATE POLICY "Allow public read on site_visit_events"
  ON public.site_visit_events FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow anon write on site_visit_events" ON public.site_visit_events;
CREATE POLICY "Allow anon write on site_visit_events"
  ON public.site_visit_events FOR ALL
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_visit_events TO anon, authenticated;

COMMENT ON TABLE public.site_visit_events IS 'Staff site-visit calendar events (agenda)';
COMMENT ON COLUMN public.site_visit_events.activity_type IS 'Thai activity label, e.g. เยี่ยมชมโรงเรียน';
COMMENT ON COLUMN public.site_visit_events.status IS 'นัดหมายแล้ว | เยี่ยมชมเสร็จสิ้น | ยกเลิก';
