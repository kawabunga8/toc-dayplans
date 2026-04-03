import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

function isFriday(yyyyMmDd: string): boolean {
  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  return new Date(y, m - 1, d).getDay() === 5;
}

function weekday(yyyyMmDd: string): number {
  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
}

type SlotMapping = { slot: string; block_label: string; fallbackStart: string; fallbackEnd: string };

function scheduleMapping(planDate: string, friType: 'day1' | 'day2' | null): SlotMapping[] {
  const dow = weekday(planDate);
  const monThu = { P1: ['08:30', '09:40'], P2: ['09:45', '10:55'], Flex: ['11:00', '11:50'], Lunch: ['11:50', '12:35'], P5: ['12:40', '13:50'], P6: ['13:55', '15:05'] };
  const fri = { P1: ['09:10', '10:10'], P2: ['10:15', '11:15'], Chapel: ['11:20', '12:10'], Lunch: ['12:10', '13:00'], P5: ['13:00', '14:00'], P6: ['14:05', '15:05'] };

  const mt = (slot: string, label: string): SlotMapping => ({ slot, block_label: label, fallbackStart: (monThu as any)[slot][0], fallbackEnd: (monThu as any)[slot][1] });
  const fr = (slot: string, label: string): SlotMapping => ({ slot, block_label: label, fallbackStart: (fri as any)[slot][0], fallbackEnd: (fri as any)[slot][1] });

  if (dow === 5) {
    const day1 = { P1: 'A', P2: 'B', P5: 'C', P6: 'D' };
    const day2 = { P1: 'E', P2: 'F', P5: 'G', P6: 'H' };
    const map = friType === 'day2' ? day2 : day1;
    return [fr('P1', map.P1), fr('P2', map.P2), fr('Chapel', 'CHAPEL'), fr('Lunch', 'LUNCH'), fr('P5', map.P5), fr('P6', map.P6)];
  }
  if (dow === 1) return [mt('P1','A'), mt('P2','B'), mt('Flex','CLE'), mt('Lunch','LUNCH'), mt('P5','C'), mt('P6','D')];
  if (dow === 2) return [mt('P1','E'), mt('P2','F'), mt('Flex','FLEX'), mt('Lunch','LUNCH'), mt('P5','G'), mt('P6','H')];
  if (dow === 3) return [mt('P1','C'), mt('P2','D'), mt('Flex','FLEX'), mt('Lunch','LUNCH'), mt('P5','A'), mt('P6','B')];
  return [mt('P1','E'), mt('P2','F'), mt('Flex','CLE'), mt('Lunch','LUNCH'), mt('P5','G'), mt('P6','H')];
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: sourceId } = await ctx.params;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !anon) return NextResponse.json({ error: 'Missing Supabase env.' }, { status: 500 });

  const cookieStore = await cookies();
  const supabase = createServerClient(supabaseUrl, anon, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (all: Array<{ name: string; value: string; options?: any }>) => { for (const c of all) cookieStore.set(c); },
    },
  });

  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: isStaff, error: staffErr } = await supabase.rpc('is_staff');
  if (staffErr || !isStaff) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json().catch(() => null)) as null | {
    target_date?: string;
    target_slot?: string;
    target_friday_type?: 'day1' | 'day2' | null;
  };

  const targetDate = (body?.target_date ?? '').trim();
  const targetSlot = (body?.target_slot ?? '').trim().toUpperCase();
  const targetFridayType = (body?.target_friday_type ?? null) as 'day1' | 'day2' | null;

  if (!targetDate || !targetSlot) return NextResponse.json({ error: 'Missing target_date or target_slot' }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) return NextResponse.json({ error: 'target_date must be YYYY-MM-DD' }, { status: 400 });
  if (isFriday(targetDate) && !targetFridayType) return NextResponse.json({ error: 'target_friday_type is required for Fridays' }, { status: 400 });

  const adminDb = service ? createClient(supabaseUrl, service, { auth: { persistSession: false } }) : supabase;

  // 1. Get source blocks and their toc_block_plans
  const { data: srcBlocks, error: srcBlockErr } = await adminDb
    .from('day_plan_blocks')
    .select('id,class_id,start_time,end_time,room,class_name')
    .eq('day_plan_id', sourceId);
  if (srcBlockErr) return NextResponse.json({ error: srcBlockErr.message }, { status: 400 });
  if (!srcBlocks?.length) return NextResponse.json({ error: 'Source plan has no blocks' }, { status: 400 });

  const srcBlock = (srcBlocks as any[]).find((b) => b.class_id) ?? srcBlocks[0];
  const srcBlockId = String(srcBlock.id);

  const { data: srcTbp, error: srcTbpErr } = await adminDb
    .from('toc_block_plans')
    .select('plan_mode,override_payload,override_teacher_name,override_ta_name,override_ta_role,override_phone_policy,override_note_to_toc,override_assessment_touch_point')
    .eq('day_plan_block_id', srcBlockId)
    .maybeSingle();
  if (srcTbpErr) return NextResponse.json({ error: srcTbpErr.message }, { status: 400 });

  // 2. Find or create target day_plan
  let targetPlanId: string;
  {
    const { data: existing, error: exErr } = await adminDb
      .from('day_plans')
      .select('id,friday_type')
      .eq('plan_date', targetDate)
      .eq('slot', targetSlot)
      .is('trashed_at', null)
      .limit(1);
    if (exErr) return NextResponse.json({ error: exErr.message }, { status: 400 });

    if (existing?.length) {
      targetPlanId = String((existing[0] as any).id);
      // Update friday_type if needed
      if (targetFridayType && (existing[0] as any).friday_type !== targetFridayType) {
        await adminDb.from('day_plans').update({ friday_type: targetFridayType, updated_at: new Date().toISOString() }).eq('id', targetPlanId);
      }
    } else {
      // Check trashed
      const { data: trashed } = await adminDb
        .from('day_plans')
        .select('id')
        .eq('plan_date', targetDate)
        .eq('slot', targetSlot)
        .not('trashed_at', 'is', null)
        .limit(1);

      if (trashed?.length) {
        targetPlanId = String((trashed[0] as any).id);
        await adminDb.from('day_plans').update({ trashed_at: null, friday_type: targetFridayType, updated_at: new Date().toISOString() }).eq('id', targetPlanId);
      } else {
        const { data: created, error: createErr } = await adminDb
          .from('day_plans')
          .insert({ plan_date: targetDate, slot: targetSlot, friday_type: targetFridayType, title: `Block ${targetSlot}`, notes: null })
          .select('id')
          .single();
        if (createErr) return NextResponse.json({ error: createErr.message }, { status: 400 });
        targetPlanId = String((created as any).id);
      }
    }
  }

  // 3. Resolve target block: use existing if present, otherwise generate from rotation
  let targetBlockId: string;
  {
    const { data: existingBlocks } = await adminDb
      .from('day_plan_blocks')
      .select('id,class_id')
      .eq('day_plan_id', targetPlanId)
      .order('start_time', { ascending: true });

    if (existingBlocks?.length) {
      // Use the first block with a class_id, or just the first block
      const pick = (existingBlocks as any[]).find((b) => b.class_id) ?? existingBlocks[0];
      targetBlockId = String(pick.id);
    } else {
      // Generate a block from rotation + time defaults
      const templateKey: 'mon_thu' | 'fri' = isFriday(targetDate) ? 'fri' : 'mon_thu';

      const { data: timesRaw } = await adminDb
        .from('block_time_defaults')
        .select('template_key,slot,start_time,end_time')
        .eq('template_key', templateKey)
        .lte('effective_from', targetDate)
        .or(`effective_to.is.null,effective_to.gt.${targetDate}`)
        .order('start_time', { ascending: true });

      const times: Array<{ slot: string; start_time: string; end_time: string }> = (timesRaw ?? []).map((r: any) => ({
        slot: r.slot,
        start_time: String(r.start_time).slice(0, 5),
        end_time: String(r.end_time).slice(0, 5),
      }));

      // Get rotation labels
      let rotationLabels: string[] = [];
      try {
        const { data: rot } = await adminDb.rpc('get_rotation_for_date', { plan_date: targetDate, friday_type: targetFridayType });
        if (Array.isArray(rot)) rotationLabels = rot.map((x: any) => String(x).trim()).filter(Boolean);
      } catch { /* fall through to fallback */ }

      const slots = templateKey === 'fri' ? ['P1', 'P2', 'Chapel', 'Lunch', 'P5', 'P6'] : ['P1', 'P2', 'Flex', 'Lunch', 'P5', 'P6'];
      const mappingAll: SlotMapping[] = rotationLabels.length === slots.length
        ? slots.map((s, i) => {
            const fb = scheduleMapping(targetDate, targetFridayType).find((m) => m.slot === s);
            return { slot: s, block_label: String(rotationLabels[i] ?? '').trim(), fallbackStart: fb?.fallbackStart ?? '', fallbackEnd: fb?.fallbackEnd ?? '' };
          })
        : scheduleMapping(targetDate, targetFridayType);

      const mapping = mappingAll.find((m) => String(m.block_label).toUpperCase() === targetSlot);
      if (!mapping) return NextResponse.json({ error: `No rotation entry found for slot "${targetSlot}" on ${targetDate}` }, { status: 400 });

      const t = times.find((x) => x.slot === mapping.slot);
      const startTime = t?.start_time ?? mapping.fallbackStart;
      const endTime = t?.end_time ?? mapping.fallbackEnd;

      // Lookup class by block_label
      const { data: classRows } = await adminDb
        .from('classes')
        .select('id,name,room,block_label')
        .ilike('block_label', targetSlot)
        .limit(1);

      const cls = (classRows as any[])?.[0] ?? null;

      const { data: newBlock, error: newBlockErr } = await adminDb
        .from('day_plan_blocks')
        .insert({
          day_plan_id: targetPlanId,
          start_time: startTime,
          end_time: endTime,
          room: cls?.room ?? '—',
          class_name: cls?.name ?? targetSlot,
          details: null,
          class_id: cls?.id ?? null,
        })
        .select('id')
        .single();
      if (newBlockErr) return NextResponse.json({ error: newBlockErr.message }, { status: 400 });
      targetBlockId = String((newBlock as any).id);
    }
  }

  // 4. Copy toc_block_plan content to target block
  if (srcTbp) {
    // Get target block's class_id for seeding template
    const { data: tgtBlock } = await adminDb
      .from('day_plan_blocks')
      .select('class_id')
      .eq('id', targetBlockId)
      .maybeSingle();
    const tgtClassId = (tgtBlock as any)?.class_id ?? (srcBlock as any).class_id;

    // Get active template for target class (for template_id)
    const { data: tpl } = await adminDb
      .from('class_toc_templates')
      .select('id')
      .eq('class_id', tgtClassId)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const now = new Date().toISOString();
    const { error: upsertErr } = await adminDb
      .from('toc_block_plans')
      .upsert(
        {
          day_plan_block_id: targetBlockId,
          class_id: tgtClassId,
          template_id: tpl?.id ?? null,
          plan_mode: (srcTbp as any).plan_mode ?? 'lesson_flow',
          override_payload: (srcTbp as any).override_payload ?? null,
          override_teacher_name: (srcTbp as any).override_teacher_name ?? null,
          override_ta_name: (srcTbp as any).override_ta_name ?? null,
          override_ta_role: (srcTbp as any).override_ta_role ?? null,
          override_phone_policy: (srcTbp as any).override_phone_policy ?? null,
          override_note_to_toc: (srcTbp as any).override_note_to_toc ?? null,
          override_assessment_touch_point: (srcTbp as any).override_assessment_touch_point ?? null,
          updated_at: now,
        } as any,
        { onConflict: 'day_plan_block_id' }
      );
    if (upsertErr) return NextResponse.json({ error: upsertErr.message }, { status: 400 });
  }

  return NextResponse.json({ target_plan_id: targetPlanId, target_block_id: targetBlockId });
}
