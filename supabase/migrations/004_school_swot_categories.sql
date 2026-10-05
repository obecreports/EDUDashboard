-- =============================================================================
-- ConED · school_swot categories JSONB (per-category Strengths / Weaknesses)
-- =============================================================================

ALTER TABLE public.school_swot
  ADD COLUMN IF NOT EXISTS categories jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.school_swot.categories IS
  'Structured SWOT: { internal: { students|management|personnel|curriculum|infrastructure: { strengths, weaknesses } }, external: { social|economic|environmental: { strengths, weaknesses } } }';

-- Optional: keep legacy text columns for backwards compatibility / migration
-- internal_strengths, internal_weaknesses, external_opportunities, external_threats remain.
