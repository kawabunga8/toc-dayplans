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
      'notes', p.notes,
      'share_expires_at', p.share_expires_at
    ) order by p.plan_date asc, p.slot asc), '[]'::jsonb)
  into plans
  from day_plans p
  where p.visibility = 'link'
    and p.trashed_at is null
    and p.plan_date between ws and we
    and exists (
      select 1
      from day_plan_blocks b
      join toc_block_plans tbp on tbp.day_plan_block_id = b.id
      where b.day_plan_id = p.id
    );

  return plans;
end;
$$;

revoke all on function get_public_plans_for_week(date) from public;
grant execute on function get_public_plans_for_week(date) to anon;
