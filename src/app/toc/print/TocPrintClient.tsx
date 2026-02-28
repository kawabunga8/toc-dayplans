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
  friday_type?: string | null;
  title: string;
  notes: string | null;
  blocks: PlanBlock[];
  toc?: {
    plan_mode: 'lesson_flow' | 'activity_options';
    teacher_name: string;
    ta_name: string;
    ta_role: string;
    phone_policy: string;
    note_to_toc: string;
    attendance_note?: string;
    class_overview_rows?: Array<{ label: string; value: string }>;
    division_of_roles_rows?: Array<{ who: string; responsibility: string }>;
    opening_routine_steps: Array<{ step_text: string }>;
    lesson_flow_phases: Array<{ time_text: string; phase_text: string; activity_text: string; purpose_text: string | null }>;
    activity_options: Array<{ title: string; description: string; details_text: string; toc_role_text: string | null; steps: Array<{ step_text: string }> }>;
    what_to_do_if_items: Array<{ scenario_text: string; response_text: string }>;
    end_of_class_items?: Array<{ item_text: string }>;
  };
};

function fmtTime(t: string | null | undefined) {
  return String(t ?? '').slice(0, 5);
}

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

      <div style={{ marginTop: 16, display: 'grid', gap: 18 }}>
        {!hasAny ? (
          <div className="emptyMsg" style={{ opacity: 0.8 }}>
            No published plans for this date.
          </div>
        ) : null}

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
          const range = t ? `${fmtTime(t.start_time)}–${fmtTime(t.end_time)}` : null;

          const b0 = (p.blocks ?? [])[0];
          const headerLine = b0
            ? `${range ?? `${fmtTime(b0.start_time)}–${fmtTime(b0.end_time)}`} • Room ${b0.room}`
            : range;

          const toc = p.toc;

          return (
            <section key={p.id} style={{ border: '2px solid #1F4E79', borderRadius: 12, padding: 12, pageBreakInside: 'avoid' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'baseline' }}>
                <div style={{ fontWeight: 900, fontSize: 16 }}>{p.title}</div>
                <div style={{ opacity: 0.8, fontSize: 12 }}>
                  Block {p.slot} • {date}
                </div>
              </div>

              {headerLine ? <div style={{ marginTop: 4, opacity: 0.85, fontSize: 12 }}>{headerLine}</div> : null}

              {toc?.note_to_toc?.trim() ? (
                <div style={{ marginTop: 10, padding: 10, border: '1px solid #1F4E79', borderRadius: 10, background: '#D6E4F0' }}>
                  <div style={{ fontWeight: 900, marginBottom: 6 }}>Note to the TOC</div>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{toc.note_to_toc}</div>
                </div>
              ) : p.notes?.trim() ? (
                <div style={{ marginTop: 10, padding: 10, border: '1px solid #1F4E79', borderRadius: 10, background: '#D6E4F0' }}>
                  <div style={{ fontWeight: 900, marginBottom: 6 }}>Teacher Notes</div>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{p.notes}</div>
                </div>
              ) : null}

              {toc ? (
                <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
                  {/* Overview */}
                  {toc.class_overview_rows?.length ? (
                    <div style={{ border: '1px solid #1F4E79', borderRadius: 10, overflow: 'hidden' }}>
                      <div style={{ background: '#1F4E79', color: 'white', padding: '6px 10px', fontWeight: 900 }}>Class Overview</div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <tbody>
                          {toc.class_overview_rows.map((r, i) => {
                            const resolved = String(r.value ?? '')
                              .replaceAll('{{class_name}}', String(b0?.class_name ?? p.title ?? ''))
                              .replaceAll('{{room}}', b0?.room ? `Room ${b0.room}` : '')
                              .replaceAll('{{time_range}}', range ?? (b0 ? `${fmtTime(b0.start_time)}–${fmtTime(b0.end_time)}` : ''))
                              .trim();
                            return (
                              <tr key={i}>
                                <td style={{ borderTop: '1px solid #D6E4F0', padding: 8, width: '30%', fontWeight: 900 }}>{r.label}</td>
                                <td style={{ borderTop: '1px solid #D6E4F0', padding: 8, whiteSpace: 'pre-wrap' }}>{resolved || '—'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : null}

                  {/* Roles */}
                  {toc.division_of_roles_rows?.length ? (
                    <div style={{ border: '1px solid #1F4E79', borderRadius: 10, overflow: 'hidden' }}>
                      <div style={{ background: '#1F4E79', color: 'white', padding: '6px 10px', fontWeight: 900 }}>Division of Roles</div>
                      <div style={{ padding: 10, fontSize: 12, display: 'grid', gap: 6 }}>
                        {toc.division_of_roles_rows.map((r, i) => (
                          <div key={i}>
                            <b>{r.who}:</b> {r.responsibility}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {/* Teacher + policy line */}
                  <div style={{ fontSize: 12, opacity: 0.9 }}>
                    {toc.teacher_name ? (
                      <span>
                        <b>Teacher:</b> {toc.teacher_name}
                      </span>
                    ) : null}
                    {toc.ta_name ? (
                      <span>
                        {' '}
                        • <b>TA:</b> {toc.ta_name}
                        {toc.ta_role ? ` (${toc.ta_role})` : ''}
                      </span>
                    ) : null}
                    {toc.phone_policy ? (
                      <span>
                        {' '}
                        • <b>Phones:</b> {toc.phone_policy}
                      </span>
                    ) : null}
                  </div>

                  {/* Opening routine */}
                  {toc.opening_routine_steps?.length ? (
                    <div style={{ border: '1px solid #1F4E79', borderRadius: 10, overflow: 'hidden' }}>
                      <div style={{ background: '#1F4E79', color: 'white', padding: '6px 10px', fontWeight: 900 }}>Opening routine</div>
                      <ol style={{ margin: 0, padding: '10px 10px 10px 26px', fontSize: 12 }}>
                        {toc.opening_routine_steps.map((s, i) => (
                          <li key={i} style={{ marginBottom: 4 }}>
                            {s.step_text}
                          </li>
                        ))}
                      </ol>
                    </div>
                  ) : null}

                  {/* Lesson Flow */}
                  {toc.plan_mode === 'lesson_flow' && toc.lesson_flow_phases?.length ? (
                    <div style={{ border: '1px solid #1F4E79', borderRadius: 10, overflow: 'hidden' }}>
                      <div style={{ background: '#1F4E79', color: 'white', padding: '6px 10px', fontWeight: 900 }}>Lesson flow</div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead>
                          <tr style={{ background: '#F5F5F5' }}>
                            <th style={{ textAlign: 'left', padding: 8, borderTop: '1px solid #D6E4F0' }}>Time</th>
                            <th style={{ textAlign: 'left', padding: 8, borderTop: '1px solid #D6E4F0' }}>Phase</th>
                            <th style={{ textAlign: 'left', padding: 8, borderTop: '1px solid #D6E4F0' }}>Activity</th>
                            <th style={{ textAlign: 'left', padding: 8, borderTop: '1px solid #D6E4F0' }}>Purpose</th>
                          </tr>
                        </thead>
                        <tbody>
                          {toc.lesson_flow_phases.map((ph, i) => (
                            <tr key={i}>
                              <td style={{ padding: 8, borderTop: '1px solid #D6E4F0', whiteSpace: 'nowrap' }}>{ph.time_text}</td>
                              <td style={{ padding: 8, borderTop: '1px solid #D6E4F0' }}>{ph.phase_text}</td>
                              <td style={{ padding: 8, borderTop: '1px solid #D6E4F0', whiteSpace: 'pre-wrap' }}>{ph.activity_text}</td>
                              <td style={{ padding: 8, borderTop: '1px solid #D6E4F0', whiteSpace: 'pre-wrap' }}>{ph.purpose_text ?? ''}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}

                  {/* Activity options */}
                  {toc.plan_mode === 'activity_options' && toc.activity_options?.length ? (
                    <div style={{ border: '1px solid #1F4E79', borderRadius: 10, overflow: 'hidden' }}>
                      <div style={{ background: '#1F4E79', color: 'white', padding: '6px 10px', fontWeight: 900 }}>Activity options</div>
                      <div style={{ padding: 10, fontSize: 12, display: 'grid', gap: 10 }}>
                        {toc.activity_options.map((o, i) => (
                          <div key={i} style={{ borderTop: i ? '1px solid #D6E4F0' : 'none', paddingTop: i ? 10 : 0 }}>
                            <div style={{ fontWeight: 900 }}>{o.title}</div>
                            <div style={{ opacity: 0.9 }}>{o.description}</div>
                            {o.details_text ? <div style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>{o.details_text}</div> : null}
                            {o.toc_role_text ? (
                              <div style={{ marginTop: 6 }}>
                                <b>TOC role:</b> {o.toc_role_text}
                              </div>
                            ) : null}
                            {o.steps?.length ? (
                              <ol style={{ marginTop: 6, paddingLeft: 18 }}>
                                {o.steps.map((st, j) => (
                                  <li key={j}>{st.step_text}</li>
                                ))}
                              </ol>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {/* What to do if */}
                  {toc.what_to_do_if_items?.length ? (
                    <div style={{ border: '1px solid #1F4E79', borderRadius: 10, overflow: 'hidden' }}>
                      <div style={{ background: '#1F4E79', color: 'white', padding: '6px 10px', fontWeight: 900 }}>What to do if…</div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead>
                          <tr style={{ background: '#F5F5F5' }}>
                            <th style={{ textAlign: 'left', padding: 8, borderTop: '1px solid #D6E4F0' }}>If…</th>
                            <th style={{ textAlign: 'left', padding: 8, borderTop: '1px solid #D6E4F0' }}>Then…</th>
                          </tr>
                        </thead>
                        <tbody>
                          {toc.what_to_do_if_items.map((w, i) => (
                            <tr key={i}>
                              <td style={{ padding: 8, borderTop: '1px solid #D6E4F0', whiteSpace: 'pre-wrap' }}>{w.scenario_text}</td>
                              <td style={{ padding: 8, borderTop: '1px solid #D6E4F0', whiteSpace: 'pre-wrap' }}>{w.response_text}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}

                  {/* End of class */}
                  {toc.end_of_class_items?.length ? (
                    <div style={{ border: '1px solid #1F4E79', borderRadius: 10, overflow: 'hidden' }}>
                      <div style={{ background: '#1F4E79', color: 'white', padding: '6px 10px', fontWeight: 900 }}>End of Class — Room Cleanup</div>
                      <ul style={{ margin: 0, padding: '10px 10px 10px 26px', fontSize: 12 }}>
                        {toc.end_of_class_items.map((it, i) => (
                          <li key={i} style={{ marginBottom: 4 }}>
                            {it.item_text}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div style={{ marginTop: 10, opacity: 0.8, fontSize: 12 }}>No TOC content for this plan.</div>
              )}
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
