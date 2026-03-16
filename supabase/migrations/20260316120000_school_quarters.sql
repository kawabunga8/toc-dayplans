-- School quarters table: editable Q1-Q4 date ranges
create table if not exists school_quarters (
  id int primary key check (id between 1 and 4),
  label text not null default '',
  start_date date not null,
  end_date date not null
);

-- Seed default quarters (update via admin)
insert into school_quarters (id, label, start_date, end_date) values
  (1, 'Q1', '2025-09-02', '2025-10-31'),
  (2, 'Q2', '2025-11-03', '2026-01-23'),
  (3, 'Q3', '2026-01-26', '2026-03-20'),
  (4, 'Q4', '2026-03-23', '2026-06-20')
on conflict (id) do nothing;

-- RLS
alter table school_quarters enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'school_quarters' and policyname = 'Staff can read quarters'
  ) then
    create policy "Staff can read quarters" on school_quarters for select using (is_staff());
  end if;
  if not exists (
    select 1 from pg_policies where tablename = 'school_quarters' and policyname = 'Staff can update quarters'
  ) then
    create policy "Staff can update quarters" on school_quarters for update using (is_staff());
  end if;
end $$;

-- Add active_quarters to classes (null = all year; array of quarter ids = specific quarters)
alter table classes add column if not exists active_quarters int[] default null;
