import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { anthropicMessages, extractJsonObject } from '@/lib/ai/anthropic';
import { TEACHER_ROLES, STANDING_GUARDRAILS, buildSection1FromFields } from '@/lib/teacherSuperprompt/superprompt';

export const runtime = 'nodejs';

type SuggestReq =
  | {
      section: 'note_to_toc_rewrite';
      input: {
        current_note_to_toc: string;
        class_name?: string | null;
        plan_date?: string | null;
        slot?: string | null;
        audience?: 'toc' | 'teacher';
      };
    }
  | {
      section: 'lesson_flow_phases';
      input: {
        class_name?: string | null;
        plan_date?: string | null;
        slot?: string | null;
        duration_min?: number | null;
        constraints?: string | null;
        current_phases?: Array<{ time_text: string; phase_text: string; activity_text: string; purpose_text?: string | null }>;
      };
    }
  | {
      section: 'teacher_lesson_flow_phases';
      input: {
        role_id: 1 | 2 | 3 | 4 | 5 | 6;
        // Optional dayplan context (from week picker)
        plan_date?: string | null;
        slot?: string | null;
        class_name?: string | null;
        section1_fields: {
          subject?: string;
          grade?: string;
          class_size?: string;
          diversity?: string;
          standards?: string;
          unit_topic?: string;
          unit_stage?: string;
          tools?: string;
          not_worked?: string;
        };
        task: string;
        constraints?: string | null;
      };
    };

export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return NextResponse.json({ error: 'Missing Supabase env.' }, { status: 500 });
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (all: Array<{ name: string; value: string; options?: any }>) => {
        for (const c of all) cookieStore.set(c);
      },
    },
  });

  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: isStaff, error: staffErr } = await supabase.rpc('is_staff');
  if (staffErr || !isStaff) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Missing ANTHROPIC_API_KEY' }, { status: 500 });
  }

  const model = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5';

  let body: SuggestReq;
  try {
    body = (await req.json()) as SuggestReq;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (body.section === 'note_to_toc_rewrite') {
    const current = String(body.input?.current_note_to_toc ?? '');
    if (!current.trim()) {
      return NextResponse.json({ error: 'current_note_to_toc is required' }, { status: 400 });
    }

    const className = String(body.input?.class_name ?? '').trim();
    const planDate = String(body.input?.plan_date ?? '').trim();
    const slot = String(body.input?.slot ?? '').trim();
    const audience = body.input?.audience ?? 'toc';

    const prompt = `Rewrite the following "Note to TOC" to be clearer and more actionable.\n\nAudience: ${audience === 'toc' ? 'TOC (support staff)' : 'Teacher'}\nClass: ${className || '—'}\nDate: ${planDate || '—'}\nBlock: ${slot || '—'}\n\nRules:\n- Keep it concise.\n- Use short sentences.\n- Preserve all concrete policies (phones/food/where to find work/etc.).\n- No emojis.\n- Output MUST be valid JSON only.\n\nReturn JSON with this exact shape:\n{"note_to_toc": "..."}\n\nINPUT NOTE:\n${current}`;

    const { text } = await anthropicMessages({
      apiKey,
      model,
      maxTokens: 500,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    });

    const parsed = extractJsonObject(text);
    const note = String(parsed?.note_to_toc ?? '').trim();
    if (!note) {
      return NextResponse.json({ error: 'Model returned empty note_to_toc' }, { status: 400 });
    }

    return NextResponse.json({ ok: true, suggestion: { note_to_toc: note } });
  }

  if (body.section === 'lesson_flow_phases') {
    const className = String(body.input?.class_name ?? '').trim();
    const planDate = String(body.input?.plan_date ?? '').trim();
    const slot = String(body.input?.slot ?? '').trim();
    const durationMin = body.input?.duration_min ?? null;
    const constraints = String(body.input?.constraints ?? '').trim();
    const currentPhases = Array.isArray(body.input?.current_phases) ? body.input.current_phases : [];

    const prompt = `Create a lesson flow (phases) as JSON.\n\nContext:\n- Class: ${className || '—'}\n- Date: ${planDate || '—'}\n- Block: ${slot || '—'}\n- Duration (min): ${durationMin ?? '—'}\n${constraints ? `- Constraints: ${constraints}\n` : ''}\n\nIf the user provided current phases, keep the same general structure but improve clarity and actionability.\n\nOutput MUST be valid JSON only.\nReturn this exact shape:\n{"lesson_flow_phases": [{"time_text":"","phase_text":"","activity_text":"","purpose_text":""}]}\n\nCurrent phases (may be empty):\n${JSON.stringify(currentPhases, null, 2)}`;

    const { text } = await anthropicMessages({
      apiKey,
      model,
      maxTokens: 900,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
    });

    const parsed = extractJsonObject(text);
    const phases = Array.isArray(parsed?.lesson_flow_phases) ? parsed.lesson_flow_phases : null;
    if (!phases) return NextResponse.json({ error: 'Model returned missing lesson_flow_phases' }, { status: 400 });

    const cleaned = phases
      .map((p: any) => ({
        time_text: String(p?.time_text ?? '').trim(),
        phase_text: String(p?.phase_text ?? '').trim(),
        activity_text: String(p?.activity_text ?? '').trim(),
        purpose_text: String(p?.purpose_text ?? '').trim(),
      }))
      .filter((p: any) => p.time_text || p.phase_text || p.activity_text || p.purpose_text);

    if (cleaned.length === 0) return NextResponse.json({ error: 'Model returned empty lesson_flow_phases' }, { status: 400 });

    return NextResponse.json({ ok: true, suggestion: { lesson_flow_phases: cleaned } });
  }

  if (body.section === 'teacher_lesson_flow_phases') {
    const roleId = body.input?.role_id;
    const role = TEACHER_ROLES.find((r) => r.id === roleId);
    if (!role) return NextResponse.json({ error: 'Invalid role_id' }, { status: 400 });

    const task = String(body.input?.task ?? '').trim();
    if (!task) return NextResponse.json({ error: 'task is required' }, { status: 400 });

    const f = body.input?.section1_fields ?? {};
    const section1 = buildSection1FromFields({
      subject: f.subject,
      grade: f.grade,
      classSize: f.class_size,
      diversity: f.diversity,
      standards: f.standards,
      unitTopic: f.unit_topic,
      unitStage: f.unit_stage,
      tools: f.tools,
      notWorked: f.not_worked,
    });

    const constraints = String(body.input?.constraints ?? '').trim();
    const planDate = String(body.input?.plan_date ?? '').trim();
    const slot = String(body.input?.slot ?? '').trim();
    const className = String(body.input?.class_name ?? '').trim();

    const dayplanContext = planDate || slot || className ? `Dayplan context:\n- Date: ${planDate || '—'}\n- Block: ${slot || '—'}\n- Class: ${className || '—'}\n\n` : '';

    const prompt = `${section1}\n\n---\n\n${role.prompt}\n\n---\n\n${STANDING_GUARDRAILS}\n\n---\n\n${dayplanContext}Now do this task:\n${task}\n\n${constraints ? `Constraints:\n${constraints}\n\n` : ''}Output MUST be valid JSON only.\nReturn this exact shape:\n{"lesson_flow_phases": [{"time_text":"","phase_text":"","activity_text":"","purpose_text":""}]}`;

    const { text } = await anthropicMessages({
      apiKey,
      model,
      maxTokens: 900,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
    });

    const parsed = extractJsonObject(text);
    const phases = Array.isArray(parsed?.lesson_flow_phases) ? parsed.lesson_flow_phases : null;
    if (!phases) return NextResponse.json({ error: 'Model returned missing lesson_flow_phases' }, { status: 400 });

    const cleaned = phases
      .map((p: any) => ({
        time_text: String(p?.time_text ?? '').trim(),
        phase_text: String(p?.phase_text ?? '').trim(),
        activity_text: String(p?.activity_text ?? '').trim(),
        purpose_text: String(p?.purpose_text ?? '').trim(),
      }))
      .filter((p: any) => p.time_text || p.phase_text || p.activity_text || p.purpose_text);

    if (cleaned.length === 0) return NextResponse.json({ error: 'Model returned empty lesson_flow_phases' }, { status: 400 });

    return NextResponse.json({ ok: true, suggestion: { lesson_flow_phases: cleaned } });
  }

  return NextResponse.json({ error: 'Unsupported section' }, { status: 400 });
}
