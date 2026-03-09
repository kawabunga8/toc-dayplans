'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { TEACHER_ROLES, buildSection1FromFields, STANDING_GUARDRAILS } from '@/lib/teacherSuperprompt/superprompt';

type RoleId = 1 | 2 | 3 | 4 | 5 | 6;

type Phase = { time_text: string; phase_text: string; activity_text: string; purpose_text: string };

const RCS = {
  deepNavy: '#1F4E79',
  midBlue: '#2E75B6',
  lightBlue: '#D6E4F0',
  gold: '#C9A84C',
  white: '#FFFFFF',
  textDark: '#1A1A1A',
} as const;

export default function TeacherClient() {
  const [roleId, setRoleId] = useState<RoleId>(1);

  const [weekDate, setWeekDate] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${da}`;
  });
  const [weekLoading, setWeekLoading] = useState(false);
  const [weekErr, setWeekErr] = useState<string | null>(null);
  const [weekPlans, setWeekPlans] = useState<any>(null);
  const [selectedBlockKey, setSelectedBlockKey] = useState<string>('');

  const [subject, setSubject] = useState('');
  const [grades, setGrades] = useState<number[]>([]);
  const [classSize, setClassSize] = useState('');
  const [unitStage, setUnitStage] = useState('');
  const [classesRows, setClassesRows] = useState<any[]>([]);
  const [subjectTags, setSubjectTags] = useState<string[]>([]);
  const [diversity, setDiversity] = useState('');
  const [standards, setStandards] = useState('');
  const [standardsRows, setStandardsRows] = useState<any[]>([]);
  const [standardsLoading, setStandardsLoading] = useState(false);
  const [unitTopic, setUnitTopic] = useState('');
  const [tools, setTools] = useState('');
  const [notWorked, setNotWorked] = useState('');

  const [task, setTask] = useState('');
  const [constraints, setConstraints] = useState('');

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [phases, setPhases] = useState<Phase[] | null>(null);
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyErr, setApplyErr] = useState<string | null>(null);

  const role = useMemo(() => TEACHER_ROLES.find((r) => r.id === roleId)!, [roleId]);

  const blockOptions = useMemo(() => {
    const plansByDate = (weekPlans?.plans ?? {}) as Record<string, any[]>;
    const out: Array<{ key: string; label: string; plan_date: string; slot: string; class_name: string; room: string; plan_id: string; block_id: string; class_id: string | null }> = [];
    const norm = (s: string) => String(s || '').trim().toUpperCase();
    const parseBlockLabel = (className: string) => {
      const s = String(className || '');
      const m1 = s.match(/\(Block\s+([^\)]+)\)/i);
      if (m1?.[1]) return m1[1];
      const m2 = s.match(/Block\s+([A-Za-z0-9]+)/i);
      if (m2?.[1]) return m2[1];
      return '';
    };

    const selectedDate = String(weekDate || '').trim();

    for (const [date, plans] of Object.entries(plansByDate)) {
      // Filter the dropdown to only the selected date (within the loaded week).
      if (selectedDate && date !== selectedDate) continue;

      for (const p of plans || []) {
        const slotLabel = norm((p as any).slot);
        for (const b of p.day_plan_blocks || []) {
          const planId = String((p as any).id);
          const blockId = String((b as any).id);
          const classId = (b as any)?.class_id ? String((b as any).class_id) : null;

          const bLabel = norm((b as any)?.classes?.block_label || parseBlockLabel((b as any).class_name));
          // Only show blocks that match the day plan's slot (prevents applying to a non-primary block).
          if (slotLabel && bLabel && slotLabel !== bLabel) continue;

          const key = `${planId}:${blockId}`;
          const label = `Block ${(p as any).slot} • ${b.class_name || '—'}${b.room ? ` (${b.room})` : ''}`;
          out.push({ key, label, plan_date: date, slot: (p as any).slot, class_name: b.class_name || '', room: b.room || '', plan_id: planId, block_id: blockId, class_id: classId });
        }
      }
    }
    return out;
  }, [weekPlans]);

  const selectedBlock = useMemo(() => blockOptions.find((o) => o.key === selectedBlockKey) ?? null, [blockOptions, selectedBlockKey]);

  useEffect(() => {
    // Fetch week
    let cancelled = false;
    (async () => {
      setWeekLoading(true);
      setWeekErr(null);
      try {
        const res = await fetch(`/api/admin/dayplans/week?date=${encodeURIComponent(weekDate)}`);
        const j = await res.json();
        if (!res.ok) throw new Error(j?.error ?? 'Failed to load week');
        if (!cancelled) setWeekPlans(j);
      } catch (e: any) {
        if (!cancelled) setWeekErr(e?.message ?? 'Failed to load week');
      } finally {
        if (!cancelled) setWeekLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [weekDate]);

  const loadStandards = async (subjects?: string[]) => {
    setStandardsLoading(true);
    try {
      // If exactly one subject tag is present, ask the API to filter (less data).
      const qs = new URLSearchParams();
      if (subjects && subjects.length === 1) qs.set('subject', subjects[0]!);
      const url = `/api/admin/learning-standards${qs.toString() ? `?${qs.toString()}` : ''}`;
      const res = await fetch(url);
      const j = await res.json();
      if (!res.ok) return;
      setStandardsRows(Array.isArray(j?.rows) ? j.rows : []);
    } finally {
      setStandardsLoading(false);
    }
  };

  useEffect(() => {
    // Fetch classes (for grade dropdown, etc.)
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/classes');
        const j = await res.json();
        if (!res.ok) return;
        if (!cancelled) setClassesRows(Array.isArray(j?.rows) ? j.rows : []);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    // Load standards initially
    loadStandards(subjectTags).catch(() => null);

    // Reload standards when returning to this tab (after editing Policies)
    const onFocus = () => {
      loadStandards(subjectTags).catch(() => null);
    };
    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
    };
  }, [subjectTags]);

  const selectedClass = useMemo(() => {
    if (!selectedBlock?.class_id) return null;
    return classesRows.find((c: any) => String(c.id) === String(selectedBlock.class_id)) ?? null;
  }, [selectedBlock, classesRows]);

  const parseTags = (text: string) => {
    const s = String(text || '');
    const tags = Array.from(s.matchAll(/#([A-Za-z]+|\d+)/g)).map((m) => String(m[1] ?? ''));
    const subjects = tags
      .filter((t) => /[A-Za-z]/.test(t))
      .map((t) => t.toUpperCase())
      .filter(Boolean);
    const grades = tags
      .filter((t) => /^\d+$/.test(t))
      .map((t) => Number(t))
      .filter((n) => Number.isFinite(n));
    return { subjects: Array.from(new Set(subjects)), grades: Array.from(new Set(grades)).sort((a, b) => a - b) };
  };

  useEffect(() => {
    // When a block is selected, auto-fill some context fields.
    if (!selectedBlock) return;

    const { subjects: subjTags, grades: gradeTags } = parseTags(selectedBlock.class_name);
    setSubjectTags(subjTags);

    if (!subject.trim()) setSubject(selectedBlock.class_name);

    if (grades.length === 0) {
      // Prefer DB grade_level if user hasn't picked grades yet.
      const g = (selectedClass as any)?.grade_level;
      if ((typeof g === 'number' || typeof g === 'string') && String(g).trim()) {
        const n = Number(g);
        if (Number.isFinite(n)) setGrades([n]);
      } else if (gradeTags.length) {
        setGrades(gradeTags);
      }
    }
  }, [selectedBlock, selectedClass]);

  const gradeText = useMemo(() => {
    if (!grades.length) return '';
    if (grades.length === 1) return `Grade ${grades[0]}`;
    return `Grades ${grades.join('/')}`;
  }, [grades]);

  const section1 = useMemo(
    () =>
      buildSection1FromFields({
        subject: subject || selectedBlock?.class_name || '',
        grade: gradeText,
        classSize,
        diversity,
        standards,
        unitTopic,
        unitStage,
        tools,
        notWorked,
      }),
    [subject, gradeText, classSize, diversity, standards, unitTopic, unitStage, tools, notWorked, selectedBlock]
  );

  const fullPromptPreview = useMemo(() => {
    return `${section1}\n\n---\n\n${role.prompt}\n\n---\n\n${STANDING_GUARDRAILS}`;
  }, [section1, role.prompt]);

  return (
    <main style={{ padding: 24, maxWidth: 1100, margin: '0 auto', fontFamily: 'system-ui', background: RCS.white, color: RCS.textDark }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, color: RCS.deepNavy }}>Teacher</h1>
          <p style={{ marginTop: 6, opacity: 0.85 }}>Generate lesson flow suggestions using the Educator Superprompt (role + context + guardrails).</p>
        </div>
        <Link href="/admin" style={{ textDecoration: 'none', fontWeight: 900, color: RCS.deepNavy, border: `1px solid ${RCS.gold}`, padding: '8px 10px', borderRadius: 10 }}>
          ← Admin
        </Link>
      </div>

      <section style={{ marginTop: 16, border: `1px solid ${RCS.deepNavy}`, borderRadius: 12, padding: 16 }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Pick a dayplan block (week view)</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10, alignItems: 'end' }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.8 }}>Week containing date</div>
            <input type="date" value={weekDate} onChange={(e) => setWeekDate(e.target.value)} style={styles.input} />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.8 }}>Block (for selected date)</div>
            <select value={selectedBlockKey} onChange={(e) => setSelectedBlockKey(e.target.value)} style={styles.input}>
              <option value="">{weekLoading ? 'Loading…' : blockOptions.length ? 'Select a block' : 'No blocks for this date'}</option>
              {blockOptions.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {weekErr ? <div style={{ marginTop: 10, color: '#B00020', fontWeight: 800 }}>{weekErr}</div> : null}

        {selectedBlock ? (
          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.9 }}>
            Using: <b>{selectedBlock.plan_date}</b> • <b>Block {selectedBlock.slot}</b> • <b>{selectedBlock.class_name}</b>
          </div>
        ) : (
          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>Pick a block to auto-fill context (you can still edit fields below).</div>
        )}
      </section>

      <section style={{ marginTop: 16, border: `1px solid ${RCS.deepNavy}`, borderRadius: 12, padding: 16 }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Section 1 — Teaching context</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
          <Field label="Subject / Course" value={subject} setValue={setSubject} placeholder={selectedBlock?.class_name ? selectedBlock.class_name : 'e.g., ADST'} />

          <label style={{ display: 'grid', gap: 6, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.8 }}>Year/Grade</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              {[9, 10, 11, 12].map((g) => {
                const checked = grades.includes(g);
                return (
                  <label key={g} style={{ display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: 12, opacity: 0.95 }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={async () => {
                        const next = checked ? grades.filter((x) => x !== g) : [...grades, g].sort((a, b) => a - b);
                        setGrades(next);

                        // Persist to class record only if exactly one grade is selected.
                        if (selectedClass?.id) {
                          const patchGrade = next.length === 1 ? next[0] : null;
                          await fetch('/api/admin/classes', {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ id: selectedClass.id, grade_level: patchGrade }),
                          }).catch(() => null);
                        }
                      }}
                    />
                    <span>{g}</span>
                  </label>
                );
              })}
              {grades.length ? <span style={{ fontSize: 12, opacity: 0.7 }}>Selected: {grades.join('/')}</span> : <span style={{ fontSize: 12, opacity: 0.7 }}>—</span>}
            </div>
          </label>
          <Field label="Class size" value={classSize} setValue={setClassSize} placeholder="e.g., 28" />
          <Field label="Learner diversity" value={diversity} setValue={setDiversity} placeholder="e.g., EAL, IEP, mixed prior knowledge" />
          <label style={{ display: 'grid', gap: 6, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.8 }}>Standards</div>
              <button
                type="button"
                onClick={() => window.location.href = '/admin/policies?return=/admin/teacher'}
                style={{
                  padding: '6px 10px',
                  borderRadius: 10,
                  border: `1px solid ${RCS.deepNavy}`,
                  background: 'transparent',
                  color: RCS.deepNavy,
                  fontWeight: 900,
                  cursor: 'pointer',
                  fontSize: 12,
                }}
              >
                Policies…
              </button>
            </div>
            <select value={standards} onChange={(e) => setStandards(e.target.value)} style={styles.input}>
              <option value="">{standardsLoading ? 'Loading…' : '—'}</option>
              {(() => {
                let rows = [...(standardsRows ?? [])];

                // Filter by detected subject tag(s) if present.
                if (subjectTags.length) {
                  const allow = new Set(subjectTags.map((s) => s.toUpperCase()));
                  rows = rows.filter((r: any) => allow.has(String(r?.subject ?? '').toUpperCase()));
                }

                rows.sort((a: any, b: any) => {
                  const as = String(a?.subject ?? '');
                  const bs = String(b?.subject ?? '');
                  if (as !== bs) return as.localeCompare(bs);
                  const at = String(a?.standard_title ?? '');
                  const bt = String(b?.standard_title ?? '');
                  return at.localeCompare(bt);
                });

                const bySubject = new Map<string, any[]>();
                for (const r of rows) {
                  const s = String(r?.subject ?? 'Other') || 'Other';
                  const arr = bySubject.get(s) ?? [];
                  arr.push(r);
                  bySubject.set(s, arr);
                }

                return Array.from(bySubject.entries()).map(([subject, items]) => (
                  <optgroup key={subject} label={subject}>
                    {items.map((s: any) => {
                      const label = `${s.subject || ''}${s.standard_key ? ` ${s.standard_key}` : ''} — ${s.standard_title || ''}`.trim();
                      return (
                        <option key={s.id} value={label}>
                          {label}
                        </option>
                      );
                    })}
                  </optgroup>
                ));
              })()}
            </select>
          </label>
          <Field label="Unit topic" value={unitTopic} setValue={setUnitTopic} placeholder="e.g., Design thinking" />
          <label style={{ display: 'grid', gap: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.8 }}>Unit stage</div>
            <select value={unitStage} onChange={(e) => setUnitStage(e.target.value)} style={styles.input}>
              <option value="">—</option>
              <option value="beginning">beginning</option>
              <option value="mid-unit">mid-unit</option>
              <option value="end of unit">end of unit</option>
            </select>
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.8 }}>Tools/platforms</div>
            <select value={tools} onChange={(e) => setTools(e.target.value)} style={styles.input}>
              <option value="">—</option>
              <option value="no devices">no devices</option>
              <option value="Chromebooks">Chromebooks</option>
              <option value="iPads">iPads</option>
              <option value="maker supplies">maker supplies</option>
              <option value="projector">projector</option>
              <option value="whiteboard">whiteboard</option>
              <option value="other">other (edit in Task/Constraints)</option>
            </select>
          </label>
          <Field label="Hasn't worked well" value={notWorked} setValue={setNotWorked} placeholder="e.g., long lectures" />
        </div>
      </section>

      <section style={{ marginTop: 16, border: `1px solid ${RCS.deepNavy}`, borderRadius: 12, padding: 16 }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Section 2 — Choose your role</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
          {TEACHER_ROLES.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRoleId(r.id as RoleId)}
              style={{
                textAlign: 'left',
                borderRadius: 12,
                padding: 12,
                border: `1px solid ${roleId === r.id ? r.color : RCS.deepNavy}`,
                background: roleId === r.id ? `${r.color}1A` : '#fff',
                cursor: 'pointer',
              }}
            >
              <div style={{ fontSize: 18 }}>{r.emoji} <span style={{ fontWeight: 900, color: roleId === r.id ? r.color : RCS.textDark }}>{r.short}</span></div>
              <div style={{ fontSize: 12, opacity: 0.9, marginTop: 4 }}>{r.label}</div>
              <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>{r.description}</div>
            </button>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 16, border: `1px solid ${RCS.deepNavy}`, borderRadius: 12, padding: 16 }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Generate lesson flow</div>
        <label style={{ display: 'grid', gap: 6, marginBottom: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.8 }}>Task</div>
          <textarea value={task} onChange={(e) => setTask(e.target.value)} rows={3} style={styles.textarea} placeholder="What are we building today?" />
        </label>
        <label style={{ display: 'grid', gap: 6, marginBottom: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.8 }}>Constraints (optional)</div>
          <textarea value={constraints} onChange={(e) => setConstraints(e.target.value)} rows={2} style={styles.textarea} placeholder="Time, tech limits, group needs, must-include elements…" />
        </label>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            disabled={loading}
            onClick={async () => {
              setLoading(true);
              setErr(null);
              setOkMsg(null);
              setApplyErr(null);
              setPhases(null);
              try {
                const res = await fetch('/api/ai/suggest', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    section: 'teacher_lesson_flow_phases',
                    input: {
                      role_id: roleId,
                      section1_fields: { subject: subject || selectedBlock?.class_name || '', grade: gradeText, class_size: classSize, diversity, standards, unit_topic: unitTopic, unit_stage: unitStage, tools, not_worked: notWorked },
                      task,
                      constraints,
                      plan_date: selectedBlock?.plan_date ?? null,
                      slot: selectedBlock?.slot ?? null,
                      class_name: selectedBlock?.class_name ?? null,
                    },
                  }),
                });

                let j: any = null;
                let rawText: string | null = null;
                try {
                  j = await res.json();
                } catch {
                  rawText = await res.text().catch(() => null);
                }

                if (!res.ok) {
                  const msg = j?.error || rawText || `AI suggest failed (${res.status})`;
                  throw new Error(String(msg));
                }

                setPhases(j?.suggestion?.lesson_flow_phases ?? null);
              } catch (e: any) {
                setErr(e?.message ?? 'AI suggest failed');
              } finally {
                setLoading(false);
              }
            }}
            style={styles.primaryBtn}
          >
            {loading ? 'Generating…' : 'Generate'}
          </button>

          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(fullPromptPreview);
            }}
            style={styles.secondaryBtn}
          >
            Copy full superprompt (preview)
          </button>

          {phases ? (
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(JSON.stringify({ lesson_flow_phases: phases }, null, 2));
              }}
              style={styles.secondaryBtn}
            >
              Copy phases JSON
            </button>
          ) : null}

          {phases && selectedBlock ? (
            <button
              type="button"
              disabled={applyLoading}
              onClick={async () => {
                setApplyLoading(true);
                setApplyErr(null);
                setOkMsg(null);
                try {
                  const res = await fetch(`/api/admin/dayplans/blocks/${encodeURIComponent(selectedBlock.block_id)}/lesson-flow/append`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phases }),
                  });

                  let j: any = null;
                  let rawText: string | null = null;
                  try {
                    j = await res.json();
                  } catch {
                    rawText = await res.text().catch(() => null);
                  }

                  if (!res.ok) {
                    const msg = j?.error || rawText || `Apply failed (${res.status})`;
                    throw new Error(String(msg));
                  }

                  // Republish the day plan so /toc and /p reflect the changes.
                  const pubRes = await fetch(`/api/admin/dayplans/${encodeURIComponent(selectedBlock.plan_id)}/publish`, {
                    method: 'POST',
                  });
                  let pubJ: any = null;
                  try {
                    pubJ = await pubRes.json();
                  } catch {
                    // ignore
                  }
                  if (!pubRes.ok) {
                    throw new Error(pubJ?.error ?? `Republish failed (${pubRes.status})`);
                  }

                  setOkMsg(
                    `Applied + republished: appended ${j?.appended ?? '?'} phase(s) to ${selectedBlock.plan_date} block ${selectedBlock.slot} (${selectedBlock.class_name}). Redirecting…`
                  );

                  // Jump to the dayplan detail page.
                  window.location.href = `/admin/dayplans/${encodeURIComponent(selectedBlock.plan_id)}`;
                } catch (e: any) {
                  setApplyErr(e?.message ?? 'Apply failed');
                } finally {
                  setApplyLoading(false);
                }
              }}
              style={styles.primaryBtn}
            >
              {applyLoading ? 'Applying…' : 'Apply to selected dayplan (append)'}
            </button>
          ) : null}
        </div>

        {err ? <div style={{ marginTop: 10, color: '#B00020', fontWeight: 800 }}>{err}</div> : null}
        {applyErr ? <div style={{ marginTop: 10, color: '#B00020', fontWeight: 800 }}>{applyErr}</div> : null}
        {okMsg ? <div style={{ marginTop: 10, color: '#2D6A4F', fontWeight: 900 }}>{okMsg}</div> : null}

        {phases ? (
          <div style={{ marginTop: 12, border: `1px solid ${RCS.gold}`, borderRadius: 12, padding: 12, background: '#fffdf2' }}>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>Preview</div>
            <div style={{ display: 'grid', gap: 8 }}>
              {phases.map((p, idx) => (
                <div key={idx} style={{ borderTop: idx ? '1px solid rgba(0,0,0,0.08)' : 'none', paddingTop: idx ? 8 : 0 }}>
                  <div style={{ fontWeight: 900 }}>{p.time_text || `Phase ${idx + 1}`} — {p.phase_text}</div>
                  <div style={{ fontSize: 12, opacity: 0.9, marginTop: 4 }}><b>Activity:</b> {p.activity_text}</div>
                  <div style={{ fontSize: 12, opacity: 0.9, marginTop: 4 }}><b>Purpose:</b> {p.purpose_text}</div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}

function Field(props: { label: string; value: string; setValue: (v: string) => void; placeholder?: string }) {
  return (
    <label style={{ display: 'grid', gap: 6, minWidth: 0 }}>
      <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.8 }}>{props.label}</div>
      <input value={props.value} onChange={(e) => props.setValue(e.target.value)} style={styles.input} placeholder={props.placeholder} />
    </label>
  );
}

const styles: Record<string, React.CSSProperties> = {
  input: { width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.2)', fontSize: 14, minWidth: 0 },
  textarea: { width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.2)', fontSize: 14, fontFamily: 'inherit', minWidth: 0 },
  primaryBtn: {
    padding: '10px 12px',
    borderRadius: 10,
    border: `1px solid ${RCS.gold}`,
    background: RCS.deepNavy,
    color: '#fff',
    fontWeight: 900,
    cursor: 'pointer',
  },
  secondaryBtn: {
    padding: '10px 12px',
    borderRadius: 10,
    border: `1px solid ${RCS.deepNavy}`,
    background: 'transparent',
    color: RCS.deepNavy,
    fontWeight: 900,
    cursor: 'pointer',
  },
};
