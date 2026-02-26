'use client';

import { useEffect } from 'react';

type PlanBlock = {
  id: string;
  start_time: string;
  end_time: string;
  room: string;
  class_name: string;
  details: string | null;
};

type PublicPlan = {
  id: string;
  plan_date: string;
  slot: string;
  title: string;
  notes: string | null;
  blocks: PlanBlock[];
};

export default function TocPrintClient({
  date,
  detail,
  rotationOrder,
  blockTimes,
}: {
  date: string;
  detail: PublicPlan[];
  rotationOrder: string[];
  blockTimes: Array<{ slot: string; start_time: string; end_time: string }>;
}) {
  const hasAny = detail.length > 0;

  // Optional auto-print: /toc/print?date=...&print=1
  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get('print') === '1' && hasAny) {
        setTimeout(() => window.print(), 250);
      }
    } catch {
      // ignore
    }
  }, [hasAny]);

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 20 }}>Print all</div>
          <div style={{ opacity: 0.8 }}>{date} (published plans only)</div>
        </div>
        {hasAny ? (
          <button
            type="button"
            onClick={() => window.print()}
            style={{ padding: '8px 10px', borderRadius: 10, border: '1px solid #C9A84C', background: '#1F4E79', color: 'white', fontWeight: 900 }}
          >
            Print
          </button>
        ) : null}
      </div>

      <div style={{ marginTop: 16, display: 'grid', gap: 12 }}>
        {!hasAny ? <div className="emptyMsg" style={{ opacity: 0.8 }}>No published plans for this date.</div> : null}

        {detail.map((p) => {
          // Compute slot time for this plan based on rotation order + effective block times
          const label = String(p.slot ?? '').trim().toUpperCase();
          const idx = (rotationOrder ?? []).findIndex((b) => String(b).trim().toUpperCase() === label);

          // NOTE: print-all is date-specific; blockTimes already chosen for mon_thu vs fri in RPC.
          const slotsMonThu = ['P1', 'P2', 'Flex', 'Lunch', 'P5', 'P6'];
          const slotsFri = ['P1', 'P2', 'Chapel', 'Lunch', 'P5', 'P6'];
          const isFri = new Date(date + 'T00:00:00Z').getUTCDay() === 5;
          const slotName = idx >= 0 ? (isFri ? slotsFri[idx] : slotsMonThu[idx]) : null;
          const t = slotName ? (blockTimes ?? []).find((x) => String(x.slot) === String(slotName)) : null;
          const range = t ? `${String(t.start_time).slice(0, 5)}–${String(t.end_time).slice(0, 5)}` : null;

          return (
            <section key={p.id} style={{ border: '1px solid #1F4E79', borderRadius: 12, padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ fontWeight: 900 }}>{p.title}</div>
                <div style={{ opacity: 0.8 }}>Block {p.slot}</div>
              </div>
              {p.notes ? <div style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{p.notes}</div> : null}
              <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
                {(p.blocks ?? []).map((b) => (
                  <div key={b.id} style={{ padding: 10, borderRadius: 10, border: '1px solid #D6E4F0', background: '#F5F5F5' }}>
                    <div style={{ fontWeight: 800 }}>{b.class_name}</div>
                    <div style={{ opacity: 0.8, fontSize: 12 }}>
                      {(range ?? `${String(b.start_time).slice(0, 5)}–${String(b.end_time).slice(0, 5)}`)} • Room {b.room}
                    </div>
                    {b.details ? <div style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>{b.details}</div> : null}
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <style>{`
        @media print {
          button { display: none !important; }
          .emptyMsg { display: none !important; }
        }
      `}</style>
    </main>
  );
}
