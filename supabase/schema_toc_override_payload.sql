-- Add JSON override payload to toc_block_plans for atomic day overrides
-- This is the new architecture path for TOC day overrides.

alter table if exists toc_block_plans
add column if not exists override_payload jsonb;

-- Optional: index for containment queries / debugging
create index if not exists toc_block_plans_override_payload_gin_idx
on toc_block_plans using gin (override_payload);
