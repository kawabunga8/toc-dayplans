-- Make the TOC's class lookup quarter- and school-year-aware.
--
-- classes holds several rows per block: one per school year, plus quarter-scoped
-- variants (block H is ICT 9 Q1, ICT 9 Q2, then Band 9 in Q3/Q4). active_quarters
-- and school_year already record all of that, but get_public_classes() read
-- neither -- it returned every row and left the caller to pick. The TOC page uses
-- Array.find(), which takes the first, so the winner was decided by
-- (sort_order, name): block B resolved to last year's "Band 10-12" over this
-- year's "Biblical Perspectives 10", and block H would still have claimed ICT 9
-- in March.
--
-- Rows with a null school_year are perennial (CHAPEL, FLEX, LUNCH have only such
-- a row). They are kept as a fallback but must never outrank a row for the
-- current year -- otherwise B would resolve to the stray "Senior Concert Band".
-- Same for null active_quarters, which means "runs all year".
--
-- The zero-argument function has to be dropped first: adding a defaulted
-- parameter creates an overload rather than replacing it, and a no-argument call
-- would keep resolving to the old one.

drop function if exists public.get_public_classes();

create or replace function public.get_public_classes(plan_date date default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  d date := coalesce(plan_date, (now() at time zone 'America/Vancouver')::date);
  q int;
  sy text;
  out jsonb;
begin
  -- Quarter containing the date. Null outside the school year (summer), which
  -- disables quarter filtering rather than returning nothing for G and H.
  select sq.id into q
  from public.school_quarters sq
  where d between sq.start_date and sq.end_date
  order by sq.id
  limit 1;

  -- School-year label, e.g. '2026-27'. July onward belongs to the year starting,
  -- matching the >= 7 threshold used elsewhere in the RCS apps.
  sy := case
    when extract(month from d) >= 7
      then to_char(d, 'YYYY') || '-' || to_char(d + interval '1 year', 'YY')
    else to_char(d - interval '1 year', 'YYYY') || '-' || to_char(d, 'YY')
  end;

  select coalesce(jsonb_agg(jsonb_build_object(
      'id', t.id,
      'block_label', t.block_label,
      'name', t.name,
      'room', t.room,
      'sort_order', t.sort_order
    ) order by t.sort_order asc nulls last, t.name asc), '[]'::jsonb)
  into out
  from (
    -- One row per block. Rows for other school years are excluded outright, so
    -- the ordering below only ever chooses between an exact-year row (true) and
    -- a perennial one (null) -- exact wins.
    select distinct on (c.block_label) c.id, c.block_label, c.name, c.room, c.sort_order
    from public.classes c
    where c.block_label is not null
      and (c.school_year is null or c.school_year = sy)
      and (q is null or c.active_quarters is null or q = any(c.active_quarters))
    order by c.block_label,
             (c.school_year = sy) desc nulls last,
             c.sort_order asc nulls last,
             c.name asc
  ) t;

  return coalesce(out, '[]'::jsonb);
end;
$$;

revoke all on function public.get_public_classes(date) from public;
grant execute on function public.get_public_classes(date) to anon;
