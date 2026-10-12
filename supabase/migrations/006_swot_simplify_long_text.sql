-- =============================================================================
-- ConED · Simplify SWOT to 4 long-text columns (drop *_text duplicates)
--
-- สภาพแวดล้อมภายใน
--   internal_strengths  = จุดแข็ง
--   internal_weaknesses = จุดอ่อน
-- สภาพแวดล้อมภายนอก
--   external_strengths  = จุดแข็ง  (renamed from external_opportunities)
--   external_threats    = อุปสรรค
-- =============================================================================

-- 1) Merge any *_text content into the base columns before dropping
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'school_swot'
      AND column_name = 'internal_strengths_text'
  ) THEN
    UPDATE public.school_swot SET
      internal_strengths = COALESCE(
        NULLIF(BTRIM(internal_strengths_text), ''),
        internal_strengths
      ),
      internal_weaknesses = COALESCE(
        NULLIF(BTRIM(internal_weaknesses_text), ''),
        internal_weaknesses
      ),
      external_opportunities = COALESCE(
        NULLIF(BTRIM(external_strengths_text), ''),
        external_opportunities
      ),
      external_threats = COALESCE(
        NULLIF(BTRIM(external_threats_text), ''),
        external_threats
      )
    WHERE true;
  END IF;
END $$;

-- 2) Rename external_opportunities → external_strengths (จุดแข็งภายนอก)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'school_swot'
      AND column_name = 'external_opportunities'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'school_swot'
      AND column_name = 'external_strengths'
  ) THEN
    ALTER TABLE public.school_swot
      RENAME COLUMN external_opportunities TO external_strengths;
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'school_swot'
      AND column_name = 'external_opportunities'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'school_swot'
      AND column_name = 'external_strengths'
  ) THEN
    UPDATE public.school_swot SET
      external_strengths = COALESCE(
        NULLIF(BTRIM(external_strengths), ''),
        external_opportunities
      )
    WHERE true;
    ALTER TABLE public.school_swot DROP COLUMN external_opportunities;
  END IF;
END $$;

-- Ensure external_strengths exists even on fresh DBs that somehow skipped rename
ALTER TABLE public.school_swot
  ADD COLUMN IF NOT EXISTS external_strengths text;

-- 3) Drop duplicate *_text columns
ALTER TABLE public.school_swot DROP COLUMN IF EXISTS internal_strengths_text;
ALTER TABLE public.school_swot DROP COLUMN IF EXISTS internal_weaknesses_text;
ALTER TABLE public.school_swot DROP COLUMN IF EXISTS external_strengths_text;
ALTER TABLE public.school_swot DROP COLUMN IF EXISTS external_threats_text;

-- 4) Column comments (canonical long-text SWOT)
COMMENT ON COLUMN public.school_swot.internal_strengths IS
  '1 สภาพแวดล้อมภายใน · 1.1 จุดแข็ง (Strengths) — long text';
COMMENT ON COLUMN public.school_swot.internal_weaknesses IS
  '1 สภาพแวดล้อมภายใน · 1.2 จุดอ่อน (Weaknesses) — long text';
COMMENT ON COLUMN public.school_swot.external_strengths IS
  '2 สภาพแวดล้อมภายนอก · 2.1 จุดแข็ง (Strengths) — long text';
COMMENT ON COLUMN public.school_swot.external_threats IS
  '2 สภาพแวดล้อมภายนอก · 2.2 อุปสรรค (Threats) — long text';

COMMENT ON TABLE public.school_swot IS
  'SWOT long text per school: internal S/W + external S/Threats';
