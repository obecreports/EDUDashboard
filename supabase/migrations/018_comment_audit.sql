-- =============================================================================
-- ConED · Comment audit trail (updated_at / updated_by)
-- UAT: RLS stays disabled / wide GRANT (cookie session, anon key).
-- =============================================================================

ALTER TABLE public.school_staff_comments
  ADD COLUMN IF NOT EXISTS updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES public.user_profiles (id) ON DELETE SET NULL;

COMMENT ON COLUMN public.school_staff_comments.updated_at IS
  'Last modification timestamp (set on edit).';
COMMENT ON COLUMN public.school_staff_comments.updated_by IS
  'User who last modified the comment.';

-- Backfill updated_at from edited_at when present
UPDATE public.school_staff_comments
SET updated_at = edited_at
WHERE edited_at IS NOT NULL
  AND updated_at IS NULL;

ALTER TABLE IF EXISTS public.school_staff_comments DISABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_staff_comments TO anon, authenticated;
