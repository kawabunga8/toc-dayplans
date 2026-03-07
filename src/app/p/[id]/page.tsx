import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import PublicPlanClient from '../PublicPlanClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

  return <PublicPlanClient plan={data as any} layout={layoutData as any} />;
}
