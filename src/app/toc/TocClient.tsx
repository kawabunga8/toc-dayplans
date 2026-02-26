'use client';

import { useMemo, useState, useEffect } from 'react';
import RcsBanner from '@/components/RcsBanner';

type PublicPlanSummary = {
  id: string;
  plan_date: string; // YYYY-MM-DD
  slot: string;
  title: string;
  share_expires_at: string | null;
};

type PublicClass = {
  id: string;
  block_label: string | null;
  name: string;
  room: string | null;
  sort_order: number | null;
};

type PublicPlanDetail = {
  id: string;
  plan_date: string;
  slot: string;
  friday_type: string | null;
  title: string;
  notes: string | null;
  blocks: Array<{
    id: string;
    start_time: string;
    end_time: string;
    room: string;
    class_name: string;
    details: string | null;
    class_id: string | null;
  }>;
};

export default function TocClient({
  weekStart,
  plans,
  classes,
}: {
  weekStart: string;
  plans: PublicPlanSummary[];
  classes: PublicClass[];
}) {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [view, setView] = useState<'today' | 'calendar'>('today');
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [selectedFridayType, setSelectedFridayType] = useState<'' | 'day1' | 'day2'>('');

  const [openPlanId, setOpenPlanId] = useState<string | null>(null);
  const [openPlan, setOpenPlan] = useState<PublicPlanDetail | null>(null);
  const [openPlanLoading, setOpenPlanLoading] = useState(false);

  const isSelectedFriday = useMemo(() => isFridayLocal(selectedDate), [selectedDate]);

  useEffect(() => {
    // Require explicit choice on Fridays.
    if (!isSelectedFriday) {
      setSelectedFridayType('');
      return;
    }
    if (!selectedFridayType) setSelectedFridayType('day1');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSelectedFriday]);

  const plansByDate = useMemo(() => {
    const m = new Map<string, PublicPlanSummary[]>();
    for (const p of plans) {
      const arr = m.get(p.plan_date) ?? [];
      arr.push(p);
      m.set(p.plan_date, arr);
    }
    for (const [k, arr] of m.entries()) {
      arr.sort((a, b) => String(a.slot).localeCompare(String(b.slot)));
      m.set(k, arr);
    }
    return m;
  }, [plans]);

  const publishedPlansBySlot = useMemo(() => {
    const m = new Map<string, PublicPlanSummary>();
    for (const p of plansByDate.get(selectedDate) ?? []) {
      m.set(String(p.slot).toUpperCase(), p);
    }
    return m;
  }, [plansByDate, selectedDate]);

  const classesForSelectedDate = useMemo(() => {
    const wanted = scheduleBlockLabelsForDate(selectedDate, selectedFridayType);
    const index = new Map<string, number>();
    wanted.forEach((b, i) => index.set(b.toUpperCase(), i));

    const filtered = classes
      .filter((c) => {
        const bl = (c.block_label ?? '').toUpperCase();
        return index.has(bl);
      })
      .slice();

    filtered.sort((a, b) => {
      const ai = index.get(String(a.block_label).toUpperCase()) ?? 999;
      const bi = index.get(String(b.block_label).toUpperCase()) ?? 999;
      return ai - bi;
    });

    return filtered;
  }, [classes, selectedDate, selectedFridayType]);

  const days = useMemo(() => buildWeekDays(weekStart), [weekStart]);

  useEffect(() => {
    if (!openPlanId) {
      setOpenPlan(null);
      return;
    }

    let cancelled = false;
    setOpenPlanLoading(true);
    void (async () => {
      try {
        const res = await fetch(`/api/public/plan?id=${encodeURIComponent(openPlanId)}`);
        const j = await res.json();
        if (!res.ok) throw new Error(j?.error ?? 'Failed to load plan');
        if (!cancelled) setOpenPlan(j.plan as PublicPlanDetail);
      } catch {
        if (!cancelled) setOpenPlan(null);
      } finally {
        if (!cancelled) setOpenPlanLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [openPlanId]);

  const openPlanPrimaryBlocks = useMemo(() => {
    if (!openPlan) return [];
    const wanted = `BLOCK ${String(openPlan.slot ?? '').toUpperCase()}`;
    const matches = (openPlan.blocks ?? []).filter((b) => blockLabelFromClassName(b.class_name).toUpperCase() === wanted);
    return matches.length ? matches : (openPlan.blocks ?? []);
  }, [openPlan]);

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
            <div style={styles.headerKicker}>TOC</div>
            <div style={styles.headerTitle}>{view === 'today' ? 'Today' : `Week of ${weekStart}`}</div>
            <div style={styles.headerSub}>Only published plans are clickable.</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end' }}>
            <div style={styles.navBtns}>
              <a href="/" style={styles.secondaryLink}>
                Home
              </a>
              <a href="/admin" style={styles.secondaryLink}>
                Staff admin
              </a>
              <button
                type="button"
                onClick={() => setView((v) => (v === 'today' ? 'calendar' : 'today'))}
                style={styles.secondaryBtn}
              >
                {view === 'today' ? 'Calendar' : 'Back to Today'}
              </button>
            </div>

            {view === 'today' ? (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <label style={{ display: 'grid', gap: 6, minWidth: 220 }}>
                  <span style={{ fontSize: 12, fontWeight: 900, color: RCS.midBlue }}>Date</span>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => {
                      setSelectedDate(e.target.value);
                      setOpenPlanId(null);
                    }}
                    style={styles.dateInput}
                  />
                </label>

                {isSelectedFriday ? (
                  <label style={{ display: 'grid', gap: 6, minWidth: 160 }}>
                    <span style={{ fontSize: 12, fontWeight: 900, color: RCS.midBlue }}>Friday Type</span>
                    <select
                      value={selectedFridayType}
                      onChange={(e) => {
                        setSelectedFridayType(e.target.value as any);
                        setOpenPlanId(null);
                      }}
                      style={styles.dateInput}
                    >
                      <option value="day1">Day 1</option>
                      <option value="day2">Day 2</option>
                    </select>
                  </label>
                ) : null}
              </div>
            ) : null}
          </div>
        </header>

        {view === 'calendar' ? (
          <>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
              <a href={`/toc?week=${shiftWeek(weekStart, -7)}`} style={styles.secondaryLink}>
                ← Prev
              </a>
              <a href={`/toc?week=${shiftWeek(weekStart, 7)}`} style={styles.secondaryLink}>
                Next →
              </a>

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

            <section style={styles.weekGrid}>
              {days.map((d) => {
                const has = (plansByDate.get(d.date)?.length ?? 0) > 0;
                const isToday = d.date === today;
                return (
                  <button
                    key={d.date}
                    onClick={() => {
                      setSelectedDate(d.date);
                      setView('today');
                      setOpenPlanId(null);
                    }}
                    style={styles.dayCell}
                  >
                    <div style={styles.dayTop}>
                      <div style={{ fontWeight: 900, color: RCS.deepNavy }}>{d.label}</div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        {isToday && <div style={styles.todayPill}>Today</div>}
                        {has && <div style={styles.dot} />}
                      </div>
                    </div>
                    <div style={{ opacity: 0.85 }}>{d.date}</div>
                    <div style={{ marginTop: 8, fontSize: 12, opacity: 0.9 }}>{has ? `${plansByDate.get(d.date)!.length} plan(s)` : 'No plan'}</div>
                  </button>
                );
              })}
            </section>
          </>
        ) : (
          <>
            <section style={styles.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={styles.sectionTitle}>Courses</div>
                <button
                  type="button"
                  onClick={() => {
                    const ids = (plansByDate.get(selectedDate) ?? []).map((p) => p.id);
                    if (!ids.length) return;
                    window.open(`/toc/print?date=${encodeURIComponent(selectedDate)}`, '_blank', 'noopener,noreferrer');
                  }}
                  disabled={(plansByDate.get(selectedDate) ?? []).length === 0}
                  style={(plansByDate.get(selectedDate) ?? []).length === 0 ? styles.primaryBtnDisabled : styles.primaryBtn}
                >
                  Print all
                </button>
              </div>

              <div style={{ overflowX: 'auto', marginTop: 10 }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Block</th>
                      <th style={styles.th}>Course</th>
                      <th style={styles.th}>Room</th>
                      <th style={styles.th}>Plan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classesForSelectedDate.map((c, i) => {
                      const slot = (c.block_label ?? '').toUpperCase();
                      const plan = publishedPlansBySlot.get(slot);
                      const isOpen = openPlanId === plan?.id;
                      const clickable = !!plan;

                      return (
                        <tr key={c.id} style={i % 2 === 0 ? styles.trEven : styles.trOdd}>
                          <td style={styles.tdLabel}>{slot || '—'}</td>
                          <td style={styles.td}>{c.name}</td>
                          <td style={styles.td}>{c.room || '—'}</td>
                          <td style={styles.tdRight}>
                            {clickable ? (
                              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                <button
                                  type="button"
                                  onClick={() => setOpenPlanId(plan.id)}
                                  style={isOpen ? styles.primaryBtnActive : styles.primaryBtn}
                                >
                                  View
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const url = `${window.location.origin}/p/${plan.id}`;
                                    try {
                                      await navigator.clipboard.writeText(url);
                                    } catch {
                                      // fallback
                                      window.prompt('Copy this link:', url);
                                    }
                                  }}
                                  style={styles.secondaryBtn}
                                >
                                  Share
                                </button>
                                <button
                                  type="button"
                                  onClick={() => window.open(`/p/${plan.id}?print=1`, '_blank', 'noopener,noreferrer')}
                                  style={styles.secondaryBtn}
                                >
                                  Print
                                </button>
                              </div>
                            ) : (
                              <span style={{ opacity: 0.6, fontWeight: 700 }}>No plan</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <section style={{ ...styles.card, marginTop: 16 }}>
              <div style={styles.sectionTitle}>Plan details</div>

              {!openPlanId ? (
                <div style={{ padding: 12, opacity: 0.8 }}>Select a published plan to view details.</div>
              ) : openPlanLoading ? (
                <div style={{ padding: 12, opacity: 0.8 }}>Loading…</div>
              ) : !openPlan ? (
                <div style={{ padding: 12, opacity: 0.8 }}>Plan not available.</div>
              ) : (
                <div style={{ padding: 12, display: 'grid', gap: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontWeight: 900, color: RCS.deepNavy }}>{openPlan.title}</div>
                      <div style={{ opacity: 0.85, fontSize: 12 }}>
                        {openPlan.plan_date} • Block <b>{openPlan.slot}</b>
                        {openPlan.friday_type ? ` • ${openPlan.friday_type}` : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <a href={`/p/${openPlan.id}`} target="_blank" rel="noopener noreferrer" style={styles.secondaryLink}>
                        Printable view →
                      </a>
                      <button type="button" onClick={() => setOpenPlanId(null)} style={styles.secondaryBtn}>
                        Close
                      </button>
                    </div>
                  </div>

                  {openPlan.notes?.trim() ? (
                    <div style={styles.notesBox}>
                      <div style={styles.notesLabel}>Notes</div>
                      <div style={styles.notesText}>{openPlan.notes}</div>
                    </div>
                  ) : null}

                  <div style={{ display: 'grid', gap: 10 }}>
                    {openPlanPrimaryBlocks.map((b) => (
                      <div key={b.id} style={styles.planBlockCard}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                          <div style={{ fontWeight: 900 }}>{b.class_name}</div>
                          <div style={{ opacity: 0.8, fontSize: 12 }}>
                            {formatTime(b.start_time)}–{formatTime(b.end_time)} • Room {b.room}
                          </div>
                        </div>
                        {b.details?.trim() ? <div style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{b.details}</div> : <div style={{ marginTop: 8, opacity: 0.7 }}>No details.</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function formatTime(t: string) {
  return t?.slice(0, 5) || t;
}

function blockLabelFromClassName(className: string) {
  const m = /\bBlock\s+([A-Z]+|CLE)\b/i.exec(className);
  if (m?.[1]) return `Block ${m[1].toUpperCase()}`;
  return 'Block';
}

function isFridayLocal(yyyyMmDd: string): boolean {
  const [y, m, d] = yyyyMmDd.split('-').map((x) => Number(x));
  if (!y || !m || !d) return false;
  const dt = new Date(y, m - 1, d);
  return dt.getDay() === 5;
}

function weekdayLocal(yyyyMmDd: string): number {
  const [y, m, d] = yyyyMmDd.split('-').map((x) => Number(x));
  const dt = new Date(y, m - 1, d);
  return dt.getDay();
}

function scheduleBlockLabelsForDate(planDate: string, friType: '' | 'day1' | 'day2'): string[] {
  const dow = weekdayLocal(planDate);
  if (dow === 5) {
    if (friType === 'day2') return ['E', 'F', 'G', 'H'];
    return ['A', 'B', 'C', 'D'];
  }
  if (dow === 1) return ['A', 'B', 'C', 'D'];
  if (dow === 2) return ['E', 'F', 'G', 'H'];
  if (dow === 3) return ['C', 'D', 'A', 'B'];
  // Thursday rotation
  if (dow === 4) return ['G', 'H', 'CLE', 'Lunch', 'E', 'F'];
  return ['E', 'F', 'G', 'H'];
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

  navBtns: { display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' },

  secondaryLink: {
    padding: '8px 10px',
    borderRadius: 10,
    border: `1px solid ${RCS.gold}`,
    background: RCS.white,
    color: RCS.deepNavy,
    textDecoration: 'none',
    fontWeight: 900,
  },
  secondaryBtn: {
    padding: '8px 10px',
    borderRadius: 10,
    border: `1px solid ${RCS.gold}`,
    background: 'transparent',
    color: RCS.deepNavy,
    textDecoration: 'none',
    fontWeight: 900,
    cursor: 'pointer',
  },
  dateInput: {
    padding: '8px 10px',
    borderRadius: 10,
    border: `1px solid ${RCS.deepNavy}`,
    background: RCS.white,
    color: RCS.textDark,
    fontWeight: 900,
  },

  card: { border: `1px solid ${RCS.deepNavy}`, borderRadius: 12, padding: 16, background: RCS.white, marginTop: 16 },
  sectionTitle: { fontWeight: 900, color: RCS.deepNavy },

  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    textAlign: 'left',
    padding: 10,
    background: RCS.deepNavy,
    color: RCS.white,
    borderBottom: `3px solid ${RCS.gold}`,
    fontSize: 12,
    letterSpacing: 0.4,
  },
  trEven: { background: RCS.white },
  trOdd: { background: RCS.lightGray },
  td: { padding: 10, borderBottom: `1px solid ${RCS.deepNavy}`, verticalAlign: 'top' },
  tdRight: { padding: 10, borderBottom: `1px solid ${RCS.deepNavy}`, textAlign: 'right', verticalAlign: 'top' },
  tdLabel: { padding: 10, borderBottom: `1px solid ${RCS.deepNavy}`, color: RCS.midBlue, fontWeight: 800, width: 70 },

  primaryBtn: {
    padding: '8px 10px',
    borderRadius: 10,
    border: `1px solid ${RCS.gold}`,
    background: RCS.deepNavy,
    color: RCS.white,
    cursor: 'pointer',
    fontWeight: 900,
  },
  primaryBtnActive: {
    padding: '8px 10px',
    borderRadius: 10,
    border: `2px solid ${RCS.gold}`,
    background: RCS.deepNavy,
    color: RCS.white,
    cursor: 'pointer',
    fontWeight: 900,
  },
  primaryBtnDisabled: {
    padding: '8px 10px',
    borderRadius: 10,
    border: `1px solid ${RCS.gold}`,
    background: RCS.lightGray,
    color: '#64748b',
    cursor: 'not-allowed',
    fontWeight: 900,
  },

  notesBox: { padding: 12, borderRadius: 10, border: `1px solid ${RCS.deepNavy}`, background: RCS.lightBlue },
  notesLabel: { fontWeight: 900, color: RCS.deepNavy, marginBottom: 6 },
  notesText: { whiteSpace: 'pre-wrap' },

  planBlockCard: { padding: 12, borderRadius: 10, border: `1px solid ${RCS.deepNavy}`, background: RCS.white },

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
  dayTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  dot: { width: 10, height: 10, borderRadius: 999, background: RCS.gold },
  todayPill: { fontSize: 12, fontWeight: 900, padding: '2px 8px', borderRadius: 999, background: RCS.lightBlue, color: RCS.deepNavy },
};
