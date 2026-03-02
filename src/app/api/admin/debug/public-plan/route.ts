import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export const runtime = 'nodejs';

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export async function GET(req: Request) {
  try {
    const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
    const anon = requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

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

    const { searchParams } = new URL(req.url);
    const id = (searchParams.get('id') ?? '').trim();
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const { data: planRow, error: planErr } = await supabase
      .from('day_plans')
      .select('id,plan_date,slot,visibility,trashed_at')
      .eq('id', id)
      .maybeSingle();
    if (planErr) throw planErr;
    if (!planRow) return NextResponse.json({ error: 'Dayplan not found' }, { status: 404 });

    const { data: blocks, error: blocksErr } = await supabase
      .from('day_plan_blocks')
      .select('id,day_plan_id,class_name,class_id,room,start_time,end_time')
      .eq('day_plan_id', id)
      .order('start_time', { ascending: true });
    if (blocksErr) throw blocksErr;

    const blockIds = (blocks ?? []).map((b: any) => b.id);

    const { data: tbps, error: tbpErr } = await supabase
      .from('toc_block_plans')
      .select('id,day_plan_block_id,template_id,plan_mode,updated_at,override_payload')
      .in('day_plan_block_id', blockIds.length ? blockIds : ['00000000-0000-0000-0000-000000000000']);
    if (tbpErr) throw tbpErr;

    const tbpIdByBlockId = new Map<string, string>();
    for (const r of tbps ?? []) tbpIdByBlockId.set(String((r as any).day_plan_block_id), String((r as any).id));

    // Load lesson flow rows per toc_block_plan_id (counts + sample)
    const tbpIds = (tbps ?? []).map((r: any) => r.id);
    const lfByTbp: Record<string, any[]> = {};
    if (tbpIds.length) {
      const { data: lf, error: lfErr } = await supabase
        .from('toc_lesson_flow_phases')
        .select('toc_block_plan_id,sort_order,time_text,phase_text,activity_text,purpose_text')
        .in('toc_block_plan_id', tbpIds)
        .order('sort_order', { ascending: true });
      if (lfErr) throw lfErr;
      for (const row of lf ?? []) {
        const k = String((row as any).toc_block_plan_id);
        if (!lfByTbp[k]) lfByTbp[k] = [];
        lfByTbp[k]!.push(row);
      }
    }

    const { data: publicPlan, error: pubErr } = await supabase.rpc('get_public_day_plan_by_id', { plan_id: id });
    if (pubErr) throw pubErr;

    return NextResponse.json({
      ok: true,
      plan: planRow,
      blocks,
      toc_block_plans: tbps,
      toc_block_plan_id_by_block_id: Object.fromEntries(Array.from(tbpIdByBlockId.entries())),
      lesson_flow_by_toc_block_plan_id: lfByTbp,
      lesson_flow_from_override_payload: Object.fromEntries(
        (tbps ?? []).map((t: any) => [
          String(t.id),
          Array.isArray(t.override_payload?.lesson_flow_phases) ? t.override_payload.lesson_flow_phases : null,
        ])
      ),
      public_payload: publicPlan,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}
