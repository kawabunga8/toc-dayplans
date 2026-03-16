import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import crypto from 'node:crypto';
import { DateTime } from 'luxon';

export const runtime = 'nodejs';

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

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

  // Staff auth
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: isStaff, error: staffErr } = await supabase.rpc('is_staff');
  if (staffErr || !isStaff) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Fetch plan_date (needed for expiry)
  const { data: plan, error: planErr } = await supabase
    .from('day_plans')
    .select('id, plan_date')
    .eq('id', id)
    .single();
  if (planErr) {
    return NextResponse.json({ error: planErr.message }, { status: 400 });
  }

  const planDate = plan.plan_date as string; // YYYY-MM-DD

  // Ensure each class block has a seeded toc_block_plan with a template.
  // This makes /p usable even before anyone opens the TOC editor.
  {
    const { data: blocks, error: blkErr } = await supabase
      .from('day_plan_blocks')
      .select('id,class_id')
      .eq('day_plan_id', id);
    if (blkErr) return NextResponse.json({ error: blkErr.message }, { status: 400 });

    const classBlocks = (blocks ?? []).filter((b: any) => b?.id && b?.class_id);

    for (const b of classBlocks) {
      const blockId = String(b.id);
      const classId = String(b.class_id);

      // Latest active template for this class (if any)
      const { data: tpl, error: tplErr } = await supabase
        .from('class_toc_templates')
        .select('id,plan_mode')
        .eq('class_id', classId)
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (tplErr) return NextResponse.json({ error: tplErr.message }, { status: 400 });

      // Upsert toc_block_plans for this day_plan_block
      const { data: tbp, error: upErr } = await supabase
        .from('toc_block_plans')
        .upsert(
          {
            day_plan_block_id: blockId,
            class_id: classId,
            template_id: tpl?.id ?? null,
            plan_mode: (tpl?.plan_mode as any) ?? 'lesson_flow',
            updated_at: new Date().toISOString(),
          } as any,
          { onConflict: 'day_plan_block_id' }
        )
        .select('id')
        .maybeSingle();
      if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 });

      // No materialization step: /p reads live computed payload directly.
    }
  }

  // Resolve + store a published snapshot.
  const { data: resolved, error: resErr } = await supabase.rpc('resolve_day_plan_payload', { plan_id: id });
  if (resErr || !resolved) {
    return NextResponse.json({ error: resErr?.message ?? 'Failed to resolve day plan' }, { status: 400 });
  }

  // No automatic expiry (links only die when explicitly revoked).
  const { error: updErr } = await supabase
    .from('day_plans')
    .update({
      visibility: 'link',
      share_token_hash: null,
      share_expires_at: null,
      published_payload: resolved,
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, expires_at: null, plan_id: id });
}
