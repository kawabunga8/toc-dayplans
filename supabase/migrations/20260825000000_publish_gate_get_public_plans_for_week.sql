-- Publishing is the only thing that decides whether a TOC may read a plan
-- (ADR-0001). Two corrections to the previous definition:
--
--   1. It is explicitly schema-qualified. An earlier unqualified version was
--      run while search_path pointed at `rcs` and created a stray copy there,
--      carrying the superseded Rule A body (ADR-0004).
--
--   2. The `exists (... toc_block_plans ...)` condition is gone. It hid a
--      published plan until someone had added TOC block plans to it, so a plan
--      staff had deliberately published could still be missing from the week
--      view. Publishing is the gate; nothing else may hide a plan.
--
-- `published_at` is returned so a TOC can see how current a plan is (ADR-0002).

create or replace function public.get_public_plans_for_week(week_start date)
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
      'notes', p.notes,
      'share_expires_at', p.share_expires_at,
      'published_at', p.published_at
    ) order by p.plan_date asc, p.slot asc), '[]'::jsonb)
  into plans
  from day_plans p
  where p.visibility = 'link'
    and p.trashed_at is null
    and p.plan_date between ws and we;

  return plans;
end;
$$;

revoke all on function public.get_public_plans_for_week(date) from public;
grant execute on function public.get_public_plans_for_week(date) to anon;
