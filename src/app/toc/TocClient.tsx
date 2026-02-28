'use client';

import { useMemo, useState, useEffect } from 'react';
import RcsBanner from '@/components/RcsBanner';
import { nextSchoolDayIso } from '@/lib/appRules/dates';

type PublicPlanSummary = {
  id: string;
  plan_date: string; // YYYY-MM-DD
  slot: string;
  title: string;
  // notes may be absent in older deployments / older RPC results; we hydrate on-demand.
  notes?: string | null;
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
  toc?: {
    plan_mode: 'lesson_flow' | 'activity_options';
    teacher_name: string;
    ta_name: string;
    ta_role: string;
    phone_policy: string;
    note_to_toc: string;
    opening_routine_steps: Array<{ step_text: string }>;
    lesson_flow_phases: Array<{ time_text: string; phase_text: string; activity_text: string; purpose_text: string | null }>;
    activity_options: Array<{ title: string; description: string; details_text: string; toc_role_text: string | null; steps: Array<{ step_text: string }> }>;
    what_to_do_if_items: Array<{ scenario_text: string; response_text: string }>;
    class_overview_rows?: Array<{ label: string; value: string }>;
    division_of_roles_rows?: Array<{ who: string; responsibility: string }>;
    end_of_class_items?: Array<{ item_text: string }>;
    attendance_note?: string;
  };
};

export default function TocClient({
  weekStart,
  plans,
  classes,
  initialView,
}: {
  weekStart: string;
  plans: PublicPlanSummary[];
  classes: PublicClass[];
  initialView?: 'today' | 'calendar';
}) {
  const today = useMemo(() => {
    // Default should be the NEXT school day (skip weekends).
    return nextSchoolDayIso(new Date());
  }, []);

  const [view, setView] = useState<'today' | 'calendar'>(initialView ?? 'today');
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [selectedFridayType, setSelectedFridayType] = useState<'' | 'day1' | 'day2'>('');

  const [openPlanId, setOpenPlanId] = useState<string | null>(null);
  const [openPlan, setOpenPlan] = useState<PublicPlanDetail | null>(null);
  const [openPlanLoading, setOpenPlanLoading] = useState(false);

  // Notes previews (hydrate from /api/public/plan as needed)
  const [notesByPlanId, setNotesByPlanId] = useState<Record<string, string | null>>({});

  // Share popover UI
  const [shareOpenPlanId, setShareOpenPlanId] = useState<string | null>(null);
  const [shareCopiedPlanId, setShareCopiedPlanId] = useState<string | null>(null);

  // Close drawer with ESC
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpenPlanId(null);
        setShareOpenPlanId(null);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const isSelectedFriday = useMemo(() => isFridayLocal(selectedDate), [selectedDate]);

  useEffect(() => {
    // Friday behavior: choose Day 1/2 based on which day has published plans; prompt if both.
    if (!isSelectedFriday) {
      setSelectedFridayType('');
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const { fetchFridayPublishedInfo, chooseFridayType } = await import('@/lib/appRules/friday');
        const published = await fetchFridayPublishedInfo(selectedDate);
        if (cancelled) return;

        const next = chooseFridayType({ current: selectedFridayType, published });
        if (next !== selectedFridayType) setSelectedFridayType(next);
      } catch {
        if (!cancelled && !selectedFridayType) setSelectedFridayType('day1');
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSelectedFriday, selectedDate]);

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

  async function ensureNotes(planId: string) {
    if (!planId) return;
    if (typeof notesByPlanId[planId] !== 'undefined') return;

    try {
      const res = await fetch(`/api/public/plan?id=${encodeURIComponent(planId)}`);
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error ?? 'Failed');
      const notes = (j?.plan?.notes ?? null) as string | null;
      setNotesByPlanId((prev) => ({ ...prev, [planId]: notes }));
    } catch {
      setNotesByPlanId((prev) => ({ ...prev, [planId]: null }));
    }
  }

  // Auto-hydrate notes for all published plans on the selected date (so Notes column is useful at a glance).
  useEffect(() => {
    const ids = (plansByDate.get(selectedDate) ?? []).map((p) => p.id).filter(Boolean);
    const missing = ids.filter((id) => typeof notesByPlanId[id] === 'undefined');
    if (missing.length === 0) return;

    let cancelled = false;
    void (async () => {
      await Promise.all(
        missing.map(async (id) => {
          if (cancelled) return;
          await ensureNotes(id);
        })
      );
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, plansByDate]);

  function planShareUrl(planId: string) {
    if (typeof window === 'undefined') return `/p/${planId}`;
    return `${window.location.origin}/p/${planId}`;
  }

  async function copyToClipboard(text: string) {
    const { copyToClipboard } = await import('@/lib/appRules/clipboard');
    return copyToClipboard(text);
  }

  const [rotationBlocks, setRotationBlocks] = useState<string[]>([]);
  const [blockTimesBySlot, setBlockTimesBySlot] = useState<Record<string, { start: string; end: string }>>({});

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const qs = new URLSearchParams({ date: selectedDate });
        if (isSelectedFriday && selectedFridayType) qs.set('friday_type', selectedFridayType);
        const res = await fetch(`/api/public/rotation?${qs.toString()}`);
        const j = await res.json();
        if (!res.ok) throw new Error(j?.error ?? 'Failed');
        if (!cancelled) setRotationBlocks((j?.blocks ?? []) as string[]);
      } catch {
        if (!cancelled) setRotationBlocks([]);
      }

      try {
        const res = await fetch(`/api/public/block-times?date=${encodeURIComponent(selectedDate)}`);
        const j = await res.json();
        if (!res.ok) throw new Error(j?.error ?? 'Failed');
        const slots = Array.isArray(j?.slots) ? j.slots : [];
        const map: Record<string, { start: string; end: string }> = {};
        for (const s of slots) {
          const slot = String(s?.slot ?? '').trim();
          if (!slot) continue;
          map[slot] = { start: String(s?.start_time ?? '').slice(0, 5), end: String(s?.end_time ?? '').slice(0, 5) };
        }
        if (!cancelled) setBlockTimesBySlot(map);
      } catch {
        if (!cancelled) setBlockTimesBySlot({});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedDate, isSelectedFriday, selectedFridayType]);

  const classesForSelectedDate = useMemo(() => {
    const wanted = rotationBlocks.map((b) => String(b).toUpperCase());
    const index = new Map<string, number>();
    wanted.forEach((b, i) => index.set(b, i));

    // Build rows in the exact rotation order.
    return wanted.map((label) => {
      const match = classes.find((c) => String(c.block_label ?? '').toUpperCase() === label);
      if (match) return match;
      // synthetic row for things like CLE/Lunch if they aren't in classes table
      return {
        id: `synthetic-${label}`,
        block_label: label,
        name: label,
        room: null,
        sort_order: null,
      } as PublicClass;
    });
  }, [classes, rotationBlocks]);

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

  const openPlanTimeRange = useMemo(() => {
    if (!openPlan) return null;
    const label = String(openPlan.slot ?? '').trim().toUpperCase();
    const idx = rotationBlocks.findIndex((b) => String(b).trim().toUpperCase() === label);
    if (idx < 0) return null;

    const isFri = isFridayLocal(openPlan.plan_date);
    const slots = isFri ? ['P1', 'P2', 'Chapel', 'Lunch', 'P5', 'P6'] : ['P1', 'P2', 'Flex', 'Lunch', 'P5', 'P6'];
    const slot = slots[idx] ?? null;
    if (!slot) return null;

    const t = blockTimesBySlot[slot];
    if (!t?.start || !t?.end) return null;
    return { start: t.start, end: t.end, slot };
  }, [openPlan, rotationBlocks, blockTimesBySlot]);

  return (
    <div style={styles.shell}>
      <RcsBanner
        rightSlot={
          <a href="https://kawamura.webflow.io" target="_blank" rel="noopener noreferrer" style={styles.bannerSiteLink}>
            Mr. Kawamura’s website
          </a>
        }
      />

      <main
        style={styles.page}
        onClick={() => {
          // click-away closes share popover
          if (shareOpenPlanId) setShareOpenPlanId(null);
        }}
      >
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
              <a href={`/toc?view=calendar&week=${shiftWeek(weekStart, -7)}`} style={styles.secondaryLink}>
                ← Prev
              </a>
              <a href={`/toc?view=calendar&week=${shiftWeek(weekStart, 7)}`} style={styles.secondaryLink}>
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
                    window.location.href = `/toc?view=calendar&week=${monday}`;
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
                      <th style={styles.th}>Notes</th>
                      <th style={styles.th}>Plan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classesForSelectedDate.map((c, i) => {
                      const slot = (c.block_label ?? '').toUpperCase();
                      const plan = publishedPlansBySlot.get(slot);
                      const isOpen = openPlanId === plan?.id;
                      const clickable = !!plan;

                      const noteText = plan?.notes ?? (plan?.id ? notesByPlanId[plan.id] : null);

                      return (
                        <tr key={c.id} style={i % 2 === 0 ? styles.trEven : styles.trOdd}>
                          <td style={styles.tdLabel}>{slot || '—'}</td>
                          <td style={styles.td}>{c.name}</td>
                          <td style={{ ...styles.td, width: 90 }}>{c.room || '—'}</td>
                          <td style={{ ...styles.td, minWidth: 260 }}>
                            {noteText?.trim() ? (
                              <div
                                style={{
                                  whiteSpace: 'pre-wrap',
                                  overflow: 'hidden',
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical' as any,
                                }}
                                title={noteText}
                              >
                                {noteText}
                              </div>
                            ) : (
                              <span style={{ opacity: 0.6, fontWeight: 700 }}>—</span>
                            )}
                          </td>
                          <td style={{ ...styles.tdRight, width: 260 }}>
                            {clickable ? (
                              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap', position: 'relative' }}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenPlanId(plan!.id);
                                    void ensureNotes(plan!.id);
                                  }}
                                  style={isOpen ? styles.primaryBtnActive : styles.primaryBtn}
                                >
                                  View
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setShareOpenPlanId((cur) => (cur === plan!.id ? null : plan!.id));
                                  }}
                                  style={styles.secondaryBtn}
                                >
                                  Share
                                </button>

                                {shareOpenPlanId === plan!.id ? (
                                  <div style={styles.sharePopover} onClick={(e) => e.stopPropagation()}>
                                    <div style={styles.shareRow}>
                                      <div style={styles.shareUrl}>{planShareUrl(plan!.id)}</div>
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          const url = planShareUrl(plan!.id);
                                          const ok = await copyToClipboard(url);
                                          if (ok) {
                                            setShareCopiedPlanId(plan!.id);
                                            setTimeout(() => setShareCopiedPlanId((x) => (x === plan!.id ? null : x)), 1200);
                                          }
                                        }}
                                        style={styles.copyBtn}
                                      >
                                        {shareCopiedPlanId === plan!.id ? 'Copied' : 'Copy'}
                                      </button>
                                    </div>
                                  </div>
                                ) : null}

                                <button
                                  type="button"
                                  onClick={() => window.open(`/p/${plan!.id}?print=1`, '_blank', 'noopener,noreferrer')}
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

            {/* Plan details now appear in a slide-in drawer (View → panel). */}
          </>
        )}
      </main>

      {/* Slide-in plan drawer */}
      <div
        style={{
          ...styles.drawerOverlay,
          opacity: openPlanId ? 1 : 0,
          pointerEvents: openPlanId ? 'auto' : 'none',
        }}
        onClick={() => setOpenPlanId(null)}
      />
      <aside
        aria-hidden={!openPlanId}
        style={{
          ...styles.drawer,
          transform: openPlanId ? 'translateX(0)' : 'translateX(102%)',
        }}
      >
        <div style={styles.drawerHeader}>
          <div style={{ fontWeight: 900, color: RCS.deepNavy }}>Plan</div>
          <button type="button" onClick={() => setOpenPlanId(null)} style={styles.secondaryBtn}>
            Close
          </button>
        </div>

        {!openPlanId ? (
          <div style={{ padding: 12, opacity: 0.8 }}>Select a published plan to view details.</div>
        ) : openPlanLoading ? (
          <div style={{ padding: 12, opacity: 0.8 }}>Loading…</div>
        ) : !openPlan ? (
          <div style={{ padding: 12, opacity: 0.8 }}>Plan not available.</div>
        ) : (
          <div style={{ padding: 12, display: 'grid', gap: 10 }}>
            <div>
              <div style={{ fontWeight: 900, color: RCS.deepNavy }}>{openPlan.title}</div>
              <div style={{ opacity: 0.85, fontSize: 12 }}>
                {openPlan.plan_date} • Block <b>{openPlan.slot}</b>
                {openPlan.friday_type ? ` • ${openPlan.friday_type}` : ''}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <a href={`/p/${openPlan.id}`} style={styles.primaryBtn}>
                Open
              </a>
              <a href={`/p/${openPlan.id}?print=1`} target="_blank" rel="noopener noreferrer" style={styles.secondaryLink}>
                Print
              </a>
            </div>

            {openPlan.toc?.note_to_toc?.trim() ? (
              <div style={styles.notesBox}>
                <div style={styles.notesLabel}>Note to the TOC</div>
                <div style={styles.notesText}>{openPlan.toc.note_to_toc}</div>
              </div>
            ) : openPlan.notes?.trim() ? (
              <div style={styles.notesBox}>
                <div style={styles.notesLabel}>Teacher Notes</div>
                <div style={styles.notesText}>{openPlan.notes}</div>
              </div>
            ) : null}

            {openPlan.toc?.class_overview_rows?.length ? (
              <div style={styles.planBlockCard}>
                <div style={{ fontWeight: 900, marginBottom: 6 }}>Class Overview</div>
                <div style={{ display: 'grid', gap: 6 }}>
                  {openPlan.toc.class_overview_rows.map((r, idx) => {
                    const raw = String(r.value ?? '').trim();
                    return (
                      <div key={idx}>
                        <b>{r.label}:</b> <span style={{ whiteSpace: 'pre-wrap' }}>{raw || '—'}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {openPlan.toc?.division_of_roles_rows?.length ? (
              <div style={styles.planBlockCard}>
                <div style={{ fontWeight: 900, marginBottom: 6 }}>Division of Roles</div>
                <div style={{ display: 'grid', gap: 6 }}>
                  {openPlan.toc.division_of_roles_rows.map((r, idx) => (
                    <div key={idx}>
                      <b>{r.who}:</b> <span style={{ whiteSpace: 'pre-wrap' }}>{r.responsibility}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {openPlan.toc?.end_of_class_items?.length ? (
              <div style={styles.planBlockCard}>
                <div style={{ fontWeight: 900, marginBottom: 6 }}>End of Class — Room Cleanup</div>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {openPlan.toc.end_of_class_items.map((it, idx) => (
                    <li key={idx} style={{ marginBottom: 4 }}>
                      {it.item_text}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {openPlan.toc ? (
              <div style={{ display: 'grid', gap: 10 }}>
                <div style={{ fontSize: 12, opacity: 0.9 }}>
                  {openPlan.toc.teacher_name ? (
                    <span>
                      <b>Teacher:</b> {openPlan.toc.teacher_name}
                    </span>
                  ) : null}
                  {openPlan.toc.ta_name ? (
                    <span>
                      {' '}
                      • <b>TA:</b> {openPlan.toc.ta_name}
                      {openPlan.toc.ta_role ? ` (${openPlan.toc.ta_role})` : ''}
                    </span>
                  ) : null}
                  {openPlan.toc.phone_policy ? (
                    <span>
                      {' '}
                      • <b>Phones:</b> {openPlan.toc.phone_policy}
                    </span>
                  ) : null}
                </div>

                {openPlan.toc.opening_routine_steps?.length ? (
                  <div style={styles.planBlockCard}>
                    <div style={{ fontWeight: 900, marginBottom: 6 }}>Opening routine</div>
                    <ol style={{ margin: 0, paddingLeft: 18 }}>
                      {openPlan.toc.opening_routine_steps.map((s, idx) => (
                        <li key={idx} style={{ marginBottom: 4 }}>
                          {s.step_text}
                        </li>
                      ))}
                    </ol>
                  </div>
                ) : null}

                {openPlan.toc.plan_mode === 'lesson_flow' && openPlan.toc.lesson_flow_phases?.length ? (
                  <div style={styles.planBlockCard}>
                    <div style={{ fontWeight: 900, marginBottom: 6 }}>Lesson flow</div>
                    <div style={{ display: 'grid', gap: 8 }}>
                      {openPlan.toc.lesson_flow_phases.map((p, idx) => (
                        <div key={idx} style={{ borderTop: idx ? '1px solid rgba(0,0,0,0.08)' : 'none', paddingTop: idx ? 8 : 0 }}>
                          <div>
                            <b>{p.time_text}</b> — {p.phase_text}
                          </div>
                          <div style={{ opacity: 0.9 }}>{p.activity_text}</div>
                          {p.purpose_text ? <div style={{ fontSize: 12, opacity: 0.85 }}><b>Purpose:</b> {p.purpose_text}</div> : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {openPlan.toc.plan_mode === 'activity_options' && openPlan.toc.activity_options?.length ? (
                  <div style={styles.planBlockCard}>
                    <div style={{ fontWeight: 900, marginBottom: 6 }}>Activity options</div>
                    <div style={{ display: 'grid', gap: 10 }}>
                      {openPlan.toc.activity_options.map((o, idx) => (
                        <div key={idx} style={{ borderTop: idx ? '1px solid rgba(0,0,0,0.08)' : 'none', paddingTop: idx ? 8 : 0 }}>
                          <div style={{ fontWeight: 900 }}>{o.title}</div>
                          <div style={{ opacity: 0.9 }}>{o.description}</div>
                          <div style={{ marginTop: 6 }}>{o.details_text}</div>
                          {o.toc_role_text ? <div style={{ fontSize: 12, opacity: 0.85, marginTop: 6 }}><b>TOC role:</b> {o.toc_role_text}</div> : null}
                          {o.steps?.length ? (
                            <ol style={{ marginTop: 8, paddingLeft: 18 }}>
                              {o.steps.map((st, j) => (
                                <li key={j} style={{ marginBottom: 4 }}>
                                  {st.step_text}
                                </li>
                              ))}
                            </ol>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {openPlan.toc.what_to_do_if_items?.length ? (
                  <div style={styles.planBlockCard}>
                    <div style={{ fontWeight: 900, marginBottom: 6 }}>What to do if…</div>
                    <div style={{ display: 'grid', gap: 8 }}>
                      {openPlan.toc.what_to_do_if_items.map((w, idx) => (
                        <div key={idx} style={{ borderTop: idx ? '1px solid rgba(0,0,0,0.08)' : 'none', paddingTop: idx ? 8 : 0 }}>
                          <div>
                            <b>If:</b> {w.scenario_text}
                          </div>
                          <div>
                            <b>Then:</b> {w.response_text}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div style={{ display: 'grid', gap: 10 }}>
              {openPlanPrimaryBlocks.map((b) => (
                <div key={b.id} style={styles.planBlockCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ fontWeight: 900 }}>{b.class_name}</div>
                    <div style={{ opacity: 0.8, fontSize: 12 }}>
                      {(openPlanTimeRange ? `${openPlanTimeRange.start}–${openPlanTimeRange.end}` : `${formatTime(b.start_time)}–${formatTime(b.end_time)}`)} • Room {b.room}
                    </div>
                  </div>
                  {b.details?.trim() ? (
                    <div style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{b.details}</div>
                  ) : (
                    <div style={{ marginTop: 8, opacity: 0.7 }}>No details.</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </aside>
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

// Rotation is now resolved via /api/public/rotation (DB-driven); hard-coded mapping removed.

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
    padding: '6px 10px',
    borderRadius: 10,
    border: `1px solid ${RCS.gold}`,
    background: RCS.white,
    color: RCS.deepNavy,
    textDecoration: 'none',
    fontWeight: 900,
    display: 'inline-flex',
    alignItems: 'center',
    lineHeight: 1,
    whiteSpace: 'nowrap',
    height: 'fit-content',
    alignSelf: 'flex-start',
  },
  secondaryBtn: {
    padding: '6px 10px',
    borderRadius: 10,
    border: `1px solid ${RCS.gold}`,
    background: 'transparent',
    color: RCS.deepNavy,
    textDecoration: 'none',
    fontWeight: 900,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    lineHeight: 1,
    whiteSpace: 'nowrap',
    height: 'fit-content',
    alignSelf: 'flex-start',
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
    padding: '6px 10px',
    borderRadius: 10,
    border: `1px solid ${RCS.gold}`,
    background: RCS.deepNavy,
    color: RCS.white,
    cursor: 'pointer',
    fontWeight: 900,
    display: 'inline-flex',
    alignItems: 'center',
    lineHeight: 1,
    whiteSpace: 'nowrap',
    height: 'fit-content',
    alignSelf: 'flex-start',
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

  drawerOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.35)',
    transition: 'opacity 160ms ease',
    zIndex: 50,
  },
  drawer: {
    position: 'fixed',
    top: 0,
    right: 0,
    height: '100vh',
    width: 'min(520px, 92vw)',
    background: RCS.white,
    borderLeft: `1px solid ${RCS.deepNavy}`,
    boxShadow: '0 16px 50px rgba(0,0,0,0.22)',
    transition: 'transform 180ms ease',
    zIndex: 60,
    display: 'grid',
    gridTemplateRows: 'auto 1fr',
    overflow: 'auto',
  },
  drawerHeader: {
    padding: 12,
    borderBottom: `1px solid ${RCS.deepNavy}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
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
  dayTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  dot: { width: 10, height: 10, borderRadius: 999, background: RCS.gold },
  todayPill: { fontSize: 12, fontWeight: 900, padding: '2px 8px', borderRadius: 999, background: RCS.lightBlue, color: RCS.deepNavy },

  sharePopover: {
    position: 'absolute',
    right: 0,
    top: 'calc(100% + 6px)',
    zIndex: 20,
    background: RCS.white,
    border: `1px solid ${RCS.deepNavy}`,
    borderRadius: 10,
    padding: 10,
    minWidth: 320,
    maxWidth: 440,
    boxShadow: '0 14px 32px rgba(0,0,0,0.18)',
  },
  shareRow: { display: 'flex', gap: 10, alignItems: 'center' },
  shareUrl: { fontSize: 12, opacity: 0.9, wordBreak: 'break-all', flex: 1 },
  copyBtn: {
    padding: '6px 8px',
    borderRadius: 8,
    border: `1px solid ${RCS.gold}`,
    background: RCS.deepNavy,
    color: RCS.white,
    cursor: 'pointer',
    fontWeight: 900,
    whiteSpace: 'nowrap',
  },
};
