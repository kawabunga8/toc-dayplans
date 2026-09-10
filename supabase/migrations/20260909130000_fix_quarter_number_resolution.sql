-- Fix: resolve the quarter NUMBER, not school_quarters.id.
--
-- 20260909120000 assumed school_quarters.id was 1-4, matching the seed in this
-- repo's own migration (which even carries a check constraint saying so). The
-- live table is owned by Course Hub and uses a different id scheme -- 101 for
-- Q1 -- so the comparison against classes.active_quarters ({1,2}, {1}, {3,4})
-- never matched, and blocks G and H, the only two with a non-null
-- active_quarters, dropped out of the result entirely.
--
-- The quarter number comes from the label ('Q1' -> 1), falling back to position
-- by start_date if a label is ever blank (the column defaults to '').

create or replace function get_public_classes(plan_date date default null)
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
  select coalesce(
           nullif(regexp_replace(sq.label, '\D', '', 'g'), '')::int,
           sq.ordinal
         )
  into q
  from (
    select s.*, row_number() over (order by s.start_date) as ordinal
    from school_quarters s
  ) sq
  where d between sq.start_date and sq.end_date
  order by sq.start_date
  limit 1;

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
    select distinct on (c.block_label) c.id, c.block_label, c.name, c.room, c.sort_order
    from classes c
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

revoke all on function get_public_classes(date) from public;
grant execute on function get_public_classes(date) to anon;
