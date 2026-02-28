'use client';

import { useEffect, useMemo, useState } from 'react';

type Student = { id: string; first_name: string; last_name: string };

type Block = {
  id: string;
  start_time: string;
  end_time: string;
  room: string;
  class_name: string;
  details: string | null;
  class_id: string | null;
  students?: Student[];
};

type TocOpeningStep = { step_text: string };

type TocLessonFlowPhase = {
  time_text: string;
  phase_text: string;
  activity_text: string;
  purpose_text: string | null;
};

type TocActivityOption = {
  title: string;
  description: string;
  details_text: string;
  toc_role_text: string | null;
  steps: Array<{ step_text: string }>;
};

type TocWhatIf = { scenario_text: string; response_text: string };

type PublicPlan = {
  id: string;
  plan_date: string;
  slot: string;
  friday_type: string | null;
  title: string;
  notes: string | null;
  blocks: Block[];
  toc?: {
    plan_mode: 'lesson_flow' | 'activity_options';
    teacher_name: string;
    ta_name: string;
    ta_role: string;
    phone_policy: string;
    note_to_toc: string;
    opening_routine_steps: TocOpeningStep[];
    lesson_flow_phases: TocLessonFlowPhase[];
    activity_options: TocActivityOption[];
    what_to_do_if_items: TocWhatIf[];
  };
};

export default function PublicPlanClient({ plan }: { plan: PublicPlan }) {
  const [rotationBlocks, setRotationBlocks] = useState<string[]>([]);
  const [blockTimesBySlot, setBlockTimesBySlot] = useState<Record<string, { start: string; end: string }>>({});

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          `/api/public/rotation?date=${encodeURIComponent(plan.plan_date)}${plan.friday_type ? `&friday_type=${encodeURIComponent(plan.friday_type)}` : ''}`
        );
        const j = await res.json();
        if (!res.ok) throw new Error(j?.error ?? 'Failed');
        if (!cancelled) setRotationBlocks((j?.blocks ?? []) as string[]);
      } catch {
        if (!cancelled) setRotationBlocks([]);
      }

      try {
        const res = await fetch(`/api/public/block-times?date=${encodeURIComponent(plan.plan_date)}`);
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
  }, [plan.plan_date, plan.friday_type]);

  // Auto-print support: /p/[id]?print=1 will trigger window.print() on load.
  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get('print') === '1') {
        setTimeout(() => window.print(), 250);
      }
    } catch {
      // ignore
    }
  }, []);

  // Show ONLY the selected plan (one block) when opened from TOC.
  const blocksToShow = useMemo(() => {
    const wanted = `BLOCK ${String(plan.slot ?? '').toUpperCase()}`;
    const matches = (plan.blocks ?? []).filter((b) => blockLabelFromClassName(b.class_name).toUpperCase() === wanted);
    return matches.length ? matches : (plan.blocks ?? []);
  }, [plan.blocks, plan.slot]);

  const computedRange = useMemo(() => {
    const label = String(plan.slot ?? '').trim().toUpperCase();
    const idx = rotationBlocks.findIndex((b) => String(b).trim().toUpperCase() === label);
    if (idx < 0) return null;

    const isFri = isFridayLocal(plan.plan_date);
    const slots = isFri ? ['P1', 'P2', 'Chapel', 'Lunch', 'P5', 'P6'] : ['P1', 'P2', 'Flex', 'Lunch', 'P5', 'P6'];
    const slot = slots[idx] ?? null;
    if (!slot) return null;

    const t = blockTimesBySlot[slot];
    if (!t?.start || !t?.end) return null;
    return { start: t.start, end: t.end, slot };
  }, [plan.plan_date, plan.slot, rotationBlocks, blockTimesBySlot]);

  const allIds = useMemo(() => blocksToShow.map((b) => b.id), [blocksToShow]);
  const [selected, setSelected] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const id of allIds) init[id] = true;
    return init;
  });

  // Attendance state is client-side only (no persistence yet).
  const [attendanceOpen, setAttendanceOpen] = useState<Record<string, boolean>>({});
  const [attendance, setAttendance] = useState<Record<string, Record<string, boolean>>>({});
  const [printAttendanceForBlockId, setPrintAttendanceForBlockId] = useState<string | null>(null);

  const selectedCount = useMemo(() => allIds.filter((id) => selected[id]).length, [allIds, selected]);

  // If the filtered set changes (rare), ensure selection map includes keys.
  useEffect(() => {
    setSelected((prev) => {
      const next: Record<string, boolean> = { ...prev };
      for (const id of allIds) if (typeof next[id] === 'undefined') next[id] = true;
      for (const k of Object.keys(next)) if (!allIds.includes(k)) delete next[k];
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allIds.join('|')]);

  function toggle(id: string) {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function selectAll(val: boolean) {
    setSelected(() => {
      const next: Record<string, boolean> = {};
      for (const id of allIds) next[id] = val;
      return next;
    });
  }

  function toggleAttendance(blockId: string) {
    setAttendanceOpen((prev) => ({ ...prev, [blockId]: !prev[blockId] }));
  }

  function ensureAttendanceDefaults(block: Block) {
    if (!block.students?.length) return;
    setAttendance((prev) => {
      if (prev[block.id]) return prev;
      const map: Record<string, boolean> = {};
      for (const s of block.students ?? []) map[s.id] = true;
      return { ...prev, [block.id]: map };
    });
  }

  function setStudentPresent(blockId: string, studentId: string, present: boolean) {
    setAttendance((prev) => {
      const cur = prev[blockId] ?? {};
      return { ...prev, [blockId]: { ...cur, [studentId]: present } };
    });
  }

  async function downloadAttendanceDocx(planId: string, blockId: string) {
    const url = `/api/docx/attendance?planId=${encodeURIComponent(planId)}&blockId=${encodeURIComponent(blockId)}`;
    window.open(url, '_blank');
  }

  const printMode: 'blocks' | 'attendance' = printAttendanceForBlockId ? 'attendance' : 'blocks';

  return (
    <div
      className="no-print backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) window.location.href = '/toc';
      }}
      style={styles.backdrop}
    >
      <main
        style={styles.page}
        data-print-mode={printMode}
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <header style={styles.header}>
          <div style={styles.titleBlock}>
            <div style={styles.titleLogoWrap}>
              <img src="/LOGO_Full_Colour_RCS_Landscape.png" alt="RCS" style={styles.titleLogo as any} />
            </div>
            <div style={styles.titleText}>
              <div style={styles.titleTeacher}>Mr. Kawamura</div>
              <div style={styles.titleClass}>{plan.title}</div>
              <div style={styles.titleSub}>TOC Day Plan</div>
              <div style={styles.titleDetail}>
                Block {plan.slot}
                {plan.friday_type ? ` · ${plan.friday_type === 'day1' ? 'Friday Day 1' : 'Friday Day 2'}` : ''}
                {' · '} {formatHeaderDate(plan.plan_date)}
              </div>
            </div>
          </div>

          <div className="no-print" style={styles.headerControls}>
            <a href="/toc" style={styles.secondaryBtn}>
              ← Back
            </a>
            <a href="/admin" style={styles.secondaryBtn}>
              Staff admin
            </a>
            <button onClick={() => selectAll(true)} style={styles.secondaryBtn}>
              Select all
            </button>
            <button onClick={() => selectAll(false)} style={styles.secondaryBtn}>
              Select none
            </button>

            <div style={{ flex: 1 }} />

            <div style={{ opacity: 0.9, fontWeight: 700 }}>
              Selected: <b>{selectedCount}</b> / {blocksToShow.length}
            </div>
            <button
              onClick={() => window.print()}
              disabled={selectedCount === 0}
              style={selectedCount === 0 ? styles.primaryBtnDisabled : styles.primaryBtn}
            >
              Print Selected
            </button>
          </div>

          {plan.toc?.note_to_toc?.trim() ? (
            <div style={styles.notesBox}>
              <div style={styles.notesLabel}>Note to the TOC</div>
              <div style={styles.notesText}>{plan.toc.note_to_toc}</div>
            </div>
          ) : plan.notes?.trim() ? (
            <div style={styles.notesBox}>
              <div style={styles.notesLabel}>Teacher Notes</div>
              <div style={styles.notesText}>{plan.notes}</div>
            </div>
          ) : null}
        </header>

        <div style={styles.blocksWrap}>
          {blocksToShow.map((b) => {
            const isOn = !!selected[b.id];
            const label = blockLabelFromClassName(b.class_name);
            const showAttendance = !!b.class_id;
            const open = !!attendanceOpen[b.id];
            const isPrintingAttendance = printAttendanceForBlockId === b.id;

            return (
              <section
                key={b.id}
                data-selected={isOn ? 'true' : 'false'}
                data-print-attendance={isPrintingAttendance ? 'true' : 'false'}
                style={styles.blockCard}
              >
                <div style={styles.blockHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <div style={styles.blockBadge}>{label}</div>
                    <div style={styles.blockTime}>
                      {computedRange ? `${computedRange.start}–${computedRange.end}` : `${formatTime(b.start_time)}–${formatTime(b.end_time)}`}
                    </div>
                    <div style={styles.blockClass}>{b.class_name}</div>
                    <div style={styles.blockRoom}>Room {b.room}</div>
                  </div>

                  <div className="no-print" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    {showAttendance && (
                      <button
                        onClick={() => {
                          ensureAttendanceDefaults(b);
                          toggleAttendance(b.id);
                        }}
                        style={styles.secondaryBtn}
                      >
                        {open ? 'Hide attendance' : 'Attendance list'}
                      </button>
                    )}

                    <label style={styles.checkboxLabel}>
                      <input type="checkbox" checked={isOn} onChange={() => toggle(b.id)} />
                      <span>Print</span>
                    </label>
                  </div>
                </div>

                {b.details?.trim() ? <div style={styles.blockDetails}>{b.details}</div> : null}

                {/* TOC plan content (template + overrides) */}
                {plan.toc ? (
                  <div style={styles.tocWrap}>
                    <div style={styles.tocMeta}>
                      {plan.toc.teacher_name ? <span><b>Teacher:</b> {plan.toc.teacher_name}</span> : null}
                      {plan.toc.ta_name ? <span> • <b>TA:</b> {plan.toc.ta_name}{plan.toc.ta_role ? ` (${plan.toc.ta_role})` : ''}</span> : null}
                      {plan.toc.phone_policy ? <span> • <b>Phones:</b> {plan.toc.phone_policy}</span> : null}
                    </div>

                    {plan.toc.opening_routine_steps?.length ? (
                      <div style={styles.tocSection}>
                        <div style={styles.tocSectionTitle}>Opening routine</div>
                        <ol style={styles.tocList as any}>
                          {plan.toc.opening_routine_steps.map((s, idx) => (
                            <li key={idx} style={{ marginBottom: 4 }}>{s.step_text}</li>
                          ))}
                        </ol>
                      </div>
                    ) : null}

                    {plan.toc.plan_mode === 'lesson_flow' && plan.toc.lesson_flow_phases?.length ? (
                      <div style={styles.tocSection}>
                        <div style={styles.tocSectionTitle}>Lesson flow</div>
                        <div style={{ display: 'grid', gap: 8 }}>
                          {plan.toc.lesson_flow_phases.map((p, idx) => (
                            <div key={idx} style={styles.tocCard}>
                              <div><b>{p.time_text}</b> — {p.phase_text}</div>
                              <div style={{ opacity: 0.9 }}>{p.activity_text}</div>
                              {p.purpose_text ? <div style={{ fontSize: 12, opacity: 0.85 }}><b>Purpose:</b> {p.purpose_text}</div> : null}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {plan.toc.plan_mode === 'activity_options' && plan.toc.activity_options?.length ? (
                      <div style={styles.tocSection}>
                        <div style={styles.tocSectionTitle}>Activity options</div>
                        <div style={{ display: 'grid', gap: 10 }}>
                          {plan.toc.activity_options.map((o, idx) => (
                            <div key={idx} style={styles.tocCard}>
                              <div style={{ fontWeight: 900 }}>{o.title}</div>
                              <div style={{ opacity: 0.9 }}>{o.description}</div>
                              <div style={{ marginTop: 6 }}>{o.details_text}</div>
                              {o.toc_role_text ? <div style={{ fontSize: 12, opacity: 0.85, marginTop: 6 }}><b>TOC role:</b> {o.toc_role_text}</div> : null}
                              {o.steps?.length ? (
                                <ol style={{ marginTop: 8 }}>
                                  {o.steps.map((st, j) => (
                                    <li key={j} style={{ marginBottom: 4 }}>{st.step_text}</li>
                                  ))}
                                </ol>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {plan.toc.what_to_do_if_items?.length ? (
                      <div style={styles.tocSection}>
                        <div style={styles.tocSectionTitle}>What to do if…</div>
                        <div style={{ display: 'grid', gap: 8 }}>
                          {plan.toc.what_to_do_if_items.map((w, idx) => (
                            <div key={idx} style={styles.tocCard}>
                              <div><b>If:</b> {w.scenario_text}</div>
                              <div><b>Then:</b> {w.response_text}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {showAttendance && open && (
                  <div className="attendanceWrap" style={styles.attendanceWrap}>
                    <div style={styles.attendanceHeader}>
                      <div style={{ fontWeight: 900, color: RCS.navy }}>Attendance List</div>
                      <button onClick={() => downloadAttendanceDocx(plan.id, b.id)} style={styles.primaryBtn}>
                        Download Attendance (.docx)
                      </button>
                    </div>

                    <div style={{ display: 'grid', gap: 6 }}>
                      {(b.students ?? []).map((s) => {
                        const present = attendance[b.id]?.[s.id] ?? true;
                        return (
                          <label key={s.id} style={styles.studentRow}>
                            <input type="checkbox" checked={present} onChange={(e) => setStudentPresent(b.id, s.id, e.target.checked)} />
                            <span style={{ fontWeight: 800 }}>{s.last_name},</span>
                            <span>{s.first_name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </section>
            );
          })}
        </div>

        {/* Print Selected moved to top */}

        <style>{`
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }

          /* Print must match screen */
          html, body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          main { border: 1px solid #D9D9D9 !important; border-radius: 0 !important; }
          /* remove backdrop padding in print */
          .no-print.backdrop { display: block !important; padding: 0 !important; background: white !important; }
          .no-print.backdrop > main { margin: 0 !important; max-width: none !important; width: 100% !important; }

          /* Default print mode: print selected block cards */
          main[data-print-mode="blocks"] [data-selected="false"] { display: none !important; }

          /* Attendance print mode: print only the attendance list for the requested block */
          main[data-print-mode="attendance"] header { display: none !important; }
          main[data-print-mode="attendance"] .stickyBar { display: none !important; }
          main[data-print-mode="attendance"] section[data-print-attendance="false"] { display: none !important; }
          main[data-print-mode="attendance"] section[data-print-attendance="true"] [data-selected] { display: block !important; }
          main[data-print-mode="attendance"] section[data-print-attendance="true"] .attendanceWrap { display: block !important; }
        }
      `}</style>
      </main>
    </div>
  );
}

function formatTime(t: string) {
  return t?.slice(0, 5) || t;
}

function formatHeaderDate(d: string) {
  return d;
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

const RCS = {
  navy: '#1E3A5F',
  gold: '#C9973A',
  blue: '#2E6DA4',
  lightBlue: '#DEEAF1',
  lightGold: '#FFF3CD',
  offWhite: '#F5F8FC',
  midGrey: '#D9D9D9',
  text: '#1A1A2E',
  white: '#FFFFFF',
} as const;

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    minHeight: '100vh',
    background: '#F0F4F8',
    padding: 24,
    boxSizing: 'border-box',
    fontFamily: 'Arial, sans-serif',
    color: RCS.text,
  },
  page: {
    padding: 0,
    maxWidth: 980,
    margin: '0 auto',
    fontFamily: 'Arial, sans-serif',
    color: RCS.text,
    background: RCS.white,
    border: `1px solid ${RCS.midGrey}`,
    borderRadius: 10,
    overflow: 'hidden',
  },
  header: { marginBottom: 16 },

  titleBlock: {
    background: RCS.navy,
    color: RCS.white,
    padding: '12px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: 20,
    borderBottom: `4px solid ${RCS.gold}`,
  },
  titleLogoWrap: {
    width: 230,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingRight: 10,
  },
  titleLogo: { maxWidth: 200, height: 'auto' },
  titleText: { display: 'grid', gap: 3 },
  titleTeacher: { fontSize: 14, color: RCS.gold },
  titleClass: { fontSize: 22, fontWeight: 700, color: RCS.white, lineHeight: 1.2 },
  titleSub: { fontSize: 14, color: RCS.gold },
  titleDetail: { fontSize: 12, color: '#BBCFDD' },

  headerControls: { display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', padding: 12, background: RCS.white },

  notesBox: {
    borderLeft: `4px solid ${RCS.blue}`,
    background: RCS.lightGold,
    padding: 14,
    borderTop: `1px solid ${RCS.midGrey}`,
  },
  notesLabel: { fontWeight: 700, color: '#7A5000', marginBottom: 6, fontSize: 13 },
  notesText: { whiteSpace: 'pre-wrap', fontSize: 14, color: '#222222' },

  blocksWrap: { display: 'grid', gap: 12, padding: 12 },
  blockCard: {
    border: `1px solid ${RCS.midGrey}`,
    borderRadius: 10,
    background: RCS.white,
    overflow: 'hidden',
  },
  blockHeader: {
    padding: '10px 12px',
    background: RCS.offWhite,
    borderBottom: `1px solid ${RCS.midGrey}`,
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  blockBadge: {
    background: RCS.blue,
    color: RCS.white,
    borderRadius: 4,
    padding: '4px 8px',
    fontWeight: 700,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
  },
  blockTime: { fontWeight: 700, color: RCS.blue, fontSize: 12 },
  blockClass: { fontWeight: 700, fontSize: 14 },
  blockRoom: { opacity: 0.9, fontSize: 12 },
  checkboxLabel: { display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, color: RCS.text, fontSize: 12 },
  blockDetails: { padding: 12, whiteSpace: 'pre-wrap', fontSize: 14, color: '#222222' },

  tocWrap: { padding: 12, borderTop: `1px solid ${RCS.midGrey}`, background: RCS.white },
  tocMeta: { fontSize: 12, opacity: 0.9, marginBottom: 10 },
  tocSection: { marginTop: 12 },
  tocSectionTitle: { fontWeight: 900, color: RCS.navy, marginBottom: 8 },
  tocList: { margin: 0, paddingLeft: 18 },
  tocCard: { border: `1px solid ${RCS.midGrey}`, borderRadius: 10, padding: 10, background: RCS.offWhite },

  attendanceWrap: { padding: 12, background: RCS.white },
  attendanceHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 10 },
  studentRow: { display: 'flex', gap: 10, alignItems: 'center' },
  stickyBar: {
    position: 'sticky',
    bottom: 0,
    marginTop: 16,
    padding: 12,
    borderRadius: 10,
    border: `1px solid ${RCS.midGrey}`,
    background: RCS.white,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    margin: 12,
  },
  primaryBtn: {
    padding: '10px 12px',
    borderRadius: 8,
    border: `1px solid ${RCS.gold}`,
    background: RCS.navy,
    color: RCS.white,
    cursor: 'pointer',
    fontWeight: 700,
  },
  primaryBtnDisabled: {
    padding: '10px 12px',
    borderRadius: 8,
    border: `1px solid ${RCS.midGrey}`,
    background: RCS.offWhite,
    color: '#64748b',
    cursor: 'not-allowed',
    fontWeight: 700,
  },
  secondaryBtn: {
    padding: '8px 10px',
    borderRadius: 8,
    border: `1px solid ${RCS.gold}`,
    background: RCS.white,
    color: RCS.navy,
    cursor: 'pointer',
    fontWeight: 700,
    textDecoration: 'none',
  },
};
