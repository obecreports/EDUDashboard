-- =============================================================================
-- ConED · directors.remark
-- Safe to re-run.
-- =============================================================================

ALTER TABLE IF EXISTS public.directors
  ADD COLUMN IF NOT EXISTS remark text;

COMMENT ON COLUMN public.directors.remark IS
  'Free-text note from roster import / admin';
