-- Link staff reports to calendar schedule events
ALTER TABLE public.school_staff_comments
  ADD COLUMN IF NOT EXISTS calendar_event_id text;

CREATE INDEX IF NOT EXISTS idx_school_comments_calendar_event
  ON public.school_staff_comments (calendar_event_id)
  WHERE calendar_event_id IS NOT NULL;

COMMENT ON COLUMN public.school_staff_comments.calendar_event_id IS
  'Optional FK-ish to site_visits / cookie calendar event id — report must map to a schedule';
