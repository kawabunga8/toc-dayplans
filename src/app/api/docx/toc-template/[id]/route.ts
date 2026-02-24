import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import {
  AlignmentType,
  Paragraph,
  TextRun,
} from 'docx';

import {
  blueBox,
  body,
  bulletItem,
  createRcsDoc,
  goldBox,
  infoTable,
  packDoc,
  roleTable,
  spacer,
  subHeader,
  titleBlock,
  activityBox,
  phaseTable,
} from '@/lib/docx/rcsStyle';

export const runtime = 'nodejs';

type PlanMode = 'lesson_flow' | 'activity_options';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return NextResponse.json({ error: 'Missing Supabase env (NEXT_PUBLIC_SUPABASE_URL / ANON_KEY).' }, { status: 500 });
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (all: Array<{ name: string; value: string; options?: any }>) => {
        // Next.js route handlers can set cookies via the cookieStore.
        // @supabase/ssr expects we apply any mutations.
        for (const c of all) cookieStore.set(c);
      },
    },
  });

  // Auth: staff only
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: isStaff, error: staffErr } = await supabase.rpc('is_staff');
  if (staffErr || !isStaff) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 1) Template
  const { data: tpl, error: tplErr } = await supabase
    .from('class_toc_templates')
    .select('*')
    .eq('id', id)
    .single();
  if (tplErr) {
    return NextResponse.json({ error: tplErr.message }, { status: 400 });
  }

  const templateId = tpl.id as string;
  const classId = tpl.class_id as string;
  const planMode = tpl.plan_mode as PlanMode;

  // 2) Class
  const { data: klass, error: classErr } = await supabase
    .from('classes')
    .select('id,name,room,block_label')
    .eq('id', classId)
    .single();
  if (classErr) {
    return NextResponse.json({ error: classErr.message }, { status: 400 });
  }

  // 3) Child rows (ordered)
  const [routineRes, phaseRes, optRes, whatIfRes] = await Promise.all([
    supabase
      .from('class_opening_routine_steps')
      .select('*')
      .eq('template_id', templateId)
      .order('sort_order', { ascending: true }),
    supabase
      .from('class_lesson_flow_phases')
      .select('*')
      .eq('template_id', templateId)
      .order('sort_order', { ascending: true }),
    supabase
      .from('class_activity_options')
      .select('*')
      .eq('template_id', templateId)
      .order('sort_order', { ascending: true }),
    supabase
      .from('class_what_to_do_if_items')
      .select('*')
      .eq('template_id', templateId)
      .order('sort_order', { ascending: true }),
  ]);

  if (routineRes.error) return NextResponse.json({ error: routineRes.error.message }, { status: 400 });
  if (phaseRes.error) return NextResponse.json({ error: phaseRes.error.message }, { status: 400 });
  if (optRes.error) return NextResponse.json({ error: optRes.error.message }, { status: 400 });
  if (whatIfRes.error) return NextResponse.json({ error: whatIfRes.error.message }, { status: 400 });

  const options = (optRes.data ?? []) as any[];
  const optionIds = options.map((o) => o.id);

  let optionStepsByOptionId: Record<string, Array<{ step_text: string }>> = {};
  if (optionIds.length > 0) {
    const { data: steps, error: stepsErr } = await supabase
      .from('class_activity_option_steps')
      .select('*')
      .in('activity_option_id', optionIds)
      .order('sort_order', { ascending: true });
    if (stepsErr) return NextResponse.json({ error: stepsErr.message }, { status: 400 });

    optionStepsByOptionId = (steps ?? []).reduce((acc: any, s: any) => {
      const key = s.activity_option_id as string;
      acc[key] = acc[key] ?? [];
      acc[key].push({ step_text: s.step_text as string });
      return acc;
    }, {});
  }

  // DOCX generation
  const blockLabel = (klass.block_label as string | null) ?? '';
  const className = (klass.name as string) ?? '';
  const room = (klass.room as string | null) ?? '';

  const courseTitle = blockLabel ? `Block ${blockLabel} — ${className}` : className;
  const courseDetail = room ? `Room ${room}` : undefined;

  const teacherName = (tpl.teacher_name as string) ?? '';
  const taName = (tpl.ta_name as string | null) ?? null;
  const taRole = (tpl.ta_role as string | null) ?? null;
  const phonePolicy = (tpl.phone_policy as string) ?? 'Not permitted';
  const noteToToc = (tpl.note_to_toc as string) ?? '';

  const children: Array<any> = [];

  // titleBlock
  children.push(titleBlock(teacherName, courseTitle, 'TOC Lesson Plan', courseDetail));
  children.push(spacer());

  // blueBox: note to TOC
  children.push(
    blueBox(
      'Note to the TOC',
      splitParagraphs(noteToToc).map((t) => body(t))
    )
  );
  children.push(spacer());

  // Class Overview
  children.push(subHeader('Class Overview'));
  const overviewRows: Array<[string, string]> = [
    ['Class', courseTitle],
    ['Room', room || '—'],
    ['Teacher', teacherName || '—'],
    ['TA', taName || '—'],
    ['Phone policy', phonePolicy || '—'],
    ['What comes next', '—'],
  ];
  children.push(infoTable(overviewRows));
  children.push(spacer());

  // Division of Roles (only if TA present)
  if (taName) {
    children.push(subHeader('Division of Roles'));
    children.push(
      roleTable([
        ['TOC', 'Attendance, supervision, and classroom management.'],
        [taName, taRole || 'Supports the teacher and students as needed.'],
      ])
    );
    children.push(spacer());
  }

  // Opening routine
  children.push(subHeader('Opening Routine — Every Class'));
  const routineSteps = (routineRes.data ?? []) as any[];
  for (const s of routineSteps) {
    children.push(bulletItem(String(s.step_text ?? '').trim()));
  }
  if (routineSteps.length === 0) {
    children.push(body('—'));
  }
  children.push(spacer());

  if (planMode === 'lesson_flow') {
    children.push(subHeader('Lesson Flow'));

    const phases = (phaseRes.data ?? []) as any[];
    const phaseRows = phases.map((p) => ({
      time: String(p.time_text ?? ''),
      phase: String(p.phase_text ?? ''),
      activity: String(p.activity_text ?? ''),
      purpose: (p.purpose_text ?? null) as string | null,
    }));

    const anyPurpose = phaseRows.some((r) => (r.purpose ?? '').trim().length > 0);

    // If no purposes anywhere, we still render the 4-column table but with empty purpose.
    // (We can switch to a dedicated 3-column component if/when added.)
    children.push(
      phaseTable(
        phaseRows.map((r) => ({
          time: r.time,
          phase: r.phase,
          activity: r.activity,
          purpose: anyPurpose ? (r.purpose ?? '') : '',
        }))
      )
    );
    children.push(spacer());
  }

  if (planMode === 'activity_options') {
    children.push(subHeader('Activity Options'));

    for (let i = 0; i < options.length; i++) {
      const o = options[i];
      const steps = optionStepsByOptionId[o.id] ?? [];

      const detailsParas: Paragraph[] = [];
      for (const t of splitParagraphs(String(o.details_text ?? ''))) {
        detailsParas.push(body(t));
      }

      if ((o.toc_role_text ?? '').trim()) {
        detailsParas.push(scenarioResponseParagraph('TOC role', String(o.toc_role_text)));
      }

      for (const s of steps) {
        detailsParas.push(bulletItem(String(s.step_text ?? '').trim()));
      }

      children.push(
        activityBox(String(i + 1), String(o.title ?? ''), String(o.description ?? ''), detailsParas)
      );
      children.push(spacer());
    }

    if (options.length === 0) {
      children.push(body('—'));
      children.push(spacer());
    }
  }

  // What to Do If...
  const whatIfItems = (whatIfRes.data ?? []) as any[];
  children.push(
    goldBox(
      'What to Do If...',
      whatIfItems.length
        ? whatIfItems.map((w) => scenarioResponseParagraph(String(w.scenario_text ?? ''), String(w.response_text ?? '')))
        : [body('—')]
    )
  );

  const doc = createRcsDoc(children);
  const buf = await packDoc(doc);

  const date = new Date().toISOString().slice(0, 10);
  const safeBlock = (blockLabel || 'X').replace(/[^A-Za-z0-9_-]/g, '');
  const filename = `${safeBlock}-toc-${date}.docx`;

  return new NextResponse(buf as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}

function splitParagraphs(text: string): string[] {
  const t = (text ?? '').trim();
  if (!t) return [''];
  return t.split(/\n\n+/g).map((s) => s.trim()).filter(Boolean);
}

function scenarioResponseParagraph(scenario: string, response: string) {
  return new Paragraph({
    spacing: { after: 80 },
    children: [
      new TextRun({ text: scenario.trim() ? `${scenario.trim()}: ` : '', bold: true, font: 'Arial', size: 20, color: '1A1A1A' }),
      new TextRun({ text: (response ?? '').trim(), font: 'Arial', size: 20, color: '1A1A1A' }),
    ],
    alignment: AlignmentType.LEFT,
  });
}
