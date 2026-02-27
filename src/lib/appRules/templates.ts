import { getSupabaseClient } from '@/lib/supabaseClient';

export type PlanMode = 'lesson_flow' | 'activity_options';

export function inferTemplateDefaults(blockLabel: string | null) {
  const block = String(blockLabel ?? '').trim().toUpperCase();
  const isMusic = block === 'B' || block === 'H';
  const isComputer = block === 'A' || block === 'G';
  const isWorship = block === 'F';
  const isCle = block === 'CLE';
  const isFlex = block === 'FLEX';
  const isChapel = block === 'CHAPEL';
  const isLunch = block === 'LUNCH';

  const noteToToc = isLunch
    ? [
        'This block is Lunch.',
        'Students may eat in designated areas per school expectations.',
        'Supervise and keep the area safe and respectful.',
        'If something urgent comes up, contact the office.',
      ].join('\n')
    : isChapel
      ? [
          'This block is Chapel.',
          'Supervise student movement and behaviour.',
          'Take attendance if required by the day’s procedure.',
          'If something urgent comes up, contact the office.',
        ].join('\n')
      : isFlex
        ? [
            'This block is Flex.',
            'Students may be working, meeting teachers, or attending support activities.',
            'Supervise and keep students on task / where they are supposed to be.',
            'If something urgent comes up, contact the office.',
          ].join('\n')
        : isComputer
          ? [
              'Students are self-sufficient and generally know what they are doing — your main job is to keep the room on task.',
              'If a student is stuck, ask them to check the course instructions first, then ask their partner.',
              'Partners are already chosen (students know who they are with).',
              'Food policy: water is allowed. Food is not allowed unless students ask.',
              'Audio devices: allowed when a student asks.',
              'Mr. Kawamura is reachable on Microsoft Teams if anything urgent comes up.',
            ].join('\n')
          : isMusic
            ? [
                'Students know the warm-up routine. Keep the rehearsal moving and keep students on task.',
                'Take attendance during the warm-up window.',
                'Food policy: water is allowed. Food is not allowed unless students ask.',
                'Audio devices: allowed when a student asks.',
                'If you need support, follow the TA/student leaders when present.',
                'Mr. Kawamura is reachable on Microsoft Teams if anything urgent comes up.',
              ].join('\n')
            : isWorship
              ? [
                  'This class is student-led. Your main job is attendance and supervision.',
                  'Encourage respectful participation and keep students on task.',
                  'Food policy: water is allowed. Food is not allowed unless students ask.',
                  'Audio devices: allowed when a student asks.',
                  'If something urgent comes up, contact Mr. Kawamura on Microsoft Teams.',
                ].join('\n')
              : isCle
                ? [
                    'This is self-directed work time. Students should know what they are working on.',
                    'Take attendance, circulate, and keep students on task.',
                    'Food policy: water is allowed. Food is not allowed unless students ask.',
                    'Audio devices: allowed when a student asks.',
                    'If something urgent comes up, contact Mr. Kawamura on Microsoft Teams.',
                  ].join('\n')
                : [
                    'Take attendance and keep students on task.',
                    'Follow the plan below. If a TA is present, follow their lead.',
                    'Food policy: water is allowed. Food is not allowed unless students ask.',
                    'Audio devices: allowed when a student asks.',
                    'Mr. Kawamura is reachable on Microsoft Teams if anything urgent comes up.',
                  ].join('\n');

  const openingRoutine = isLunch
    ? ['Students eat lunch', 'Supervise and keep students safe and respectful']
    : isChapel
      ? ['Transition to Chapel', 'Supervise students', 'Follow school procedures for seating/attendance']
      : isFlex
        ? ['Students begin Flex activities', 'Supervise and keep students on task / where they should be']
        : isMusic
          ? [
              'Students enter, unpack instruments, and begin individual warm-up independently',
              'Run the standard full-band warm-up (scales, long tones, rhythm reading)',
              'TOC takes attendance during warm-up',
            ]
          : isComputer
            ? [
                'Students enter and log into their computers / course environment independently',
                'TOC takes attendance',
                'Students begin working on the assigned task — they know what to do',
              ]
            : isWorship
              ? ['Students enter and settle', 'TOC takes attendance', 'Students begin the planned student-led activity']
              : isCle
                ? ['Students enter and begin their self-directed work', 'TOC takes attendance', 'Circulate and keep students on task']
                : ['Students enter and settle', 'TOC takes attendance', 'Begin the planned activity'];

  const lessonFlow = isComputer
    ? [
        {
          time_text: '0–5 min',
          phase_text: 'Settle & Log In',
          activity_text:
            "Students come in and log into their computers and the course environment.\nSay: 'Open the course and continue where you left off.'",
          purpose_text: 'Smooth independent start',
        },
        {
          time_text: '5–60 min',
          phase_text: 'Independent Work',
          activity_text:
            'Students continue the assigned unit/task independently (or with their partner if applicable).\nTOC circulates, answers basic questions, and keeps students on task.',
          purpose_text: 'Practice / completion of assigned work',
        },
        {
          time_text: 'Last 5 min',
          phase_text: 'Wrap Up',
          activity_text: 'Students save work and clean up their workspace.\nRemind them what to work on next class.',
          purpose_text: 'Clear expectations for next time',
        },
      ]
    : [
        { time_text: '0–5 min', phase_text: 'Settle', activity_text: 'Students enter and settle. Take attendance.', purpose_text: '' },
        { time_text: 'Main block', phase_text: 'Core Activity', activity_text: 'Follow the planned activity. Circulate and keep students on task.', purpose_text: '' },
        { time_text: 'Last 5 min', phase_text: 'Clean Up', activity_text: 'Clean up materials and ensure the room is left tidy.', purpose_text: '' },
      ];

  const activityOptions = isMusic
    ? [
        {
          title: 'Rehearsal Option A',
          description: 'Warm-up + repertoire run-through',
          details_text: 'Run standard warm-up, then rehearse the assigned pieces. Focus on problem spots.',
          toc_role_text: 'Keep time, run warm-ups, and maintain rehearsal expectations.',
          steps: ['Warm-up', 'Rehearse Piece 1', 'Rehearse Piece 2'],
        },
        {
          title: 'Rehearsal Option B',
          description: 'Sectional focus',
          details_text: 'Have students work in sections on assigned measures, then re-combine.',
          toc_role_text: 'Circulate and keep students focused; bring the group together to re-run sections.',
          steps: ['Assign measures', 'Sectional work', 'Full band run-through'],
        },
      ]
    : [
        {
          title: 'Option A',
          description: 'Independent work',
          details_text: 'Students work independently on the assigned task.',
          toc_role_text: 'Take attendance, circulate, and keep students on task.',
          steps: ['Log in', 'Work time', 'Wrap up'],
        },
      ];

  const whatIfItems = [
    {
      scenario_text: 'A student is disruptive',
      response_text: 'Have a quiet one-on-one conversation first. If it continues, follow school procedures and contact support if needed.',
    },
    {
      scenario_text: 'A student is injured or unwell',
      response_text: 'Follow standard school first aid protocol. Send a responsible student to the office if needed.',
    },
    {
      scenario_text: 'A student finishes early',
      response_text: 'Ask them to review previous material or work ahead quietly.',
    },
    {
      scenario_text: 'Something urgent comes up',
      response_text: 'Contact Mr. Kawamura on Microsoft Teams or the office if immediate help is needed.',
    },
  ];

  return {
    planMode: 'lesson_flow' as const,
    teacherName: 'Mr. Shingo Kawamura',
    phonePolicy: 'Not permitted',
    noteToToc,
    openingRoutine,
    lessonFlow,
    activityOptions,
    whatIfItems,
  };
}

export async function ensureDefaultTemplateForClass(supabase: ReturnType<typeof getSupabaseClient>, classId: string) {
  // If a template exists (even inactive), prefer it.
  const { data: anyTpl, error: anyErr } = await supabase
    .from('class_toc_templates')
    .select('*')
    .eq('class_id', classId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (anyErr) throw anyErr;
  if (anyTpl) {
    // Ensure it's active
    if (!(anyTpl as any).is_active) {
      await supabase
        .from('class_toc_templates')
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .eq('id', (anyTpl as any).id);
    }
    return anyTpl as any;
  }

  // Load class to infer defaults
  const { data: klass, error: classErr } = await supabase.from('classes').select('id,block_label').eq('id', classId).single();
  if (classErr) throw classErr;

  const d = inferTemplateDefaults((klass as any).block_label ?? null);
  const now = new Date().toISOString();

  const { data: tpl, error: tplErr } = await supabase
    .from('class_toc_templates')
    .insert({
      class_id: classId,
      is_active: true,
      teacher_name: d.teacherName,
      ta_name: null,
      ta_role: null,
      phone_policy: d.phonePolicy,
      note_to_toc: d.noteToToc,
      plan_mode: d.planMode,
      created_at: now,
      updated_at: now,
    })
    .select('*')
    .single();
  if (tplErr) throw tplErr;

  const templateId = (tpl as any).id as string;

  // Children
  if (d.openingRoutine.length) {
    const { error } = await supabase.from('class_opening_routine_steps').insert(
      d.openingRoutine.map((t, i) => ({ template_id: templateId, sort_order: i + 1, step_text: t }))
    );
    if (error) throw error;
  }

  if (d.lessonFlow.length) {
    const { error } = await supabase.from('class_lesson_flow_phases').insert(
      d.lessonFlow.map((p, i) => ({
        template_id: templateId,
        sort_order: i + 1,
        time_text: p.time_text,
        phase_text: p.phase_text,
        activity_text: p.activity_text,
        purpose_text: p.purpose_text?.trim() ? p.purpose_text.trim() : null,
      }))
    );
    if (error) throw error;
  }

  if (d.activityOptions.length) {
    for (let i = 0; i < d.activityOptions.length; i++) {
      const o = d.activityOptions[i];
      const { data: insOpt, error: insErr } = await supabase
        .from('class_activity_options')
        .insert({
          template_id: templateId,
          sort_order: i + 1,
          title: o.title,
          description: o.description,
          details_text: o.details_text,
          toc_role_text: o.toc_role_text,
        })
        .select('id')
        .single();
      if (insErr) throw insErr;

      const optionId = (insOpt as any).id as string;
      if (o.steps?.length) {
        const { error: stErr } = await supabase.from('class_activity_option_steps').insert(
          o.steps.map((t, j) => ({ activity_option_id: optionId, sort_order: j + 1, step_text: t }))
        );
        if (stErr) throw stErr;
      }
    }
  }

  if (d.whatIfItems.length) {
    const { error } = await supabase.from('class_what_to_do_if_items').insert(
      d.whatIfItems.map((w, i) => ({ template_id: templateId, sort_order: i + 1, scenario_text: w.scenario_text, response_text: w.response_text }))
    );
    if (error) throw error;
  }

  return tpl as any;
}
