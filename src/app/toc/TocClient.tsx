'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import RcsBanner from '@/components/RcsBanner';

type PublicPlanSummary = {
  id: string;
  plan_date: string; // YYYY-MM-DD
  slot: string;
  title: string;
  share_expires_at: string | null;
};

export default function TocClient({ weekStart, plans }: { weekStart: string; plans: PublicPlanSummary[] }) {
  const [openDate, setOpenDate] = useState<string | null>(null);
  const days = useMemo(() => buildWeekDays(weekStart), [weekStart]);

  const plansByDate = useMemo(() => {
    const m = new Map<string, PublicPlanSummary[]>();
    for (const p of plans) {
      const key = p.plan_date;
      const arr = m.get(key) ?? [];
      arr.push(p);
      m.set(key, arr);
    }
    // sort within day by slot
    for (const [k, arr] of m.entries()) {
      arr.sort((a, b) => String(a.slot).localeCompare(String(b.slot)));
      m.set(k, arr);
    }
    return m;
  }, [plans]);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const openPlans = openDate ? plansByDate.get(openDate) ?? [] : [];

  return (
    <div style={styles.shell}>
      <RcsBanner
        rightSlot={
          <a href="https://kawamura.webflow.io" target="_blank" rel="noopener noreferrer" style={styles.bannerSiteLink}>
            Mr. Kawamura’s website
          </a>
        }
      />

      <main style={styles.page}>
        <header style={styles.header}>
        <div>
          <div style={styles.headerKicker}>TOC Calendar</div>
          <div style={styles.headerTitle}>Week of {weekStart}</div>
          <div style={styles.headerSub}>Published plans only. Click a day to view.</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end' }}>
          <div style={styles.navBtns}>
            <a href="/" style={styles.secondaryLink}>
              Home
            </a>
            <a href="/admin" style={styles.secondaryLink}>
              Staff admin
            </a>
            <a href={`/toc?week=${shiftWeek(weekStart, -7)}`} style={styles.secondaryLink}>
              ← Prev
            </a>
            <a href={`/toc?week=${shiftWeek(weekStart, 7)}`} style={styles.secondaryLink}>
              Next →
            </a>
          </div>

          <label style={{ display: 'grid', gap: 6, minWidth: 220 }}>
            <span style={{ fontSize: 12, fontWeight: 900, color: RCS.midBlue }}>Jump to date</span>
            <input
              type="date"
              defaultValue={today}
              onChange={(e) => {
                const v = e.target.value;
                if (!v) return;
                const monday = mondayOf(v);
                window.location.href = `/toc?week=${monday}`;
              }}
              style={styles.dateInput}
            />
          </label>
        </div>
      </header>

      <section style={styles.weekGrid}>
        {days.map((d) => {
          const has = (plansByDate.get(d.date)?.length ?? 0) > 0;
          const isToday = d.date === today;
          return (
            <button
              key={d.date}
              onClick={() => (has ? setOpenDate(d.date) : null)}
              style={has ? styles.dayCell : styles.dayCellDisabled}
              aria-disabled={!has}
            >
              <div style={styles.dayTop}>
                <div style={{ fontWeight: 900, color: RCS.deepNavy }}>
                  {d.label}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {isToday && <div style={styles.todayPill}>Today</div>}
                  {has && <div style={styles.dot} />}
                </div>
              </div>
              <div style={{ opacity: 0.85 }}>{d.date}</div>
              <div style={{ marginTop: 8, fontSize: 12, opacity: 0.9 }}>
                {has ? `${plansByDate.get(d.date)!.length} plan(s)` : 'No plan'}
              </div>
            </button>
          );
        })}
      </section>

      {/* Side panel */}
      {openDate && (
        <>
          <div className="no-print" style={styles.overlay} onClick={() => setOpenDate(null)} />
          <aside className="no-print" style={styles.panel}>
            <div style={styles.panelHeader}>
              <div>
                <div style={{ fontWeight: 900, color: RCS.deepNavy }}>Plans for {openDate}</div>
                <div style={{ opacity: 0.8, fontSize: 12 }}>Click a plan to open the printable view.</div>
              </div>
              <button onClick={() => setOpenDate(null)} style={styles.smallBtn}>
                ✕
              </button>
            </div>

            {openPlans.length === 0 ? (
              <div style={{ padding: 12, opacity: 0.85 }}>No published plans for this day.</div>
            ) : (
              <div style={{ display: 'grid', gap: 10, padding: 12 }}>
                {openPlans.map((p) => (
                  <a key={p.id} href={`/p/${p.id}`} target="_blank" rel="noopener noreferrer" style={styles.planCard}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontWeight: 900, color: RCS.deepNavy }}>{p.slot}</div>
                        <div style={{ fontWeight: 900 }}>{p.title}</div>
                      </div>
                      <div style={{ opacity: 0.8, fontSize: 12, textAlign: 'right' }}>
                        Expires: {p.share_expires_at ? 'tonight' : '—'}
                      </div>
                    </div>
                    <div style={{ marginTop: 8, fontSize: 12, opacity: 0.85 }}>
                      Open →
                    </div>
                  </a>
                ))}
              </div>
            )}
          </aside>
        </>
      )}

      <style>{`
        @media print {
          .no-print { display: none !important; }
        }
      `}</style>
      </main>
    </div>
  );
}

function buildWeekDays(weekStart: string) {
  const [y, m, d] = weekStart.split('-').map((x) => Number(x));
  const base = new Date(y, m - 1, d);
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const out: Array<{ date: string; label: string }> = [];
  for (let i = 0; i < 5; i++) {
    const dt = new Date(base);
    dt.setDate(base.getDate() + i);
    out.push({ date: dt.toISOString().slice(0, 10), label: labels[i]! });
  }
  return out;
}

function shiftWeek(weekStart: string, deltaDays: number) {
  const [y, m, d] = weekStart.split('-').map((x) => Number(x));
  const base = new Date(y, m - 1, d);
  base.setDate(base.getDate() + deltaDays);
  return base.toISOString().slice(0, 10);
}

function mondayOf(yyyyMmDd: string): string {
  const [y, m, d] = yyyyMmDd.split('-').map((x) => Number(x));
  const dt = new Date(y, m - 1, d);
  const day = dt.getDay(); // Sun=0..Sat=6
  const diff = (day === 0 ? -6 : 1) - day;
  dt.setDate(dt.getDate() + diff);
  return dt.toISOString().slice(0, 10);
}

const RCS = {
  deepNavy: '#1F4E79',
  midBlue: '#2E75B6',
  lightBlue: '#D6E4F0',
  gold: '#C9A84C',
  white: '#FFFFFF',
  lightGray: '#F5F5F5',
  textDark: '#1A1A1A',
} as const;

const styles: Record<string, React.CSSProperties> = {
  shell: { minHeight: '100vh', background: RCS.white, color: RCS.textDark, fontFamily: 'system-ui' },
  page: { padding: 24, maxWidth: 1100, margin: '0 auto' },

  bannerSiteLink: {
    padding: '8px 10px',
    borderRadius: 10,
    border: `1px solid ${RCS.gold}`,
    background: 'transparent',
    color: RCS.white,
    textDecoration: 'none',
    fontWeight: 900,
    whiteSpace: 'nowrap',
  },

  header: {
    border: `1px solid ${RCS.deepNavy}`,
    borderRadius: 12,
    padding: 16,
    background: RCS.white,
    display: 'flex',
    justifyContent: 'space-between',
    gap: 16,
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
  headerKicker: { fontWeight: 900, color: RCS.midBlue, marginBottom: 6 },
  headerTitle: { fontWeight: 900, color: RCS.deepNavy, fontSize: 22, marginBottom: 4 },
  headerSub: { opacity: 0.85 },
  navBtns: { display: 'flex', gap: 10, flexWrap: 'wrap' },
  secondaryLink: {
    padding: '8px 10px',
    borderRadius: 10,
    border: `1px solid ${RCS.gold}`,
    background: RCS.white,
    color: RCS.deepNavy,
    textDecoration: 'none',
    fontWeight: 900,
  },
  dateInput: {
    padding: '8px 10px',
    borderRadius: 10,
    border: `1px solid ${RCS.deepNavy}`,
    background: RCS.white,
    color: RCS.textDark,
    fontWeight: 900,
  },
  weekGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
    gap: 12,
    marginTop: 16,
  },
  dayCell: {
    border: `1px solid ${RCS.deepNavy}`,
    borderRadius: 12,
    padding: 12,
    background: RCS.white,
    textAlign: 'left',
    cursor: 'pointer',
  },
  dayCellDisabled: {
    border: `1px solid ${RCS.lightGray}`,
    borderRadius: 12,
    padding: 12,
    background: RCS.lightGray,
    textAlign: 'left',
    cursor: 'default',
    color: '#475569',
  },
  dayTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 999, background: RCS.gold, border: `2px solid ${RCS.deepNavy}` },
  todayPill: {
    padding: '2px 8px',
    borderRadius: 999,
    background: RCS.deepNavy,
    border: `1px solid ${RCS.gold}`,
    color: RCS.white,
    fontSize: 12,
    fontWeight: 900,
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15, 23, 42, 0.35)',
    zIndex: 40,
  },
  panel: {
    position: 'fixed',
    top: 0,
    right: 0,
    height: '100vh',
    width: 'min(520px, 92vw)',
    background: RCS.white,
    borderLeft: `4px solid ${RCS.gold}`,
    zIndex: 50,
    boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
    display: 'flex',
    flexDirection: 'column',
  },
  panelHeader: {
    padding: 14,
    borderBottom: `1px solid ${RCS.deepNavy}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  smallBtn: {
    padding: '8px 10px',
    borderRadius: 10,
    border: `1px solid ${RCS.gold}`,
    background: RCS.white,
    color: RCS.deepNavy,
    cursor: 'pointer',
    fontWeight: 900,
  },
  planCard: {
    display: 'block',
    padding: 12,
    borderRadius: 12,
    border: `1px solid ${RCS.deepNavy}`,
    background: RCS.lightBlue,
    textDecoration: 'none',
    color: RCS.textDark,
  },
};
