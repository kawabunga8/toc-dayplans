-- Remove legacy materialized TOC cache (no longer used)

-- Functions
DROP FUNCTION IF EXISTS public.get_public_day_plan_from_toc(uuid);
DROP FUNCTION IF EXISTS public.resolve_toc_block_plan_public_payload(uuid);

-- Columns
ALTER TABLE public.toc_block_plans
  DROP COLUMN IF EXISTS public_payload,
  DROP COLUMN IF EXISTS public_updated_at;
