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

-- Migrations/back-compat: older DBs may be missing columns
alter table day_plans add column if not exists slot text not null default 'General';
alter table day_plans add column if not exists visibility text not null default 'private';
alter table day_plans add column if not exists share_token_hash text;
alter table day_plans add column if not exists share_expires_at timestamptz;
alter table day_plans add column if not exists trashed_at timestamptz;

-- Allow multiple plans per day; prevent duplicates per (date, slot, friday_type)
-- Use COALESCE so non-Friday (null friday_type) still participates in uniqueness.
-- Back-compat: older schemas may have an incorrect uniqueness constraint on plan_date alone.
-- Drop it if present.
alter table day_plans drop constraint if exists day_plans_plan_date_uq;
drop index if exists day_plans_plan_date_uq;

create unique index if not exists day_plans_date_slot_friday_uq
  on day_plans(plan_date, slot, ((coalesce(friday_type, ''))));

create index if not exists day_plans_trashed_at_idx on day_plans(trashed_at);

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

-- Seed special "non-course" blocks so they can have TOC templates and be referenced by schedule/rotation.
-- (Safe to run multiple times; only inserts if missing.)
insert into classes (name, room, sort_order, block_label)
select v.name, null, v.sort_order, v.block_label
from (
  values
    ('Flex', 900, 'Flex'),
    ('Career Life Education', 901, 'CLE'),
    ('Lunch', 902, 'Lunch'),
    ('Chapel', 903, 'Chapel')
) as v(name, sort_order, block_label)
where not exists (select 1 from classes c where upper(c.block_label) = upper(v.block_label));

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

-- Helper: staff_role
create or replace function staff_role()
returns text
language sql
stable
as $$
  select sp.role
  from staff_profiles sp
  where sp.user_id = auth.uid()
  limit 1;
$$;

-- Helper: can_write (demo accounts are read-only)
create or replace function can_write()
returns boolean
language sql
stable
as $$
  select is_staff() and coalesce(staff_role(), '') <> 'demo';
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
with check (can_write());

create policy "day_plans_staff_update" on day_plans
for update
using (can_write())
with check (can_write());

create policy "day_plans_staff_delete" on day_plans
for delete
using (can_write());

-- day_plan_blocks: staff CRUD
create policy "blocks_staff_select" on day_plan_blocks
for select
using (is_staff());

create policy "blocks_staff_insert" on day_plan_blocks
for insert
with check (can_write());

create policy "blocks_staff_update" on day_plan_blocks
for update
using (can_write())
with check (can_write());

create policy "blocks_staff_delete" on day_plan_blocks
for delete
using (can_write());

-- classes/students/enrollments: staff read + write (demo users are read-only)

-- students
drop policy if exists "students_staff_all" on students;
create policy "students_staff_select" on students
for select
using (is_staff());
create policy "students_staff_insert" on students
for insert
with check (can_write());
create policy "students_staff_update" on students
for update
using (can_write())
with check (can_write());
create policy "students_staff_delete" on students
for delete
using (can_write());

-- classes
drop policy if exists "classes_staff_all" on classes;
create policy "classes_staff_select" on classes
for select
using (is_staff());
create policy "classes_staff_insert" on classes
for insert
with check (can_write());
create policy "classes_staff_update" on classes
for update
using (can_write())
with check (can_write());
create policy "classes_staff_delete" on classes
for delete
using (can_write());

-- enrollments
drop policy if exists "enrollments_staff_all" on enrollments;
create policy "enrollments_staff_select" on enrollments
for select
using (is_staff());
create policy "enrollments_staff_insert" on enrollments
for insert
with check (can_write());
create policy "enrollments_staff_delete" on enrollments
for delete
using (can_write());

-- ----------------------
-- BLOCK ROTATION DEFAULTS (effective-dated)
-- ----------------------
create table if not exists rotation_defaults (
  id uuid primary key default gen_random_uuid(),
  day_of_week int not null,
  friday_type text,
  slot_order int not null,
  block_label text not null,
  effective_from date not null,
  effective_to date,
  created_at timestamptz not null default now(),
  constraint rotation_dow_check check (day_of_week between 1 and 5),
  constraint rotation_friday_type_check check (friday_type in ('day1','day2') or friday_type is null),
  constraint rotation_friday_type_required check (
    (day_of_week = 5 and friday_type is not null) or (day_of_week <> 5 and friday_type is null)
  ),
  constraint rotation_effective_check check (effective_to is null or effective_to > effective_from)
);

create index if not exists rotation_defaults_lookup_idx
  on rotation_defaults(day_of_week, friday_type, effective_from, effective_to);

create unique index if not exists rotation_defaults_unique_row_idx
  on rotation_defaults(day_of_week, friday_type, effective_from, slot_order);

alter table rotation_defaults enable row level security;

drop policy if exists "rotation_defaults_staff_all" on rotation_defaults;
create policy "rotation_defaults_staff_select" on rotation_defaults
for select using (is_staff());
create policy "rotation_defaults_staff_insert" on rotation_defaults
for insert with check (can_write());
create policy "rotation_defaults_staff_update" on rotation_defaults
for update using (can_write()) with check (can_write());
create policy "rotation_defaults_staff_delete" on rotation_defaults
for delete using (can_write());

-- Public schedule rotation for a given date.
-- SECURITY DEFINER so anon callers can access without opening table RLS.
create or replace function get_rotation_for_date(plan_date date, friday_type text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dow int;
  ft text;
  out jsonb;
begin
  if plan_date is null then
    return '[]'::jsonb;
  end if;

  -- ISO day of week: Monday=1 ... Sunday=7
  dow := extract(isodow from plan_date);

  if dow < 1 or dow > 5 then
    return '[]'::jsonb;
  end if;

  if dow = 5 then
    if friday_type is null then
      return '[]'::jsonb;
    end if;
    ft := friday_type;
  else
    ft := null;
  end if;

  select coalesce(jsonb_agg(r.block_label order by r.slot_order asc), '[]'::jsonb)
  into out
  from rotation_defaults r
  where r.day_of_week = dow
    and ((ft is null and r.friday_type is null) or (ft is not null and r.friday_type = ft))
    and r.effective_from <= plan_date
    and (r.effective_to is null or r.effective_to > plan_date)
  group by r.effective_from
  order by r.effective_from desc
  limit 1;

  return coalesce(out, '[]'::jsonb);
end;
$$;

revoke all on function get_rotation_for_date(date, text) from public;
grant execute on function get_rotation_for_date(date, text) to anon;

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
create policy "block_time_defaults_staff_select" on block_time_defaults
for select
using (is_staff());
create policy "block_time_defaults_staff_insert" on block_time_defaults
for insert
with check (can_write());
create policy "block_time_defaults_staff_update" on block_time_defaults
for update
using (can_write())
with check (can_write());
create policy "block_time_defaults_staff_delete" on block_time_defaults
for delete
using (can_write());

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

-- Template + instance content: staff can read; demo cannot write.

-- class_toc_templates
 drop policy if exists "class_toc_templates_staff_all" on class_toc_templates;
 create policy "class_toc_templates_staff_select" on class_toc_templates
 for select using (is_staff());
 create policy "class_toc_templates_staff_insert" on class_toc_templates
 for insert with check (can_write());
 create policy "class_toc_templates_staff_update" on class_toc_templates
 for update using (can_write()) with check (can_write());
 create policy "class_toc_templates_staff_delete" on class_toc_templates
 for delete using (can_write());

-- class_opening_routine_steps
 drop policy if exists "class_opening_routine_steps_staff_all" on class_opening_routine_steps;
 create policy "class_opening_routine_steps_staff_select" on class_opening_routine_steps
 for select using (is_staff());
 create policy "class_opening_routine_steps_staff_insert" on class_opening_routine_steps
 for insert with check (can_write());
 create policy "class_opening_routine_steps_staff_update" on class_opening_routine_steps
 for update using (can_write()) with check (can_write());
 create policy "class_opening_routine_steps_staff_delete" on class_opening_routine_steps
 for delete using (can_write());

-- class_lesson_flow_phases
 drop policy if exists "class_lesson_flow_phases_staff_all" on class_lesson_flow_phases;
 create policy "class_lesson_flow_phases_staff_select" on class_lesson_flow_phases
 for select using (is_staff());
 create policy "class_lesson_flow_phases_staff_insert" on class_lesson_flow_phases
 for insert with check (can_write());
 create policy "class_lesson_flow_phases_staff_update" on class_lesson_flow_phases
 for update using (can_write()) with check (can_write());
 create policy "class_lesson_flow_phases_staff_delete" on class_lesson_flow_phases
 for delete using (can_write());

-- class_activity_options
 drop policy if exists "class_activity_options_staff_all" on class_activity_options;
 create policy "class_activity_options_staff_select" on class_activity_options
 for select using (is_staff());
 create policy "class_activity_options_staff_insert" on class_activity_options
 for insert with check (can_write());
 create policy "class_activity_options_staff_update" on class_activity_options
 for update using (can_write()) with check (can_write());
 create policy "class_activity_options_staff_delete" on class_activity_options
 for delete using (can_write());

-- class_activity_option_steps
 drop policy if exists "class_activity_option_steps_staff_all" on class_activity_option_steps;
 create policy "class_activity_option_steps_staff_select" on class_activity_option_steps
 for select using (is_staff());
 create policy "class_activity_option_steps_staff_insert" on class_activity_option_steps
 for insert with check (can_write());
 create policy "class_activity_option_steps_staff_update" on class_activity_option_steps
 for update using (can_write()) with check (can_write());
 create policy "class_activity_option_steps_staff_delete" on class_activity_option_steps
 for delete using (can_write());

-- class_what_to_do_if_items
 drop policy if exists "class_what_to_do_if_items_staff_all" on class_what_to_do_if_items;
 create policy "class_what_to_do_if_items_staff_select" on class_what_to_do_if_items
 for select using (is_staff());
 create policy "class_what_to_do_if_items_staff_insert" on class_what_to_do_if_items
 for insert with check (can_write());
 create policy "class_what_to_do_if_items_staff_update" on class_what_to_do_if_items
 for update using (can_write()) with check (can_write());
 create policy "class_what_to_do_if_items_staff_delete" on class_what_to_do_if_items
 for delete using (can_write());

-- toc_block_plans
 drop policy if exists "toc_block_plans_staff_all" on toc_block_plans;
 create policy "toc_block_plans_staff_select" on toc_block_plans
 for select using (is_staff());
 create policy "toc_block_plans_staff_insert" on toc_block_plans
 for insert with check (can_write());
 create policy "toc_block_plans_staff_update" on toc_block_plans
 for update using (can_write()) with check (can_write());
 create policy "toc_block_plans_staff_delete" on toc_block_plans
 for delete using (can_write());

-- toc_opening_routine_steps
 drop policy if exists "toc_opening_routine_steps_staff_all" on toc_opening_routine_steps;
 create policy "toc_opening_routine_steps_staff_select" on toc_opening_routine_steps
 for select using (is_staff());
 create policy "toc_opening_routine_steps_staff_insert" on toc_opening_routine_steps
 for insert with check (can_write());
 create policy "toc_opening_routine_steps_staff_update" on toc_opening_routine_steps
 for update using (can_write()) with check (can_write());
 create policy "toc_opening_routine_steps_staff_delete" on toc_opening_routine_steps
 for delete using (can_write());

-- toc_lesson_flow_phases
 drop policy if exists "toc_lesson_flow_phases_staff_all" on toc_lesson_flow_phases;
 create policy "toc_lesson_flow_phases_staff_select" on toc_lesson_flow_phases
 for select using (is_staff());
 create policy "toc_lesson_flow_phases_staff_insert" on toc_lesson_flow_phases
 for insert with check (can_write());
 create policy "toc_lesson_flow_phases_staff_update" on toc_lesson_flow_phases
 for update using (can_write()) with check (can_write());
 create policy "toc_lesson_flow_phases_staff_delete" on toc_lesson_flow_phases
 for delete using (can_write());

-- toc_activity_options
 drop policy if exists "toc_activity_options_staff_all" on toc_activity_options;
 create policy "toc_activity_options_staff_select" on toc_activity_options
 for select using (is_staff());
 create policy "toc_activity_options_staff_insert" on toc_activity_options
 for insert with check (can_write());
 create policy "toc_activity_options_staff_update" on toc_activity_options
 for update using (can_write()) with check (can_write());
 create policy "toc_activity_options_staff_delete" on toc_activity_options
 for delete using (can_write());

-- toc_activity_option_steps
 drop policy if exists "toc_activity_option_steps_staff_all" on toc_activity_option_steps;
 create policy "toc_activity_option_steps_staff_select" on toc_activity_option_steps
 for select using (is_staff());
 create policy "toc_activity_option_steps_staff_insert" on toc_activity_option_steps
 for insert with check (can_write());
 create policy "toc_activity_option_steps_staff_update" on toc_activity_option_steps
 for update using (can_write()) with check (can_write());
 create policy "toc_activity_option_steps_staff_delete" on toc_activity_option_steps
 for delete using (can_write());

-- toc_what_to_do_if_items
 drop policy if exists "toc_what_to_do_if_items_staff_all" on toc_what_to_do_if_items;
 create policy "toc_what_to_do_if_items_staff_select" on toc_what_to_do_if_items
 for select using (is_staff());
 create policy "toc_what_to_do_if_items_staff_insert" on toc_what_to_do_if_items
 for insert with check (can_write());
 create policy "toc_what_to_do_if_items_staff_update" on toc_what_to_do_if_items
 for update using (can_write()) with check (can_write());
 create policy "toc_what_to_do_if_items_staff_delete" on toc_what_to_do_if_items
 for delete using (can_write());

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

  -- Only return the block that matches this plan's slot (e.g. Block F), not the entire day schedule.
  -- We match via classes.block_label (joined by class_id).
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', b.id,
        'start_time', b.start_time,
        'end_time', b.end_time,
        'room', b.room,
        'class_name', b.class_name,
        'details', b.details,
        'class_id', b.class_id,
        'block_label', c.block_label,
        'students', (
          select coalesce(
            jsonb_agg(
              jsonb_build_object('id', s.id, 'first_name', s.first_name, 'last_name', s.last_name)
              order by s.last_name, s.first_name
            ),
            '[]'::jsonb
          )
          from enrollments e
          join students s on s.id = e.student_id
          where e.class_id = b.class_id
        )
      )
      order by b.start_time asc
    ),
    '[]'::jsonb
  )
  into blocks
  from day_plan_blocks b
  left join classes c on c.id = b.class_id
  where b.day_plan_id = p.id
    and c.block_label is not null
    and upper(c.block_label) = upper(p.slot);

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

-- Public classes (block labels + names) for TOC display.
-- SECURITY DEFINER so anon callers can access without opening table RLS.
create or replace function get_public_classes()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  out jsonb;
begin
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', c.id,
      'block_label', c.block_label,
      'name', c.name,
      'room', c.room,
      'sort_order', c.sort_order
    ) order by c.sort_order asc nulls last, c.name asc), '[]'::jsonb)
  into out
  from classes c
  where c.block_label is not null;

  return out;
end;
$$;

revoke all on function get_public_classes() from public;
grant execute on function get_public_classes() to anon;

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
