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

  // Live-only: /p reads computed payload directly from dayplan + templates + overrides.
  const { data, error } = await supabase.rpc('get_public_day_plan_live', { plan_id: id });
  const payloadSource: 'live' | 'none' = data ? 'live' : 'none';

  const { data: layoutData } = await supabase.rpc('get_public_page_layout', { layout_id: 'public_plan' });

  if (error || !data) {
    notFound();
  }

  return <PublicPlanClient plan={data as any} layout={layoutData as any} />;
}
