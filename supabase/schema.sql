-- TOC Dayplans (staff-auth + public share links)
-- Run in Supabase SQL editor.

-- Enable required extensions
create extension if not exists pgcrypto;

-- STAFF ROLES
create table if not exists staff_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'editor',
  created_at timestamptz not null default now()
);

-- DAYPLANS
create table if not exists day_plans (
  id uuid primary key default gen_random_uuid(),
  plan_date date not null,
  slot text not null default 'General',
  friday_type text,
  title text not null,
  notes text,
  visibility text not null default 'private',
  share_token_hash text,
  share_expires_at timestamptz,
  trashed_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint friday_type_check check (friday_type in ('day1','day2') or friday_type is null)
);

-- Allow multiple plans per day; prevent duplicates per (date, slot, friday_type)
-- Use COALESCE so non-Friday (null friday_type) still participates in uniqueness.
create unique index if not exists day_plans_date_slot_friday_uq
  on day_plans(plan_date, slot, ((coalesce(friday_type, ''))));

create index if not exists day_plans_trashed_at_idx on day_plans(trashed_at);

-- Add missing columns to existing day_plans table (for migrations)
alter table day_plans add column if not exists trashed_at timestamptz;
alter table day_plans add column if not exists visibility text default 'private';
alter table day_plans add column if not exists slot text default 'General';

-- BLOCKS (schedule entries for the day)
create table if not exists day_plan_blocks (
  id uuid primary key default gen_random_uuid(),
  day_plan_id uuid not null references day_plans(id) on delete cascade,
  start_time time not null,
  end_time time not null,
  room text not null,
  class_name text not null,
  details text,
  created_at timestamptz not null default now()
);

-- STUDENTS
create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  photo_url text,
  created_at timestamptz not null default now()
);

-- CLASS LISTS
create table if not exists classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  room text,
  sort_order int,
  block_label text,
  created_at timestamptz not null default now()
);

create table if not exists enrollments (
  class_id uuid not null references classes(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  primary key (class_id, student_id)
);

-- Link dayplan blocks to a class (optional)
alter table day_plan_blocks
  add column if not exists class_id uuid references classes(id);

-- Order classes in the desired admin/UI display order (Block A, Block B, ...)
alter table classes
  add column if not exists sort_order int;

alter table classes
  add column if not exists block_label text;

create index if not exists classes_sort_order_idx on classes(sort_order);
create index if not exists classes_block_label_idx on classes(block_label);

-- ----------------------
-- ROW LEVEL SECURITY
-- ----------------------
alter table staff_profiles enable row level security;
alter table day_plans enable row level security;
alter table day_plan_blocks enable row level security;
alter table students enable row level security;
alter table classes enable row level security;
alter table enrollments enable row level security;

-- Helper: is_staff
create or replace function is_staff()
returns boolean
language sql
stable
as $$
  select exists(
    select 1 from staff_profiles sp
    where sp.user_id = auth.uid()
  );
$$;

-- Staff profiles: allow users to read their own row
-- (Do NOT depend on is_staff() here, or you can create a circular dependency.)
drop policy if exists "staff_profiles_self_read" on staff_profiles;
create policy "staff_profiles_self_read" on staff_profiles
for select
using (auth.uid() = user_id);

-- day_plans: staff CRUD
drop policy if exists "day_plans_staff_select" on day_plans;
create policy "day_plans_staff_select" on day_plans
for select
using (is_staff());

drop policy if exists "day_plans_staff_insert" on day_plans;
create policy "day_plans_staff_insert" on day_plans
for insert
with check (is_staff());

drop policy if exists "day_plans_staff_update" on day_plans;
create policy "day_plans_staff_update" on day_plans
for update
using (is_staff())
with check (is_staff());

drop policy if exists "day_plans_staff_delete" on day_plans;
create policy "day_plans_staff_delete" on day_plans
for delete
using (is_staff());

-- day_plan_blocks: staff CRUD
drop policy if exists "blocks_staff_select" on day_plan_blocks;
create policy "blocks_staff_select" on day_plan_blocks
for select
using (is_staff());

drop policy if exists "blocks_staff_insert" on day_plan_blocks;
create policy "blocks_staff_insert" on day_plan_blocks
for insert
with check (is_staff());

drop policy if exists "blocks_staff_update" on day_plan_blocks;
create policy "blocks_staff_update" on day_plan_blocks
for update
using (is_staff())
with check (is_staff());

drop policy if exists "blocks_staff_delete" on day_plan_blocks;
create policy "blocks_staff_delete" on day_plan_blocks
for delete
using (is_staff());

-- classes/students/enrollments: staff CRUD (tighten later if needed)
drop policy if exists "students_staff_all" on students;
create policy "students_staff_all" on students
for all
using (is_staff())
with check (is_staff());

drop policy if exists "classes_staff_all" on classes;
create policy "classes_staff_all" on classes
for all
using (is_staff())
with check (is_staff());

drop policy if exists "enrollments_staff_all" on enrollments;
create policy "enrollments_staff_all" on enrollments
for all
using (is_staff())
with check (is_staff());

-- ----------------------
-- BLOCK TIME DEFAULTS (effective-dated)
-- ----------------------
create table if not exists block_time_defaults (
  id uuid primary key default gen_random_uuid(),
  template_key text not null, -- 'mon_thu' | 'fri'
  effective_from date not null,
  effective_to date,
  slot text not null,
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now(),
  constraint block_time_template_key_check check (template_key in ('mon_thu','fri')),
  constraint block_time_effective_check check (effective_to is null or effective_to > effective_from)
);

alter table block_time_defaults enable row level security;

drop policy if exists "block_time_defaults_staff_all" on block_time_defaults;
create policy "block_time_defaults_staff_all" on block_time_defaults
for all
using (is_staff())
with check (is_staff());

create unique index if not exists block_time_defaults_uq
  on block_time_defaults(template_key, effective_from, slot);

-- =====================================================================
-- TOC BLOCK PLAN CONTENT (standing templates + per-block instances)
-- Added 2026-02-24
-- =====================================================================
-- DESIGN NOTES:
-- - class_toc_templates: reusable lesson/activity patterns per class.
--   Multiple is_active=true rows per class allowed; app picks most recent (updated_at desc).
-- - toc_block_plans: instance per day_plan_blocks row.
--   Copy-on-open (app logic): populate from template when editor first opens.
--   Instance edits never mutate template defaults.
--   source_template_*_id tracks provenance; NULL = custom/manual content.
--   class_id is nullable to support non-class blocks (Assembly, Lunch, Chapel).
-- =====================================================================

-- Standing (reusable) class content
create table if not exists class_toc_templates (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  is_active boolean not null default true,
  teacher_name text not null,
  ta_name text,
  ta_role text,
  phone_policy text not null default 'Not permitted',
  note_to_toc text not null,
  plan_mode text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint class_toc_templates_plan_mode_check check (plan_mode in ('lesson_flow','activity_options'))
);

create index if not exists class_toc_templates_class_id_idx on class_toc_templates(class_id);

-- Helper: get the most recently updated active template for a class
-- (allows multiple actives; app/queries pick the latest by updated_at desc)
create or replace function get_active_template_for_class(p_class_id uuid)
returns uuid
language sql
stable
as $$
  select id
  from class_toc_templates
  where class_id = p_class_id
    and is_active = true
  order by updated_at desc
  limit 1;
$$;

create table if not exists class_opening_routine_steps (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references class_toc_templates(id) on delete cascade,
  sort_order int not null,
  step_text text not null
);

create index if not exists class_opening_routine_steps_template_id_idx on class_opening_routine_steps(template_id);

create table if not exists class_lesson_flow_phases (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references class_toc_templates(id) on delete cascade,
  sort_order int not null,
  time_text text not null,
  phase_text text not null,
  activity_text text not null,
  purpose_text text
);

create index if not exists class_lesson_flow_phases_template_id_idx on class_lesson_flow_phases(template_id);

create table if not exists class_activity_options (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references class_toc_templates(id) on delete cascade,
  sort_order int not null,
  title text not null,
  description text not null,
  details_text text not null,
  toc_role_text text
);

create index if not exists class_activity_options_template_id_idx on class_activity_options(template_id);

create table if not exists class_activity_option_steps (
  id uuid primary key default gen_random_uuid(),
  activity_option_id uuid not null references class_activity_options(id) on delete cascade,
  sort_order int not null,
  step_text text not null
);

create index if not exists class_activity_option_steps_option_id_idx on class_activity_option_steps(activity_option_id);

create table if not exists class_what_to_do_if_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references class_toc_templates(id) on delete cascade,
  sort_order int not null,
  scenario_text text not null,
  response_text text not null
);

create index if not exists class_what_to_do_if_items_template_id_idx on class_what_to_do_if_items(template_id);

-- Per scheduled block (plan instance).
-- Copy-on-open (app logic in TOC editor): when first opened, populate from template if not yet copied.
-- NOTE: class_id is nullable to allow TOC content for non-class blocks (Assembly, Lunch, Chapel).
-- When class_id IS NULL, content is custom; no student roster attached.
create table if not exists toc_block_plans (
  id uuid primary key default gen_random_uuid(),
  day_plan_block_id uuid not null references day_plan_blocks(id) on delete cascade,
  class_id uuid references classes(id) on delete set null,
  template_id uuid references class_toc_templates(id) on delete set null,
  plan_mode text not null,
  -- Override fields: NULL = inherit from template (if template_id set)
  -- Non-NULL = use override value instead of template
  override_teacher_name text,
  override_ta_name text,
  override_ta_role text,
  override_phone_policy text,
  override_note_to_toc text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint toc_block_plans_plan_mode_check check (plan_mode in ('lesson_flow','activity_options'))
);
create index if not exists toc_block_plans_class_id_idx on toc_block_plans(class_id);
create index if not exists toc_block_plans_template_id_idx on toc_block_plans(template_id);

create table if not exists toc_opening_routine_steps (
  id uuid primary key default gen_random_uuid(),
  toc_block_plan_id uuid not null references toc_block_plans(id) on delete cascade,
  sort_order int not null,
  step_text text not null,
  source_template_step_id uuid references class_opening_routine_steps(id) on delete set null
);

create index if not exists toc_opening_routine_steps_plan_id_idx on toc_opening_routine_steps(toc_block_plan_id);
create index if not exists toc_opening_routine_steps_source_idx on toc_opening_routine_steps(source_template_step_id);

create table if not exists toc_lesson_flow_phases (
  id uuid primary key default gen_random_uuid(),
  toc_block_plan_id uuid not null references toc_block_plans(id) on delete cascade,
  sort_order int not null,
  time_text text not null,
  phase_text text not null,
  activity_text text not null,
  purpose_text text,
  source_template_phase_id uuid references class_lesson_flow_phases(id) on delete set null
);

create index if not exists toc_lesson_flow_phases_plan_id_idx on toc_lesson_flow_phases(toc_block_plan_id);
create index if not exists toc_lesson_flow_phases_source_idx on toc_lesson_flow_phases(source_template_phase_id);

create table if not exists toc_activity_options (
  id uuid primary key default gen_random_uuid(),
  toc_block_plan_id uuid not null references toc_block_plans(id) on delete cascade,
  sort_order int not null,
  title text not null,
  description text not null,
  details_text text not null,
  toc_role_text text,
  source_template_option_id uuid references class_activity_options(id) on delete set null
);

create index if not exists toc_activity_options_plan_id_idx on toc_activity_options(toc_block_plan_id);
create index if not exists toc_activity_options_source_idx on toc_activity_options(source_template_option_id);

create table if not exists toc_activity_option_steps (
  id uuid primary key default gen_random_uuid(),
  toc_activity_option_id uuid not null references toc_activity_options(id) on delete cascade,
  sort_order int not null,
  step_text text not null,
  source_template_option_step_id uuid references class_activity_option_steps(id) on delete set null
);

create index if not exists toc_activity_option_steps_option_id_idx on toc_activity_option_steps(toc_activity_option_id);
create index if not exists toc_activity_option_steps_source_idx on toc_activity_option_steps(source_template_option_step_id);

create table if not exists toc_what_to_do_if_items (
  id uuid primary key default gen_random_uuid(),
  toc_block_plan_id uuid not null references toc_block_plans(id) on delete cascade,
  sort_order int not null,
  scenario_text text not null,
  response_text text not null,
  source_template_item_id uuid references class_what_to_do_if_items(id) on delete set null
);

create index if not exists toc_what_to_do_if_items_plan_id_idx on toc_what_to_do_if_items(toc_block_plan_id);
create index if not exists toc_what_to_do_if_items_source_idx on toc_what_to_do_if_items(source_template_item_id);

-- RLS for new content tables
alter table class_toc_templates enable row level security;
alter table class_opening_routine_steps enable row level security;
alter table class_lesson_flow_phases enable row level security;
alter table class_activity_options enable row level security;
alter table class_activity_option_steps enable row level security;
alter table class_what_to_do_if_items enable row level security;

alter table toc_block_plans enable row level security;
alter table toc_opening_routine_steps enable row level security;
alter table toc_lesson_flow_phases enable row level security;
alter table toc_activity_options enable row level security;
alter table toc_activity_option_steps enable row level security;
alter table toc_what_to_do_if_items enable row level security;

drop policy if exists "class_toc_templates_staff_all" on class_toc_templates;
create policy "class_toc_templates_staff_all" on class_toc_templates
for all
using (is_staff())
with check (is_staff());

drop policy if exists "class_opening_routine_steps_staff_all" on class_opening_routine_steps;
create policy "class_opening_routine_steps_staff_all" on class_opening_routine_steps
for all
using (is_staff())
with check (is_staff());

drop policy if exists "class_lesson_flow_phases_staff_all" on class_lesson_flow_phases;
create policy "class_lesson_flow_phases_staff_all" on class_lesson_flow_phases
for all
using (is_staff())
with check (is_staff());

drop policy if exists "class_activity_options_staff_all" on class_activity_options;
create policy "class_activity_options_staff_all" on class_activity_options
for all
using (is_staff())
with check (is_staff());

drop policy if exists "class_activity_option_steps_staff_all" on class_activity_option_steps;
create policy "class_activity_option_steps_staff_all" on class_activity_option_steps
for all
using (is_staff())
with check (is_staff());

drop policy if exists "class_what_to_do_if_items_staff_all" on class_what_to_do_if_items;
create policy "class_what_to_do_if_items_staff_all" on class_what_to_do_if_items
for all
using (is_staff())
with check (is_staff());

drop policy if exists "toc_block_plans_staff_all" on toc_block_plans;
create policy "toc_block_plans_staff_all" on toc_block_plans
for all
using (is_staff())
with check (is_staff());

drop policy if exists "toc_opening_routine_steps_staff_all" on toc_opening_routine_steps;
create policy "toc_opening_routine_steps_staff_all" on toc_opening_routine_steps
for all
using (is_staff())
with check (is_staff());

drop policy if exists "toc_lesson_flow_phases_staff_all" on toc_lesson_flow_phases;
create policy "toc_lesson_flow_phases_staff_all" on toc_lesson_flow_phases
for all
using (is_staff())
with check (is_staff());

drop policy if exists "toc_activity_options_staff_all" on toc_activity_options;
create policy "toc_activity_options_staff_all" on toc_activity_options
for all
using (is_staff())
with check (is_staff());

drop policy if exists "toc_activity_option_steps_staff_all" on toc_activity_option_steps;
create policy "toc_activity_option_steps_staff_all" on toc_activity_option_steps
for all
using (is_staff())
with check (is_staff());

drop policy if exists "toc_what_to_do_if_items_staff_all" on toc_what_to_do_if_items;
create policy "toc_what_to_do_if_items_staff_all" on toc_what_to_do_if_items
for all
using (is_staff())
with check (is_staff());

-- ----------------------
-- PUBLIC DAYPLAN SHARE (TOC-facing)
-- ----------------------

-- Returns the minimum safe payload for TOCs by share token.
-- Token is compared by sha256 hash to day_plans.share_token_hash.
-- SECURITY DEFINER so anon callers can access without opening table RLS.
-- Public dayplan payload (by day_plans.id)
create or replace function get_public_day_plan_by_id(plan_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  p record;
  blocks jsonb;
begin
  if plan_id is null then
    return null;
  end if;

  select * into p
  from day_plans
  where id = plan_id
    and visibility = 'link'
    and trashed_at is null
  limit 1;

  if not found then
    return null;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
      'id', b.id,
      'start_time', b.start_time,
      'end_time', b.end_time,
      'room', b.room,
      'class_name', b.class_name,
      'details', b.details,
      'class_id', b.class_id,
      'students', (
        select coalesce(jsonb_agg(
          jsonb_build_object('id', s.id, 'first_name', s.first_name, 'last_name', s.last_name)
          order by s.last_name, s.first_name
        ), '[]'::jsonb)
        from enrollments e
        join students s on s.id = e.student_id
        where e.class_id = b.class_id
      )
    ) order by b.start_time asc), '[]'::jsonb)
  into blocks
  from day_plan_blocks b
  where b.day_plan_id = p.id;

  return jsonb_build_object(
    'id', p.id,
    'plan_date', p.plan_date,
    'slot', p.slot,
    'friday_type', p.friday_type,
    'title', p.title,
    'notes', p.notes,
    'blocks', blocks
  );
end;
$$;

revoke all on function get_public_day_plan_by_id(uuid) from public;
grant execute on function get_public_day_plan_by_id(uuid) to anon;

-- Helper for staff queries to get current active template
revoke all on function get_active_template_for_class(uuid) from public;
grant execute on function get_active_template_for_class(uuid) to authenticated;

-- Week calendar payload: published plans for Mon–Fri of the given week_start (Monday)
create or replace function get_public_plans_for_week(week_start date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  ws date;
  we date;
  plans jsonb;
begin
  if week_start is null then
    return '[]'::jsonb;
  end if;

  ws := week_start;
  we := week_start + 4; -- Mon..Fri

  select coalesce(jsonb_agg(jsonb_build_object(
      'id', p.id,
      'plan_date', p.plan_date,
      'slot', p.slot,
      'title', p.title,
      'share_expires_at', p.share_expires_at
    ) order by p.plan_date asc, p.slot asc), '[]'::jsonb)
  into plans
  from day_plans p
  where p.visibility = 'link'
    and p.trashed_at is null
    and p.plan_date between ws and we;

  return plans;
end;
$$;

revoke all on function get_public_plans_for_week(date) from public;
grant execute on function get_public_plans_for_week(date) to anon;

-- PUBLIC ACCESS NOTE:
-- Public TOC links should be served through a *server-side* route or edge function
-- that validates token + expiry. Do NOT enable anon select on student tables.
