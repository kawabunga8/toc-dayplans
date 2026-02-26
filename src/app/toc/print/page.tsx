import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function mondayOfWeek(d: Date) {
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  const m = new Date(d);
  m.setDate(d.getDate() + diff);
  return m;
}

export default async function TocPrintPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const sp = await searchParams;
  const date = sp.date;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) notFound();

  const supabase = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });

  const monday = mondayOfWeek(new Date(date + 'T00:00:00Z')).toISOString().slice(0, 10);
  const { data: weekData, error: weekErr } = await supabase.rpc('get_public_plans_for_week', { week_start: monday });
  if (weekErr) notFound();

  const weekPlans = (weekData ?? []) as any[];
  const dayPlans = weekPlans.filter((p) => p.plan_date === date);

  const detail: any[] = [];
  for (const p of dayPlans) {
    const { data, error } = await supabase.rpc('get_public_day_plan_by_id', { plan_id: p.id });
    if (!error && data) detail.push(data);
  }

  const hasAny = detail.length > 0;

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 20 }}>Print all</div>
          <div style={{ opacity: 0.8 }}>{date} (published plans only)</div>
        </div>
        {hasAny ? (
          <button onClick={() => window.print()} style={{ padding: '8px 10px', borderRadius: 10, border: '1px solid #C9A84C', background: '#1F4E79', color: 'white', fontWeight: 900 }}>
            Print
          </button>
        ) : null}
      </div>

      <div style={{ marginTop: 16, display: 'grid', gap: 12 }}>
        {!hasAny ? <div className="emptyMsg" style={{ opacity: 0.8 }}>No published plans for this date.</div> : null}

        {detail.map((p: any) => (
          <section key={p.id} style={{ border: '1px solid #1F4E79', borderRadius: 12, padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ fontWeight: 900 }}>{p.title}</div>
              <div style={{ opacity: 0.8 }}>Block {p.slot}</div>
            </div>
            {p.notes ? <div style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{p.notes}</div> : null}
            <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
              {(p.blocks ?? []).map((b: any) => (
                <div key={b.id} style={{ padding: 10, borderRadius: 10, border: '1px solid #D6E4F0', background: '#F5F5F5' }}>
                  <div style={{ fontWeight: 800 }}>{b.class_name}</div>
                  <div style={{ opacity: 0.8, fontSize: 12 }}>
                    {String(b.start_time).slice(0, 5)}–{String(b.end_time).slice(0, 5)} • Room {b.room}
                  </div>
                  {b.details ? <div style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>{b.details}</div> : null}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <style>{`
        @media print {
          button { display: none !important; }
          /* If there are no published plans, printing should produce a blank page */
          .emptyMsg { display: none !important; }
        }
      `}</style>
    </main>
  );
}
