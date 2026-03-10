import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

type ReqBody = {
  plan_date: string; // YYYY-MM-DD
  slot: string; // e.g., A/B/C...
  friday_type?: 'day1' | 'day2' | null;
  phases: Array<{ time_text: string; phase_text: string; activity_text: string; purpose_text?: string | null }>;
};

export async function POST(req: Request) {
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

  const plan_date = String(body?.plan_date ?? '').trim();
  const slot = String(body?.slot ?? '').trim();
  const friday_type = (body?.friday_type ?? null) as 'day1' | 'day2' | null;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(plan_date)) return NextResponse.json({ error: 'Invalid plan_date (YYYY-MM-DD)' }, { status: 400 });
  if (!slot) return NextResponse.json({ error: 'Missing slot' }, { status: 400 });

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

  // 1) Open/create day_plan row (same semantics as /api/admin/dayplans/open)
  const { data: existing, error: exErr } = await adminDb
    .from('day_plans')
    .select('id,friday_type')
    .eq('plan_date', plan_date)
    .eq('slot', slot)
    .is('trashed_at', null)
    .limit(1);
  if (exErr) return NextResponse.json({ error: exErr.message }, { status: 400 });

  let planId: string | null = (existing?.[0] as any)?.id ?? null;

  if (!planId) {
    // Restore trashed if present
    const { data: trashed, error: trErr } = await adminDb
      .from('day_plans')
      .select('id,friday_type')
      .eq('plan_date', plan_date)
      .eq('slot', slot)
      .not('trashed_at', 'is', null)
      .limit(1);
    if (trErr) return NextResponse.json({ error: trErr.message }, { status: 400 });
    const tr = (trashed?.[0] as any) ?? null;
    if (tr?.id) {
      const patch: any = { trashed_at: null, updated_at: new Date().toISOString() };
      if (friday_type) patch.friday_type = friday_type;
      const { error: updErr } = await adminDb.from('day_plans').update(patch).eq('id', tr.id);
      if (updErr) return NextResponse.json({ error: updErr.message }, { status: 400 });
      planId = tr.id;
    }
  }

  if (!planId) {
    const payload: any = {
      plan_date,
      slot,
      friday_type,
      title: `Block ${slot}`,
      notes: null,
    };
    const { data: created, error: insErr } = await adminDb.from('day_plans').insert(payload).select('id').single();
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 400 });
    planId = (created as any).id;
  }

  // 2) Ensure primary day_plan_block exists for this plan+slot, based on classes + block times
  const { data: cls, error: clsErr } = await adminDb
    .from('classes')
    .select('id,name,room,block_label')
    .eq('block_label', slot)
    .maybeSingle();
  if (clsErr) return NextResponse.json({ error: clsErr.message }, { status: 400 });
  if (!cls?.id) return NextResponse.json({ error: `No class found for block_label=${slot} (Courses/Rooms)` }, { status: 400 });

  // Find existing block row
  const { data: blocks, error: blkErr } = await adminDb
    .from('day_plan_blocks')
    .select('id,day_plan_id,class_id')
    .eq('day_plan_id', planId)
    .eq('class_id', cls.id)
    .limit(1);
  if (blkErr) return NextResponse.json({ error: blkErr.message }, { status: 400 });

  let blockId: string | null = (blocks?.[0] as any)?.id ?? null;

  if (!blockId) {
    const { data: times, error: timeErr } = await adminDb.rpc('get_block_times_for_date', { plan_date });
    if (timeErr) return NextResponse.json({ error: timeErr.message }, { status: 400 });
    const arr = Array.isArray(times) ? times : [];
    const t = arr.find((r: any) => String(r?.slot ?? '').toUpperCase() === slot.toUpperCase()) ?? null;
    if (!t?.start_time || !t?.end_time) {
      return NextResponse.json({ error: `Missing block times for ${plan_date} slot ${slot}` }, { status: 400 });
    }

    const { data: createdBlock, error: blockInsErr } = await adminDb
      .from('day_plan_blocks')
      .insert({
        day_plan_id: planId,
        start_time: String(t.start_time),
        end_time: String(t.end_time),
        room: String((cls as any).room ?? ''),
        class_name: String((cls as any).name ?? `Block ${slot}`),
        details: null,
        class_id: cls.id,
      } as any)
      .select('id')
      .single();
    if (blockInsErr) return NextResponse.json({ error: blockInsErr.message }, { status: 400 });
    blockId = (createdBlock as any).id;
  }

  // 3) Apply (append) lesson flow override to the toc_block_plan for that block
  const now = new Date().toISOString();
  const { data: upserted, error: upErr } = await adminDb
    .from('toc_block_plans')
    .upsert(
      {
        day_plan_block_id: blockId,
        class_id: cls.id,
        plan_mode: 'lesson_flow',
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

  // Materialize public payload for /p
  const { error: pubErr } = await supabase.rpc('resolve_toc_block_plan_public_payload', {
    p_toc_block_plan_id: tocBlockPlanId,
  });
  if (pubErr) {
    return NextResponse.json({ error: `Failed to resolve public payload: ${pubErr.message}` }, { status: 400 });
  }

  await adminDb.from('toc_lesson_flow_phases').delete().eq('toc_block_plan_id', tocBlockPlanId);

  return NextResponse.json({
    ok: true,
    plan_id: planId,
    day_plan_block_id: blockId,
    toc_block_plan_id: tocBlockPlanId,
    appended: cleaned.length,
    total: persistedPhases.length,
  });
}
