-- Professional Development Goals (Policy)
-- Seeded via CSV in Supabase Storage bucket: professional-development/Pro_Dev_Goals.csv

create extension if not exists pgcrypto;

create table if not exists professional_development_goals (
  id uuid primary key default gen_random_uuid(),
  goal_id text not null,
  goal_description text not null,
  research_focus text null,
  action_taken text null,
  evidence_date text null,
  reflection_notes text null,
  sort_order integer null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists professional_development_goals_sort_order_idx on professional_development_goals(sort_order);

alter table professional_development_goals enable row level security;

drop policy if exists "pdg_staff_select" on professional_development_goals;
drop policy if exists "pdg_staff_insert" on professional_development_goals;
drop policy if exists "pdg_staff_update" on professional_development_goals;
drop policy if exists "pdg_staff_delete" on professional_development_goals;

create policy "pdg_staff_select" on professional_development_goals
for select using (is_staff());

create policy "pdg_staff_insert" on professional_development_goals
for insert with check (can_write());

create policy "pdg_staff_update" on professional_development_goals
for update using (can_write()) with check (can_write());

create policy "pdg_staff_delete" on professional_development_goals
for delete using (can_write());
