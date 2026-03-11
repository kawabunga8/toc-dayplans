create or replace function public.get_public_day_plan_live(plan_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  p record;
  blocks jsonb;
  primary_block_id uuid;

  tbp record;
  tpl record;

  has_or boolean;
  has_lf boolean;
  has_opt boolean;
  has_wi boolean;
  has_overview boolean;
  has_roles boolean;
  has_end boolean;

  toc_opening jsonb;
  toc_lesson_flow jsonb;
  toc_activity_options jsonb;
  toc_whatif jsonb;
  toc_overview jsonb;
  toc_roles jsonb;
  toc_end jsonb;

  eff_plan_mode text;
  eff_teacher text;
  eff_ta_name text;
  eff_ta_role text;
  eff_phone text;
  eff_note text;
  eff_attendance_note text;

  publish_mode text;
  tpl_adv jsonb;
  ov_adv jsonb;
  adv jsonb;
  adv_out jsonb;
  lesson_overview jsonb;
begin
  if plan_id is null then
    return null;
  end if;

  select * into p
  from day_plans
  where id = plan_id
    and visibility = 'link'
    and trashed_at is null
  limit 1;

  if not found then
    return null;
  end if;

  -- Prefer matching via classes.block_label (joined by class_id), but fall back to parsing from class_name.
  -- We support both "(Block X)" and "Block X" formats.
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', b.id,
        'start_time', b.start_time,
        'end_time', b.end_time,
        'room', b.room,
        'class_name', b.class_name,
        'details', b.details,
        'class_id', b.class_id,
        'block_label', coalesce(
          c.block_label,
          substring(b.class_name from '\\(Block ([^\\)]+)\\)'),
          substring(b.class_name from 'Block\\s+([A-Za-z0-9]+)')
        ),
        'students', (
          select coalesce(
            jsonb_agg(
              jsonb_build_object('id', s.id, 'first_name', s.first_name, 'last_name', s.last_name)
              order by s.last_name, s.first_name
            ),
            '[]'::jsonb
          )
          from enrollments e
          join students s on s.id = e.student_id
          where e.class_id = b.class_id
        )
      )
      order by b.start_time asc
    ),
    '[]'::jsonb
  )
  into blocks
  from day_plan_blocks b
  left join classes c on c.id = b.class_id
  where b.day_plan_id = p.id
    and upper(coalesce(
      c.block_label,
      substring(b.class_name from '\\(Block ([^\\)]+)\\)'),
      substring(b.class_name from 'Block\\s+([A-Za-z0-9]+)')
    )) = upper(p.slot);

  -- If we couldn't determine the primary block, fall back to returning all blocks.
  if blocks is null or blocks = '[]'::jsonb then
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', b.id,
          'start_time', b.start_time,
          'end_time', b.end_time,
          'room', b.room,
          'class_name', b.class_name,
          'details', b.details,
          'class_id', b.class_id,
          'block_label', coalesce(c.block_label, null),
          'students', (
            select coalesce(
              jsonb_agg(
                jsonb_build_object('id', s.id, 'first_name', s.first_name, 'last_name', s.last_name)
                order by s.last_name, s.first_name
              ),
              '[]'::jsonb
            )
            from enrollments e
            join students s on s.id = e.student_id
            where e.class_id = b.class_id
          )
        )
        order by b.start_time asc
      ),
      '[]'::jsonb
    )
    into blocks
    from day_plan_blocks b
    left join classes c on c.id = b.class_id
    where b.day_plan_id = p.id;
  end if;

  -- Determine a primary day_plan_block_id for TOC content.
  select b.id into primary_block_id
  from day_plan_blocks b
  left join classes c on c.id = b.class_id
  where b.day_plan_id = p.id
    and upper(coalesce(
      c.block_label,
      substring(b.class_name from '\\(Block ([^\\)]+)\\)'),
      substring(b.class_name from 'Block\\s+([A-Za-z0-9]+)')
    )) = upper(p.slot)
  order by b.start_time asc
  limit 1;

  if primary_block_id is null then
    select b.id into primary_block_id
    from day_plan_blocks b
    where b.day_plan_id = p.id
    order by b.start_time asc
    limit 1;
  end if;

  -- Load toc_block_plan + template (if any)
  if primary_block_id is not null then
    select * into tbp
    from toc_block_plans
    where day_plan_block_id = primary_block_id
    limit 1;

    if not found then
      return jsonb_build_object(
        'id', p.id,
        'plan_date', p.plan_date,
        'slot', p.slot,
        'friday_type', p.friday_type,
        'title', p.title,
        'notes', p.notes,
        'blocks', blocks
      );
    end if;

    -- Always assign tpl so tpl.* reads are safe
    if tbp.template_id is not null then
      select * into tpl
      from class_toc_templates
      where id = tbp.template_id
      limit 1;
    else
      select null::uuid as id,
             'lesson_flow'::text as plan_mode,
             ''::text as teacher_name,
             ''::text as ta_name,
             ''::text as ta_role,
             'Not permitted'::text as phone_policy,
             ''::text as note_to_toc,
             ''::text as attendance_note,
             '{}'::jsonb as advanced_payload
      into tpl;
    end if;

    eff_plan_mode := coalesce(tbp.plan_mode, tpl.plan_mode, 'lesson_flow');
    eff_teacher := coalesce(nullif(tbp.override_teacher_name, ''), tpl.teacher_name, '');
    eff_ta_name := coalesce(nullif(tbp.override_ta_name, ''), tpl.ta_name, '');
    eff_ta_role := coalesce(nullif(tbp.override_ta_role, ''), tpl.ta_role, '');
    eff_phone := coalesce(nullif(tbp.override_phone_policy, ''), tpl.phone_policy, 'Not permitted');
    eff_note := coalesce(nullif(tbp.override_note_to_toc, ''), tpl.note_to_toc, '');
    eff_attendance_note := coalesce(nullif(tbp.override_attendance_note, ''), tpl.attendance_note, '');

    publish_mode := coalesce(nullif((tbp.override_payload->>'publish_mode'), ''), 'toc');
    tpl_adv := coalesce(tpl.advanced_payload, '{}'::jsonb);
    ov_adv := coalesce(tbp.override_payload->'advanced', '{}'::jsonb);
    adv := tpl_adv || ov_adv;

    -- determine which sections have instance overrides
    select exists(select 1 from toc_opening_routine_steps where toc_block_plan_id = tbp.id) into has_or;

    -- Lesson flow can be overridden via JSON payload (new architecture) OR via legacy toc_lesson_flow_phases rows.
    -- Treat an empty JSON array as "no override" so we don't hide the template by accident.
    if tbp.override_payload is not null
      and jsonb_typeof(tbp.override_payload->'lesson_flow_phases') = 'array'
      and jsonb_array_length(tbp.override_payload->'lesson_flow_phases') > 0
    then
      has_lf := true;
    else
      select exists(select 1 from toc_lesson_flow_phases where toc_block_plan_id = tbp.id) into has_lf;
    end if;

    select exists(select 1 from toc_activity_options where toc_block_plan_id = tbp.id) into has_opt;
    select exists(select 1 from toc_what_to_do_if_items where toc_block_plan_id = tbp.id) into has_wi;
    select exists(select 1 from toc_overview_rows where toc_block_plan_id = tbp.id) into has_overview;
    select exists(select 1 from toc_role_rows where toc_block_plan_id = tbp.id) into has_roles;
    select exists(select 1 from toc_end_of_class_items where toc_block_plan_id = tbp.id) into has_end;

    if has_or then
      select coalesce(jsonb_agg(jsonb_build_object('step_text', s.step_text) order by s.sort_order asc), '[]'::jsonb)
      into toc_opening
      from toc_opening_routine_steps s
      where s.toc_block_plan_id = tbp.id;
    else
      select coalesce(jsonb_agg(jsonb_build_object('step_text', s.step_text) order by s.sort_order asc), '[]'::jsonb)
      into toc_opening
      from class_opening_routine_steps s
      where tpl.id is not null and s.template_id = tpl.id;
    end if;

    if has_lf then
      if tbp.override_payload is not null
        and jsonb_typeof(tbp.override_payload->'lesson_flow_phases') = 'array'
        and jsonb_array_length(tbp.override_payload->'lesson_flow_phases') > 0
      then
        toc_lesson_flow := tbp.override_payload->'lesson_flow_phases';
      else
        select coalesce(
          jsonb_agg(
            jsonb_build_object(
              'time_text', p2.time_text,
              'phase_text', p2.phase_text,
              'activity_text', p2.activity_text,
              'purpose_text', p2.purpose_text
            )
            order by p2.sort_order asc
          ),
          '[]'::jsonb
        )
        into toc_lesson_flow
        from toc_lesson_flow_phases p2
        where p2.toc_block_plan_id = tbp.id;
      end if;
    else
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'time_text', p2.time_text,
            'phase_text', p2.phase_text,
            'activity_text', p2.activity_text,
            'purpose_text', p2.purpose_text
          )
          order by p2.sort_order asc
        ),
        '[]'::jsonb
      )
      into toc_lesson_flow
      from class_lesson_flow_phases p2
      where tpl.id is not null and p2.template_id = tpl.id;
    end if;

    if has_opt then
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'title', o.title,
            'description', o.description,
            'details_text', o.details_text,
            'toc_role_text', o.toc_role_text,
            'steps', (
              select coalesce(
                jsonb_agg(jsonb_build_object('step_text', st.step_text) order by st.sort_order asc),
                '[]'::jsonb
              )
              from toc_activity_option_steps st
              where st.toc_activity_option_id = o.id
            )
          )
          order by o.sort_order asc
        ),
        '[]'::jsonb
      )
      into toc_activity_options
      from toc_activity_options o
      where o.toc_block_plan_id = tbp.id;
    else
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'title', o.title,
            'description', o.description,
            'details_text', o.details_text,
            'toc_role_text', o.toc_role_text,
            'steps', (
              select coalesce(
                jsonb_agg(jsonb_build_object('step_text', st.step_text) order by st.sort_order asc),
                '[]'::jsonb
              )
              from class_activity_option_steps st
              where st.activity_option_id = o.id
            )
          )
          order by o.sort_order asc
        ),
        '[]'::jsonb
      )
      into toc_activity_options
      from class_activity_options o
      where tpl.id is not null and o.template_id = tpl.id;
    end if;

    if has_wi then
      select coalesce(
        jsonb_agg(
          jsonb_build_object('scenario_text', w.scenario_text, 'response_text', w.response_text)
          order by w.sort_order asc
        ),
        '[]'::jsonb
      )
      into toc_whatif
      from toc_what_to_do_if_items w
      where w.toc_block_plan_id = tbp.id;
    else
      select coalesce(
        jsonb_agg(
          jsonb_build_object('scenario_text', w.scenario_text, 'response_text', w.response_text)
          order by w.sort_order asc
        ),
        '[]'::jsonb
      )
      into toc_whatif
      from class_what_to_do_if_items w
      where tpl.id is not null and w.template_id = tpl.id;
    end if;

    if has_overview then
      select coalesce(
        jsonb_agg(jsonb_build_object('label', r.label, 'value', r.value) order by r.sort_order asc),
        '[]'::jsonb
      )
      into toc_overview
      from toc_overview_rows r
      where r.toc_block_plan_id = tbp.id;
    else
      select coalesce(
        jsonb_agg(jsonb_build_object('label', r.label, 'value', r.value) order by r.sort_order asc),
        '[]'::jsonb
      )
      into toc_overview
      from class_overview_rows r
      where tpl.id is not null and r.template_id = tpl.id;
    end if;

    if has_roles then
      select coalesce(
        jsonb_agg(jsonb_build_object('who', r.who, 'responsibility', r.responsibility) order by r.sort_order asc),
        '[]'::jsonb
      )
      into toc_roles
      from toc_role_rows r
      where r.toc_block_plan_id = tbp.id;
    else
      select coalesce(
        jsonb_agg(jsonb_build_object('who', r.who, 'responsibility', r.responsibility) order by r.sort_order asc),
        '[]'::jsonb
      )
      into toc_roles
      from class_role_rows r
      where tpl.id is not null and r.template_id = tpl.id;
    end if;

    if has_end then
      select coalesce(
        jsonb_agg(jsonb_build_object('item_text', r.item_text) order by r.sort_order asc),
        '[]'::jsonb
      )
      into toc_end
      from toc_end_of_class_items r
      where r.toc_block_plan_id = tbp.id;
    else
      select coalesce(
        jsonb_agg(jsonb_build_object('item_text', r.item_text) order by r.sort_order asc),
        '[]'::jsonb
      )
      into toc_end
      from class_end_of_class_items r
      where tpl.id is not null and r.template_id = tpl.id;
    end if;
  end if;

  if jsonb_typeof(adv->'materials_needed') = 'array' and jsonb_array_length(adv->'materials_needed') > 0 then
    adv_out := adv_out || jsonb_build_object('materials_needed', adv->'materials_needed');
  end if;

  if publish_mode = 'advanced' then
    lesson_overview := jsonb_strip_nulls(jsonb_build_object(
      'central_theme', nullif(trim(coalesce(adv->>'central_theme','')), ''),
      'deep_hope', nullif(trim(coalesce(adv->>'deep_hope','')), ''),
      'big_idea', nullif(trim(coalesce(adv->>'big_idea','')), ''),
      'learning_target', nullif(trim(coalesce(adv->>'learning_target','')), ''),
      'collaborative_structure', nullif(trim(coalesce(adv->>'collaborative_structure','')), ''),
      'context', nullif(trim(coalesce(adv->>'context','')), '')
    ));

    if lesson_overview is not null and lesson_overview <> '{}'::jsonb then
      adv_out := adv_out || jsonb_build_object('lesson_overview', lesson_overview);
    end if;

    if jsonb_typeof(adv->'assessment_touch_points') = 'array' and jsonb_array_length(adv->'assessment_touch_points') > 0 then
      adv_out := adv_out || jsonb_build_object('assessment_touch_points', adv->'assessment_touch_points');
    end if;

    if jsonb_typeof(adv->'pd_goal_connections') = 'array' and jsonb_array_length(adv->'pd_goal_connections') > 0 then
      adv_out := adv_out || jsonb_build_object('pd_goal_connections', adv->'pd_goal_connections');
    end if;

    if jsonb_typeof(adv->'first_peoples_principles') = 'array' and jsonb_array_length(adv->'first_peoples_principles') > 0 then
      adv_out := adv_out || jsonb_build_object('first_peoples_principles', adv->'first_peoples_principles');
    end if;
  end if;

  return jsonb_build_object(
    'id', p.id,
    'plan_date', p.plan_date,
    'slot', p.slot,
    'friday_type', p.friday_type,
    'title', p.title,
    'notes', p.notes,
    'blocks', blocks,
    'toc', (
      jsonb_build_object(
        'plan_mode', coalesce(eff_plan_mode, 'lesson_flow'),
        'teacher_name', coalesce(eff_teacher, ''),
        'ta_name', coalesce(eff_ta_name, ''),
        'ta_role', coalesce(eff_ta_role, ''),
        'phone_policy', coalesce(eff_phone, 'Not permitted'),
        'note_to_toc', coalesce(eff_note, ''),
        'attendance_note', coalesce(eff_attendance_note, ''),
        'class_overview_rows', coalesce(toc_overview, '[]'::jsonb),
        'division_of_roles_rows', coalesce(toc_roles, '[]'::jsonb),
        'opening_routine_steps', coalesce(toc_opening, '[]'::jsonb),
        'lesson_flow_phases', coalesce(toc_lesson_flow, '[]'::jsonb),
        'activity_options', coalesce(toc_activity_options, '[]'::jsonb),
        'what_to_do_if_items', coalesce(toc_whatif, '[]'::jsonb),
        'end_of_class_items', coalesce(toc_end, '[]'::jsonb)
      )
      || coalesce(adv_out, '{}'::jsonb)
    )
  );
end;
$$;

revoke all on function public.get_public_day_plan_live(uuid) from public;
grant execute on function public.get_public_day_plan_live(uuid) to anon, authenticated;
