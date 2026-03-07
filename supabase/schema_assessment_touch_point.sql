-- Standards-Based Assessment Touch Point

-- Template-level
alter table public.class_toc_templates
  add column if not exists assessment_touch_point jsonb;

-- Dayplan-level override (per toc_block_plan)
alter table public.toc_block_plans
  add column if not exists override_assessment_touch_point jsonb;

-- (Optional) default empty objects
update public.class_toc_templates
set assessment_touch_point = coalesce(assessment_touch_point, '{}'::jsonb)
where assessment_touch_point is null;

update public.toc_block_plans
set override_assessment_touch_point = coalesce(override_assessment_touch_point, '{}'::jsonb)
where override_assessment_touch_point is null;
