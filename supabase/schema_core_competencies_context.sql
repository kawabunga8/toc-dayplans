-- Add example_context tags to core competency facets

alter table public.core_competency_facets
  add column if not exists example_context text[] not null default '{}'::text[];

create index if not exists core_competency_facets_example_context_gin
  on public.core_competency_facets using gin (example_context);
