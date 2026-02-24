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
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint friday_type_check check (friday_type in ('day1','day2') or friday_type is null)
);

-- Allow multiple plans per day; prevent duplicates per (date, slot, friday_type)
-- Use COALESCE so non-Friday (null friday_type) still participates in uniqueness.
create unique index if not exists day_plans_date_slot_friday_uq
  on day_plans(plan_date, slot, ((coalesce(friday_type, ''))));

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

create index if not exists classes_sort_order_idx on classes(sort_order);

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
create policy "staff_profiles_self_read" on staff_profiles
for select
using (auth.uid() = user_id);

-- day_plans: staff CRUD
create policy "day_plans_staff_select" on day_plans
for select
using (is_staff());

create policy "day_plans_staff_insert" on day_plans
for insert
with check (is_staff());

create policy "day_plans_staff_update" on day_plans
for update
using (is_staff())
with check (is_staff());

create policy "day_plans_staff_delete" on day_plans
for delete
using (is_staff());

-- day_plan_blocks: staff CRUD
create policy "blocks_staff_select" on day_plan_blocks
for select
using (is_staff());

create policy "blocks_staff_insert" on day_plan_blocks
for insert
with check (is_staff());

create policy "blocks_staff_update" on day_plan_blocks
for update
using (is_staff())
with check (is_staff());

create policy "blocks_staff_delete" on day_plan_blocks
for delete
using (is_staff());

-- classes/students/enrollments: staff CRUD (tighten later if needed)
create policy "students_staff_all" on students
for all
using (is_staff())
with check (is_staff());

create policy "classes_staff_all" on classes
for all
using (is_staff())
with check (is_staff());

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

-- Per scheduled block (plan instance). Copy-on-create from template is recommended.
create table if not exists toc_block_plans (
  id uuid primary key default gen_random_uuid(),
  day_plan_block_id uuid not null references day_plan_blocks(id) on delete cascade,
  class_id uuid not null references classes(id) on delete restrict,
  template_id uuid references class_toc_templates(id) on delete set null,
  plan_mode text not null,
  override_teacher_name text,
  override_ta_name text,
  override_ta_role text,
  override_phone_policy text,
  override_note_to_toc text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint toc_block_plans_plan_mode_check check (plan_mode in ('lesson_flow','activity_options'))
);

-- NOTE: toc_block_plans.class_id should match day_plan_blocks.class_id.
create unique index if not exists toc_block_plans_day_plan_block_id_uq on toc_block_plans(day_plan_block_id);
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

create policy "class_toc_templates_staff_all" on class_toc_templates
for all
using (is_staff())
with check (is_staff());

create policy "class_opening_routine_steps_staff_all" on class_opening_routine_steps
for all
using (is_staff())
with check (is_staff());

create policy "class_lesson_flow_phases_staff_all" on class_lesson_flow_phases
for all
using (is_staff())
with check (is_staff());

create policy "class_activity_options_staff_all" on class_activity_options
for all
using (is_staff())
with check (is_staff());

create policy "class_activity_option_steps_staff_all" on class_activity_option_steps
for all
using (is_staff())
with check (is_staff());

create policy "class_what_to_do_if_items_staff_all" on class_what_to_do_if_items
for all
using (is_staff())
with check (is_staff());

create policy "toc_block_plans_staff_all" on toc_block_plans
for all
using (is_staff())
with check (is_staff());

create policy "toc_opening_routine_steps_staff_all" on toc_opening_routine_steps
for all
using (is_staff())
with check (is_staff());

create policy "toc_lesson_flow_phases_staff_all" on toc_lesson_flow_phases
for all
using (is_staff())
with check (is_staff());

create policy "toc_activity_options_staff_all" on toc_activity_options
for all
using (is_staff())
with check (is_staff());

create policy "toc_activity_option_steps_staff_all" on toc_activity_option_steps
for all
using (is_staff())
with check (is_staff());

create policy "toc_what_to_do_if_items_staff_all" on toc_what_to_do_if_items
for all
using (is_staff())
with check (is_staff());

-- PUBLIC ACCESS NOTE:
-- Public TOC links should be served through a *server-side* route or edge function
-- that validates token + expiry. Do NOT enable anon select on student tables.
