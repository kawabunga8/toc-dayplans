-- ============================================================
-- Student Data Tool Migration
-- Run this in the Supabase SQL editor once.
-- All statements use IF NOT EXISTS / ADD COLUMN IF NOT EXISTS
-- so it is safe to run more than once.
-- ============================================================

-- ── 1. Extra columns on public.students ─────────────────────
-- (These columns already exist on the shared RCS project;
--  ADD COLUMN IF NOT EXISTS is a no-op when they're already there.)

alter table students
  add column if not exists student_number text,
  add column if not exists grade_year     int,
  add column if not exists gender         text;   -- 'male' | 'female' | 'non-binary' | null

-- ── 2. Student notes ────────────────────────────────────────
create table if not exists student_notes (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references students(id) on delete cascade,
  note        text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── 3. Student marks ────────────────────────────────────────
create table if not exists student_marks (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references students(id) on delete cascade,
  class_id    uuid references classes(id) on delete set null,
  subject     text not null,
  mark        text not null,   -- e.g. "A", "87%", "Proficient"
  quarter     int,             -- 1–4
  note        text,
  created_at  timestamptz not null default now()
);

-- ── 4. RLS policies ─────────────────────────────────────────

alter table student_notes enable row level security;
alter table student_marks enable row level security;

-- student_notes: staff read + write; demo users read-only
drop policy if exists "student_notes_staff_select" on student_notes;
create policy "student_notes_staff_select" on student_notes
  for select using (is_staff());

drop policy if exists "student_notes_staff_insert" on student_notes;
create policy "student_notes_staff_insert" on student_notes
  for insert with check (can_write());

drop policy if exists "student_notes_staff_update" on student_notes;
create policy "student_notes_staff_update" on student_notes
  for update using (can_write());

drop policy if exists "student_notes_staff_delete" on student_notes;
create policy "student_notes_staff_delete" on student_notes
  for delete using (can_write());

-- student_marks: staff read + write; demo users read-only
drop policy if exists "student_marks_staff_select" on student_marks;
create policy "student_marks_staff_select" on student_marks
  for select using (is_staff());

drop policy if exists "student_marks_staff_insert" on student_marks;
create policy "student_marks_staff_insert" on student_marks
  for insert with check (can_write());

drop policy if exists "student_marks_staff_update" on student_marks;
create policy "student_marks_staff_update" on student_marks
  for update using (can_write());

drop policy if exists "student_marks_staff_delete" on student_marks;
create policy "student_marks_staff_delete" on student_marks
  for delete using (can_write());
