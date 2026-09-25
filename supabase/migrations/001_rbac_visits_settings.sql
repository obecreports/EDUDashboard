-- =============================================================================
-- ConED · Supabase DDL — RBAC / Visits / Site Settings
-- Run in Supabase SQL Editor (once). Requires auth.users from Supabase Auth.
-- Existing production tables (do NOT recreate):
--   School_Basic, School_People, School_Score, Gov_Domain, Label_Lookup
-- =============================================================================

-- 1) user_profiles — linked to auth.users
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email text,
  full_name text,
  position text,
  role text NOT NULL DEFAULT 'global'
    CHECK (role IN ('global', 'staff', 'overseer', 'admin')),
  assigned_zone text, -- e.g. 'KKN-1' → School_Basic.zone / area_id
  avatar_url text,
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles (role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_zone ON public.user_profiles (assigned_zone);

COMMENT ON TABLE public.user_profiles IS 'ConED RBAC profile; role drives middleware & nav';
COMMENT ON COLUMN public.user_profiles.assigned_zone IS 'Maps to School_Basic.zone or area_id for staff scope';

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'global')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Keep updated_at fresh
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_profiles_updated ON public.user_profiles;
CREATE TRIGGER trg_user_profiles_updated
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2) school_visit_logs — fieldwork
-- Note: School_Basic.school_id is bigint in production
CREATE TABLE IF NOT EXISTS public.school_visit_logs (
  id bigserial PRIMARY KEY,
  school_id bigint NOT NULL REFERENCES public."School_Basic" (school_id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES public.user_profiles (id) ON DELETE CASCADE,
  visit_date timestamptz NOT NULL DEFAULT timezone('utc', now()),
  survey_status text NOT NULL DEFAULT 'Pending'
    CHECK (survey_status IN ('Active', 'Surveyed', 'Pending', 'Inactive')),
  notes text,
  photo_urls text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_visit_logs_school ON public.school_visit_logs (school_id);
CREATE INDEX IF NOT EXISTS idx_visit_logs_staff ON public.school_visit_logs (staff_id);
CREATE INDEX IF NOT EXISTS idx_visit_logs_date ON public.school_visit_logs (visit_date DESC);

-- 3) site_settings — admin configuration (key/value jsonb)
CREATE TABLE IF NOT EXISTS public.site_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid REFERENCES public.user_profiles (id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

DROP TRIGGER IF EXISTS trg_site_settings_updated ON public.site_settings;
CREATE TRIGGER trg_site_settings_updated
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.site_settings (key, value) VALUES
  ('site_title', '"ConED · ระบบข้อมูลโรงเรียนในสังกัด"'::jsonb),
  ('hero_text', '"ติดตามจำนวนโรงเรียน นักเรียน บุคลากร และคุณภาพการจัดการศึกษา"'::jsonb),
  ('nav_flags', '{"map":true,"schools":true,"staffHub":true,"calendar":true}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- =============================================================================
-- Row Level Security (recommended baseline)
-- =============================================================================
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_visit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Profiles: users read own; admins read all
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.user_profiles;
CREATE POLICY "profiles_select_own_or_admin" ON public.user_profiles
  FOR SELECT USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM public.user_profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "profiles_update_own_or_admin" ON public.user_profiles;
CREATE POLICY "profiles_update_own_or_admin" ON public.user_profiles
  FOR UPDATE USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM public.user_profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Visits: staff see own; overseer/admin see all; staff insert own
DROP POLICY IF EXISTS "visits_select_scoped" ON public.school_visit_logs;
CREATE POLICY "visits_select_scoped" ON public.school_visit_logs
  FOR SELECT USING (
    staff_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_profiles p
      WHERE p.id = auth.uid() AND p.role IN ('overseer', 'admin')
    )
  );

DROP POLICY IF EXISTS "visits_insert_staff" ON public.school_visit_logs;
CREATE POLICY "visits_insert_staff" ON public.school_visit_logs
  FOR INSERT WITH CHECK (
    staff_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.user_profiles p
      WHERE p.id = auth.uid() AND p.role IN ('staff', 'overseer', 'admin')
    )
  );

-- Site settings: public read; admin write
DROP POLICY IF EXISTS "settings_select_all" ON public.site_settings;
CREATE POLICY "settings_select_all" ON public.site_settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "settings_write_admin" ON public.site_settings;
CREATE POLICY "settings_write_admin" ON public.site_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Optional: allow anon read of School_* already configured in your project.
-- Grant usage for authenticated role
GRANT SELECT, UPDATE ON public.user_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.school_visit_logs TO authenticated;
GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.site_settings TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.school_visit_logs_id_seq TO authenticated;
