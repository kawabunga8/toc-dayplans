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

-- PUBLIC ACCESS NOTE:
-- Public TOC links should be served through a *server-side* route or edge function
-- that validates token + expiry. Do NOT enable anon select on student tables.
