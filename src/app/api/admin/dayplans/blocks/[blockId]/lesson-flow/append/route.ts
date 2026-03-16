import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

type ReqBody = {
  phases: Array<{ time_text: string; phase_text: string; activity_text: string; purpose_text?: string | null }>;
};

export async function POST(req: Request, ctx: { params: Promise<{ blockId: string }> }) {
  const { blockId } = await ctx.params;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anon) return NextResponse.json({ error: 'Missing Supabase env.' }, { status: 500 });

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
  if (!sessionData.session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: isStaff, error: staffErr } = await supabase.rpc('is_staff');
  if (staffErr || !isStaff) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: ReqBody;
  try {
    body = (await req.json()) as ReqBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const phases = Array.isArray(body?.phases) ? body.phases : [];
  const cleaned = phases
    .map((p) => ({
      time_text: String((p as any)?.time_text ?? '').trim(),
      phase_text: String((p as any)?.phase_text ?? '').trim(),
      activity_text: String((p as any)?.activity_text ?? '').trim(),
      purpose_text: String((p as any)?.purpose_text ?? '').trim(),
    }))
    .filter((p) => p.time_text || p.phase_text || p.activity_text || p.purpose_text)
    .map((p) => ({
      time_text: p.time_text,
      phase_text: p.phase_text,
      activity_text: p.activity_text,
      purpose_text: p.purpose_text ? p.purpose_text : null,
    }));

  if (cleaned.length === 0) return NextResponse.json({ error: 'No phases provided' }, { status: 400 });

  const adminDb = service ? createClient(url, service, { auth: { persistSession: false } }) : supabase;

  // Resolve class_id for the block
  const { data: blk, error: blkErr } = await adminDb
    .from('day_plan_blocks')
    .select('id,class_id')
    .eq('id', blockId)
    .maybeSingle();
  if (blkErr) return NextResponse.json({ error: blkErr.message }, { status: 400 });
  if (!blk?.id || !(blk as any)?.class_id) return NextResponse.json({ error: 'Block not found' }, { status: 404 });

  // Ensure toc_block_plans row exists (seed template on create)
  const now = new Date().toISOString();

  const classId = String((blk as any).class_id);
  const { data: tpl, error: tplErr } = await adminDb
    .from('class_toc_templates')
    .select('id,plan_mode')
    .eq('class_id', classId)
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (tplErr) return NextResponse.json({ error: tplErr.message }, { status: 400 });

  const { data: upserted, error: upErr } = await adminDb
    .from('toc_block_plans')
    .upsert(
      {
        day_plan_block_id: blockId,
        class_id: classId,
        template_id: tpl?.id ?? null,
        plan_mode: (tpl?.plan_mode as any) ?? 'lesson_flow',
        updated_at: now,
      } as any,
      { onConflict: 'day_plan_block_id' }
    )
    .select('id,override_payload')
    .maybeSingle();

  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 });
  const tocBlockPlanId = (upserted as any)?.id as string | undefined;
  if (!tocBlockPlanId) return NextResponse.json({ error: 'Failed to create toc_block_plan' }, { status: 500 });

  const existingPayload = ((upserted as any)?.override_payload && typeof (upserted as any).override_payload === 'object')
    ? { ...(upserted as any).override_payload }
    : {};

  const existingPhases = Array.isArray((existingPayload as any).lesson_flow_phases)
    ? ((existingPayload as any).lesson_flow_phases as any[])
    : [];

  const nextPayload = {
    ...existingPayload,
    lesson_flow_phases: [...existingPhases, ...cleaned],
  };

  const { data: saved, error: saveErr } = await adminDb
    .from('toc_block_plans')
    .update({ plan_mode: 'lesson_flow', override_payload: nextPayload, updated_at: now })
    .eq('id', tocBlockPlanId)
    .select('override_payload')
    .maybeSingle();
  if (saveErr) return NextResponse.json({ error: saveErr.message }, { status: 400 });

  const persisted = (saved as any)?.override_payload ?? null;
  const persistedPhases = Array.isArray((persisted as any)?.lesson_flow_phases) ? ((persisted as any).lesson_flow_phases as any[]) : null;
  if (!persistedPhases) {
    return NextResponse.json(
      { error: 'override_payload did not persist (missing lesson_flow_phases). Check RLS / deployment version.' },
      { status: 500 }
    );
  }

  // No materialization step: /p reads live computed payload directly.

  // Keep legacy table empty (editor/public rely on JSON override)
  await adminDb.from('toc_lesson_flow_phases').delete().eq('toc_block_plan_id', tocBlockPlanId);

  return NextResponse.json({
    ok: true,
    toc_block_plan_id: tocBlockPlanId,
    appended: cleaned.length,
    total: persistedPhases.length,
  });
}
