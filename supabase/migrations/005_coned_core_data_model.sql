-- =============================================================================
-- ConED · Core data model (pillars, reports, schedule, tickets, profile, SWOT)
-- Clears demo/mock rows from ConED tables and (re)creates structured schemas.
-- Run after 001–004. Existing School_Basic / School_People / School_Score stay.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0) Clear mock / demo operational data (keep school master data)
-- ---------------------------------------------------------------------------
-- Clear operational mock/demo rows (calendar / schedule, reports, visit logs)
TRUNCATE TABLE public.site_visit_events RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.school_staff_comments RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.school_visit_logs RESTART IDENTITY CASCADE;
-- SWOT will be reshaped below; clear content
UPDATE public.school_swot
SET
  internal_strengths = NULL,
  internal_weaknesses = NULL,
  external_opportunities = NULL,
  external_threats = NULL,
  categories = '{}'::jsonb
WHERE true;

-- ---------------------------------------------------------------------------
-- 1) User profile extensions (RBAC + domain + greeting)
-- ---------------------------------------------------------------------------
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS name_prefix text,
  ADD COLUMN IF NOT EXISTS birthday date,
  ADD COLUMN IF NOT EXISTS assigned_provinces text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS assigned_districts text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS reports_to uuid REFERENCES public.user_profiles (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS disabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;

-- Widen role check for new RBAC (drop old check if present, add new)
DO $$
BEGIN
  ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_role_check
  CHECK (role IN (
    'guest', 'staff', 'overseer', 'super_overseer', 'admin', 'super_admin', 'global'
  ));

COMMENT ON COLUMN public.user_profiles.assigned_districts IS
  'Staff geo keys as province|district';
COMMENT ON COLUMN public.user_profiles.must_change_password IS
  'True after admin OTP / first login until user sets own password';

-- ---------------------------------------------------------------------------
-- 2) 3-pillar scores (0–100) + indicator detail
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.school_pillar_scores (
  school_id bigint PRIMARY KEY REFERENCES public."School_Basic" (school_id) ON DELETE CASCADE,
  -- Indicator scores 0–100
  i_1_1 numeric(5,2), -- ศักยภาพครูในการดูแลและพัฒนาผู้เรียนรายบุคคล
  i_1_2 numeric(5,2), -- ความพร้อมด้านอาคาร ห้องเรียน และโครงสร้างพื้นฐาน
  i_1_3 numeric(5,2), -- ความพร้อมด้านสื่อ เทคโนโลยี และระบบสารสนเทศ
  i_2_1 numeric(5,2), -- ผลสัมฤทธิ์ทางการเรียน
  i_2_2 numeric(5,2), -- ทักษะแห่งอนาคตและทักษะดิจิทัล
  i_2_3 numeric(5,2), -- คุณภาพกระบวนการจัดการเรียนรู้ของครูและโรงเรียน
  i_2_4 numeric(5,2), -- เจตคติต่อการเรียนรู้
  i_2_5 numeric(5,2), -- สุขภาพและพัฒนาการสมวัย
  i_2_6 numeric(5,2), -- การค้นพบความถนัด อาชีพ และแนวทางศึกษาต่อ
  i_3_1 numeric(5,2), -- คุณลักษณะอันพึงประสงค์และความรับผิดชอบต่อความยั่งยืน
  i_3_2 numeric(5,2), -- กระบวนการเสริมสร้างคุณธรรมและจริยธรรม
  -- Pillar conclusion scores 0–100
  pillar_1 numeric(5,2), -- โรงเรียนมีคุณภาพ
  pillar_2 numeric(5,2), -- สำเร็จการศึกษาอย่างมีคุณภาพ
  pillar_3 numeric(5,2), -- สร้างวินัย คุณธรรม/จริยธรรม
  overall numeric(5,2),
  school_year text, -- e.g. '2568'
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_by uuid REFERENCES public.user_profiles (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_school_pillar_year ON public.school_pillar_scores (school_year);

DROP TRIGGER IF EXISTS trg_school_pillar_scores_updated ON public.school_pillar_scores;
CREATE TRIGGER trg_school_pillar_scores_updated
  BEFORE UPDATE ON public.school_pillar_scores
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.school_pillar_scores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pillar_scores_read" ON public.school_pillar_scores;
CREATE POLICY "pillar_scores_read" ON public.school_pillar_scores FOR SELECT USING (true);
DROP POLICY IF EXISTS "pillar_scores_write" ON public.school_pillar_scores;
CREATE POLICY "pillar_scores_write" ON public.school_pillar_scores FOR ALL
  USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_pillar_scores TO anon, authenticated;

COMMENT ON TABLE public.school_pillar_scores IS
  '3-pillar scores 0-100 with indicator detail (1.1–3.2)';

-- ---------------------------------------------------------------------------
-- 3) Reports (field activity comments) — extend tags + report_date
-- ---------------------------------------------------------------------------
ALTER TABLE public.school_staff_comments
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS report_date date,
  ADD COLUMN IF NOT EXISTS edited_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_school_comments_report_date
  ON public.school_staff_comments (report_date DESC NULLS LAST);

COMMENT ON TABLE public.school_staff_comments IS
  'Field reports / school activity comments (replaces cookie mock reports)';

-- ---------------------------------------------------------------------------
-- 4) Tickets (request to modify school data / SWOT)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.data_tickets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id bigint REFERENCES public."School_Basic" (school_id) ON DELETE SET NULL,
  school_name text,
  requester_id uuid REFERENCES public.user_profiles (id) ON DELETE SET NULL,
  requester_name text,
  requester_role text,
  subject text NOT NULL,
  detail text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_progress', 'resolved', 'rejected')),
  admin_note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_data_tickets_status ON public.data_tickets (status);
CREATE INDEX IF NOT EXISTS idx_data_tickets_requester ON public.data_tickets (requester_id);

DROP TRIGGER IF EXISTS trg_data_tickets_updated ON public.data_tickets;
CREATE TRIGGER trg_data_tickets_updated
  BEFORE UPDATE ON public.data_tickets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.data_tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tickets_rw" ON public.data_tickets;
CREATE POLICY "tickets_rw" ON public.data_tickets FOR ALL USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.data_tickets TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5) SWOT — 4 long-text columns (see also 006 for rename + drop *_text)
--    1 Internal: internal_strengths / internal_weaknesses
--    2 External: external_opportunities (→ external_strengths in 006) / external_threats
-- ---------------------------------------------------------------------------
COMMENT ON COLUMN public.school_swot.internal_strengths IS
  '1 สภาพแวดล้อมภายใน · จุดแข็ง — long text';
COMMENT ON COLUMN public.school_swot.internal_weaknesses IS
  '1 สภาพแวดล้อมภายใน · จุดอ่อน — long text';
COMMENT ON COLUMN public.school_swot.external_opportunities IS
  '2 สภาพแวดล้อมภายนอก · จุดแข็ง (legacy name; renamed in 006) — long text';
COMMENT ON COLUMN public.school_swot.external_threats IS
  '2 สภาพแวดล้อมภายนอก · อุปสรรค — long text';

-- ---------------------------------------------------------------------------
-- 6) Schedule already in site_visit_events (003) — ensure empty after truncate
-- ---------------------------------------------------------------------------
COMMENT ON TABLE public.site_visit_events IS
  'Staff calendar / schedule bookings (source of truth; cookie store is fallback only)';

-- ---------------------------------------------------------------------------
-- Done
-- =============================================================================
