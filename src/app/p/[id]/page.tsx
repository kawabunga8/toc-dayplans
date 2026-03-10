import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import PublicPlanClient from '../PublicPlanClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function extractBlockLabel(className: string): string | null {
  const s = String(className ?? '');
  const m1 = s.match(/\(Block\s+([^\)]+)\)/i);
  if (m1?.[1]) return m1[1].trim();
  const m2 = s.match(/\bBlock\s+([A-Za-z0-9]+)\b/i);
  if (m2?.[1]) return m2[1].trim();
  return null;
}

export default async function PublicPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    notFound();
  }

  const supabase = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.rpc('get_public_day_plan_from_toc', { plan_id: id });
  const { data: layoutData } = await supabase.rpc('get_public_page_layout', { layout_id: 'public_plan' });

  if (error || !data) {
    notFound();
  }

  // Lightweight public self-diagnostics: compute primary block + toc_block_plan status
  let diagnostics: any = null;
  try {
    const { data: p } = await supabase.from('day_plans').select('id,slot').eq('id', id).maybeSingle();
    const slot = String((p as any)?.slot ?? '').trim();

    const { data: blocks } = await supabase
      .from('day_plan_blocks')
      .select('id,class_name,class_id,classes(block_label)')
      .eq('day_plan_id', id)
      .order('start_time', { ascending: true });

    const arr = Array.isArray(blocks) ? blocks : [];
    const want = slot.toUpperCase();

    const match = arr.find((b: any) => {
      const fromClass = String(b?.classes?.block_label ?? '').trim();
      const parsed = extractBlockLabel(String(b?.class_name ?? ''));
      const label = (fromClass || parsed || '').toUpperCase();
      return label && want && label === want;
    });

    const primary = match ?? arr[0] ?? null;
    const primaryBlockId = primary?.id ? String(primary.id) : null;

    let tbp: any = null;
    if (primaryBlockId) {
      const { data: row } = await supabase
        .from('toc_block_plans')
        .select('id,public_updated_at,public_payload')
        .eq('day_plan_block_id', primaryBlockId)
        .maybeSingle();
      tbp = row ?? null;
    }

    diagnostics = {
      plan_id: id,
      plan_slot: slot || null,
      primary_block_id: primaryBlockId,
      toc_block_plan_id: tbp?.id ?? null,
      toc_public_updated_at: tbp?.public_updated_at ?? null,
      toc_has_public_payload: tbp?.public_payload != null,
    };
  } catch {
    diagnostics = { plan_id: id };
  }

  return <PublicPlanClient plan={data as any} layout={layoutData as any} diagnostics={diagnostics} />;
}
