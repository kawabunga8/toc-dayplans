-- Core Competencies taxonomy (Domain -> Sub-Competency -> Facet)

create table if not exists public.core_competency_domains (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint core_competency_domains_unique unique(name)
);

create table if not exists public.core_competency_subcompetencies (
  id uuid primary key default gen_random_uuid(),
  domain_id uuid not null references public.core_competency_domains(id) on delete cascade,
  name text not null,
  sort_order int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint core_competency_subcompetencies_unique unique(domain_id, name)
);

create table if not exists public.core_competency_facets (
  id uuid primary key default gen_random_uuid(),
  subcompetency_id uuid not null references public.core_competency_subcompetencies(id) on delete cascade,
  name text not null,
  sort_order int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint core_competency_facets_unique unique(subcompetency_id, name)
);

create index if not exists core_competency_subcompetencies_domain_idx on public.core_competency_subcompetencies(domain_id);
create index if not exists core_competency_facets_sub_idx on public.core_competency_facets(subcompetency_id);

-- RLS
alter table public.core_competency_domains enable row level security;
alter table public.core_competency_subcompetencies enable row level security;
alter table public.core_competency_facets enable row level security;

-- Policies (requires is_staff() + can_write())
-- Note: Supabase doesn't support CREATE POLICY IF NOT EXISTS, so we drop first for re-runs.

-- domains
drop policy if exists "core_competency_domains_staff_select" on public.core_competency_domains;
drop policy if exists "core_competency_domains_staff_insert" on public.core_competency_domains;
drop policy if exists "core_competency_domains_staff_update" on public.core_competency_domains;
drop policy if exists "core_competency_domains_staff_delete" on public.core_competency_domains;

create policy "core_competency_domains_staff_select" on public.core_competency_domains
for select using (is_staff());
create policy "core_competency_domains_staff_insert" on public.core_competency_domains
for insert with check (can_write());
create policy "core_competency_domains_staff_update" on public.core_competency_domains
for update using (can_write()) with check (can_write());
create policy "core_competency_domains_staff_delete" on public.core_competency_domains
for delete using (can_write());

-- subcompetencies
drop policy if exists "core_competency_subcompetencies_staff_select" on public.core_competency_subcompetencies;
drop policy if exists "core_competency_subcompetencies_staff_insert" on public.core_competency_subcompetencies;
drop policy if exists "core_competency_subcompetencies_staff_update" on public.core_competency_subcompetencies;
drop policy if exists "core_competency_subcompetencies_staff_delete" on public.core_competency_subcompetencies;

create policy "core_competency_subcompetencies_staff_select" on public.core_competency_subcompetencies
for select using (is_staff());
create policy "core_competency_subcompetencies_staff_insert" on public.core_competency_subcompetencies
for insert with check (can_write());
create policy "core_competency_subcompetencies_staff_update" on public.core_competency_subcompetencies
for update using (can_write()) with check (can_write());
create policy "core_competency_subcompetencies_staff_delete" on public.core_competency_subcompetencies
for delete using (can_write());

-- facets
drop policy if exists "core_competency_facets_staff_select" on public.core_competency_facets;
drop policy if exists "core_competency_facets_staff_insert" on public.core_competency_facets;
drop policy if exists "core_competency_facets_staff_update" on public.core_competency_facets;
drop policy if exists "core_competency_facets_staff_delete" on public.core_competency_facets;

create policy "core_competency_facets_staff_select" on public.core_competency_facets
for select using (is_staff());
create policy "core_competency_facets_staff_insert" on public.core_competency_facets
for insert with check (can_write());
create policy "core_competency_facets_staff_update" on public.core_competency_facets
for update using (can_write()) with check (can_write());
create policy "core_competency_facets_staff_delete" on public.core_competency_facets
for delete using (can_write());
