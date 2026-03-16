-- Debug events for staff diagnostics

CREATE TABLE IF NOT EXISTS public.debug_events (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  plan_id UUID,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.debug_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "debug_events_staff_select" ON public.debug_events;
CREATE POLICY "debug_events_staff_select"
ON public.debug_events
FOR SELECT
USING (public.is_staff());

DROP POLICY IF EXISTS "debug_events_staff_insert" ON public.debug_events;
CREATE POLICY "debug_events_staff_insert"
ON public.debug_events
FOR INSERT
WITH CHECK (public.is_staff());
