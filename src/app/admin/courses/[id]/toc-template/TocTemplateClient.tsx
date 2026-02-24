'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabaseClient';

type PlanMode = 'lesson_flow' | 'activity_options';

type ClassRow = {
  id: string;
  name: string;
  room: string | null;
  block_label: string | null;
};

type TemplateRow = {
  id: string;
  class_id: string;
  is_active: boolean;
  teacher_name: string;
  ta_name: string | null;
  ta_role: string | null;
  phone_policy: string;
  note_to_toc: string;
  plan_mode: PlanMode;
};

type RoutineStep = { id?: string; text: string };

type PhaseRow = {
  id?: string;
  time_text: string;
  phase_text: string;
  activity_text: string;
  purpose_text: string; // allow empty string in UI; saved as null when blank
};

type OptionStep = { id?: string; text: string };

type ActivityOption = {
  id?: string;
  title: string;
  description: string;
  details_text: string;
  toc_role_text: string;
  steps: OptionStep[];
};

type WhatIfItem = { id?: string; scenario_text: string; response_text: string };

type Status = 'loading' | 'idle' | 'saving' | 'error';

export default function TocTemplateClient({ classId }: { classId?: string }) {
  const params = useParams<{ id?: string }>();
  const effectiveClassId = (classId || params?.id || '') as string;

  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);

  const [klass, setKlass] = useState<ClassRow | null>(null);
  const [template, setTemplate] = useState<TemplateRow | null>(null);

  // top-level fields (these mirror template, but are editable even when template is null)
  const [teacherName, setTeacherName] = useState('');
  const [taName, setTaName] = useState('');
  const [taRole, setTaRole] = useState('');
  const [phonePolicy, setPhonePolicy] = useState('Not permitted');
  const [noteToToc, setNoteToToc] = useState('');

  // ordered content
  const [openingRoutine, setOpeningRoutine] = useState<RoutineStep[]>([]);

  const [planMode, setPlanMode] = useState<PlanMode>('lesson_flow');
  const [lessonFlow, setLessonFlow] = useState<PhaseRow[]>([]);
  const [activityOptions, setActivityOptions] = useState<ActivityOption[]>([]);

  const [whatIfItems, setWhatIfItems] = useState<WhatIfItem[]>([]);

  const title = useMemo(() => {
    if (!klass) return 'TOC Template';
    const block = klass.block_label ? `Block ${klass.block_label} — ` : '';
    return `${block}${klass.name} — TOC Template`;
  }, [klass]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setStatus('loading');
      setError(null);

      try {
        if (!effectiveClassId) {
          throw new Error('Missing class id in route.');
        }

        const supabase = getSupabaseClient();

        // 1) class header info
        const { data: classData, error: classErr } = await supabase
          .from('classes')
          .select('id,name,room,block_label')
          .eq('id', effectiveClassId)
          .single();
        if (classErr) throw classErr;

        if (cancelled) return;
        setKlass(classData as ClassRow);

        // 2) active template for class
        const { data: tpl, error: tplErr } = await supabase
          .from('class_toc_templates')
          .select('*')
          .eq('class_id', effectiveClassId)
          .eq('is_active', true)
          .maybeSingle();
        if (tplErr) throw tplErr;

        if (cancelled) return;

        if (!tpl) {
          // blank create form (with sensible defaults)
          setTemplate(null);

          // 1) Default teacher name (new templates only)
          setTeacherName('Mr. Shingo Kawamura');

          // 2) Default TA fields: blank
          setTaName('');
          setTaRole('');

          // 3) Default phone policy
          setPhonePolicy('Not permitted');

          // 4) Default note
          setNoteToToc('');

          // 5) Default plan mode
          setPlanMode('lesson_flow');

          // 6) Default opening routine by class type (inferred from block_label)
          const block = ((classData as any)?.block_label ?? '') as string;
          const isMusic = block === 'B' || block === 'H';
          const isComputer = block === 'A' || block === 'G';

          const defaultRoutine: RoutineStep[] = isMusic
            ? [
                { text: 'Students enter, unpack instruments, and begin individual scale practice independently' },
                { text: 'Teacher/TA leads the full band warm-up routine including scales and rhythm reading' },
                { text: 'TOC takes attendance during the warm-up window' },
              ]
            : isComputer
              ? [
                  { text: 'Students enter and log into their computers and the CMU/course environment independently' },
                  { text: 'TOC takes attendance' },
                  { text: 'Students begin working on the assigned task — they know what to do' },
                ]
              : [
                  { text: 'Students enter and settle' },
                  { text: 'TOC takes attendance' },
                  { text: 'Follow Andrea or TA lead if present' },
                ];

          setOpeningRoutine(defaultRoutine);

          // 7) Default What to Do If items
          setWhatIfItems([
            {
              scenario_text: 'A student is disruptive',
              response_text:
                'Have a quiet one-on-one conversation first. If it continues, remove the student from the activity and contact Mr. Kawamura on Teams.',
            },
            {
              scenario_text: 'A student is injured or unwell',
              response_text: 'Follow standard school first aid protocol. Send a responsible student to the office if needed.',
            },
            {
              scenario_text: 'Something urgent comes up',
              response_text: 'Mr. Kawamura is reachable on Microsoft Teams.',
            },
            {
              scenario_text: 'A student finishes early',
              response_text: 'Ask them to review previous material or work ahead quietly.',
            },
          ]);

          // other sections start blank
          setLessonFlow([]);
          setActivityOptions([]);

          setStatus('idle');
          return;
        }

        const tplRow = tpl as TemplateRow;
        setTemplate(tplRow);

        setTeacherName(tplRow.teacher_name ?? '');
        setTaName(tplRow.ta_name ?? '');
        setTaRole(tplRow.ta_role ?? '');
        setPhonePolicy(tplRow.phone_policy ?? 'Not permitted');
        setNoteToToc(tplRow.note_to_toc ?? '');
        setPlanMode(tplRow.plan_mode);

        const templateId = tplRow.id;

        // child rows
        const [routineRes, phaseRes, optRes, optStepsRes, whatIfRes] = await Promise.all([
          supabase
            .from('class_opening_routine_steps')
            .select('*')
            .eq('template_id', templateId)
            .order('sort_order', { ascending: true }),
          supabase
            .from('class_lesson_flow_phases')
            .select('*')
            .eq('template_id', templateId)
            .order('sort_order', { ascending: true }),
          supabase
            .from('class_activity_options')
            .select('*')
            .eq('template_id', templateId)
            .order('sort_order', { ascending: true }),
          supabase
            .from('class_activity_option_steps')
            .select('*')
            .in(
              'activity_option_id',
              // placeholder; will be overwritten once options loaded
              ['00000000-0000-0000-0000-000000000000']
            ),
          supabase
            .from('class_what_to_do_if_items')
            .select('*')
            .eq('template_id', templateId)
            .order('sort_order', { ascending: true }),
        ]);

        if (routineRes.error) throw routineRes.error;
        if (phaseRes.error) throw phaseRes.error;
        if (optRes.error) throw optRes.error;
        if (whatIfRes.error) throw whatIfRes.error;

        const routine = (routineRes.data ?? []).map((r: any) => ({ id: r.id, text: r.step_text })) as RoutineStep[];
        const phases = (phaseRes.data ?? []).map((r: any) => ({
          id: r.id,
          time_text: r.time_text,
          phase_text: r.phase_text,
          activity_text: r.activity_text,
          purpose_text: r.purpose_text ?? '',
        })) as PhaseRow[];

        const optionsRaw = (optRes.data ?? []) as any[];
        const optionIds = optionsRaw.map((o) => o.id);

        // load option steps only if options exist
        let optionStepsByOptionId: Record<string, OptionStep[]> = {};
        if (optionIds.length > 0) {
          const { data: stepsData, error: stepsErr } = await supabase
            .from('class_activity_option_steps')
            .select('*')
            .in('activity_option_id', optionIds)
            .order('sort_order', { ascending: true });
          if (stepsErr) throw stepsErr;
          optionStepsByOptionId = (stepsData ?? []).reduce((acc: Record<string, OptionStep[]>, s: any) => {
            const k = s.activity_option_id as string;
            acc[k] = acc[k] ?? [];
            acc[k].push({ id: s.id, text: s.step_text });
            return acc;
          }, {});
        }

        const options = optionsRaw.map((o) => ({
          id: o.id,
          title: o.title,
          description: o.description,
          details_text: o.details_text,
          toc_role_text: o.toc_role_text ?? '',
          steps: optionStepsByOptionId[o.id] ?? [],
        })) as ActivityOption[];

        const whatIf = (whatIfRes.data ?? []).map((r: any) => ({
          id: r.id,
          scenario_text: r.scenario_text,
          response_text: r.response_text,
        })) as WhatIfItem[];

        if (cancelled) return;
        setOpeningRoutine(routine);
        setLessonFlow(phases);
        setActivityOptions(options);
        setWhatIfItems(whatIf);

        setStatus('idle');
      } catch (e: any) {
        if (cancelled) return;
        setStatus('error');
        setError(humanizeError(e));
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [effectiveClassId]);

  function confirmSwitch(next: PlanMode) {
    if (next === planMode) return;
    const ok = window.confirm(
      'Switch plan mode? We will keep your existing content for the other mode, but only the active mode will be shown and used.'
    );
    if (!ok) return;
    setPlanMode(next);
  }

  async function saveAll() {
    setStatus('saving');
    setError(null);

    try {
      if (!teacherName.trim()) throw new Error('Teacher name is required');
      if (!phonePolicy.trim()) throw new Error('Phone policy is required');

      const supabase = getSupabaseClient();

      // upsert template
      const payload: any = {
        class_id: effectiveClassId,
        is_active: true,
        teacher_name: teacherName.trim(),
        ta_name: taName.trim() ? taName.trim() : null,
        ta_role: taRole.trim() ? taRole.trim() : null,
        phone_policy: phonePolicy.trim(),
        note_to_toc: noteToToc.trim() ? noteToToc.trim() : '',
        plan_mode: planMode,
        updated_at: new Date().toISOString(),
      };

      let templateId: string;
      if (template?.id) {
        const { data, error } = await supabase
          .from('class_toc_templates')
          .update(payload)
          .eq('id', template.id)
          .select('*')
          .single();
        if (error) throw error;
        templateId = (data as any).id;
        setTemplate(data as TemplateRow);
      } else {
        const { data, error } = await supabase
          .from('class_toc_templates')
          .insert({ ...payload, created_at: new Date().toISOString() })
          .select('*')
          .single();
        if (error) throw error;
        templateId = (data as any).id;
        setTemplate(data as TemplateRow);
      }

      // For simplicity + provenance later, wipe and reinsert child rows.
      // Opening routine
      {
        const { error: delErr } = await supabase.from('class_opening_routine_steps').delete().eq('template_id', templateId);
        if (delErr) throw delErr;
        const rows = openingRoutine
          .map((s, idx) => ({ template_id: templateId, sort_order: idx + 1, step_text: s.text.trim() }))
          .filter((r) => r.step_text);
        if (rows.length > 0) {
          const { error: insErr } = await supabase.from('class_opening_routine_steps').insert(rows);
          if (insErr) throw insErr;
        }
      }

      // Lesson flow phases
      {
        const { error: delErr } = await supabase.from('class_lesson_flow_phases').delete().eq('template_id', templateId);
        if (delErr) throw delErr;

        const rows = lessonFlow
          .map((p, idx) => ({
            template_id: templateId,
            sort_order: idx + 1,
            time_text: p.time_text.trim(),
            phase_text: p.phase_text.trim(),
            activity_text: p.activity_text.trim(),
            purpose_text: p.purpose_text.trim() ? p.purpose_text.trim() : null,
          }))
          .filter((r) => r.time_text || r.phase_text || r.activity_text || r.purpose_text);

        if (rows.length > 0) {
          const { error: insErr } = await supabase.from('class_lesson_flow_phases').insert(rows);
          if (insErr) throw insErr;
        }
      }

      // Activity options + steps
      {
        // delete steps first (via options) by deleting options and relying on cascade (options -> steps)
        const { error: delOptErr } = await supabase.from('class_activity_options').delete().eq('template_id', templateId);
        if (delOptErr) throw delOptErr;

        // insert options one-by-one so we can attach steps reliably
        for (let i = 0; i < activityOptions.length; i++) {
          const o = activityOptions[i];
          const optionPayload = {
            template_id: templateId,
            sort_order: i + 1,
            title: o.title.trim(),
            description: o.description.trim(),
            details_text: o.details_text.trim(),
            toc_role_text: o.toc_role_text.trim() ? o.toc_role_text.trim() : null,
          };

          // skip completely blank options
          if (!optionPayload.title && !optionPayload.description && !optionPayload.details_text && !optionPayload.toc_role_text) {
            continue;
          }

          const { data: insOpt, error: insOptErr } = await supabase
            .from('class_activity_options')
            .insert(optionPayload)
            .select('id')
            .single();
          if (insOptErr) throw insOptErr;

          const optionId = (insOpt as any).id as string;
          const steps = (o.steps ?? [])
            .map((s, idx) => ({ activity_option_id: optionId, sort_order: idx + 1, step_text: s.text.trim() }))
            .filter((s) => s.step_text);

          if (steps.length > 0) {
            const { error: insStepsErr } = await supabase.from('class_activity_option_steps').insert(steps);
            if (insStepsErr) throw insStepsErr;
          }
        }
      }

      // What to do if
      {
        const { error: delErr } = await supabase.from('class_what_to_do_if_items').delete().eq('template_id', templateId);
        if (delErr) throw delErr;

        const rows = whatIfItems
          .map((w, idx) => ({
            template_id: templateId,
            sort_order: idx + 1,
            scenario_text: w.scenario_text.trim(),
            response_text: w.response_text.trim(),
          }))
          .filter((r) => r.scenario_text || r.response_text);

        if (rows.length > 0) {
          const { error: insErr } = await supabase.from('class_what_to_do_if_items').insert(rows);
          if (insErr) throw insErr;
        }
      }

      setStatus('idle');
    } catch (e: any) {
      setStatus('error');
      setError(humanizeError(e));
    }
  }

  // --- UI helpers ---
  function moveUp<T>(arr: T[], idx: number): T[] {
    if (idx <= 0) return arr;
    const copy = [...arr];
    [copy[idx - 1], copy[idx]] = [copy[idx], copy[idx - 1]];
    return copy;
  }
  function moveDown<T>(arr: T[], idx: number): T[] {
    if (idx >= arr.length - 1) return arr;
    const copy = [...arr];
    [copy[idx + 1], copy[idx]] = [copy[idx], copy[idx + 1]];
    return copy;
  }

  return (
    <main style={styles.page}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div>
          <h1 style={styles.h1}>{title}</h1>
          {klass && (
            <div style={styles.subhead}>
              <span>
                <b>Class:</b> {klass.name}
              </span>
              <span style={{ margin: '0 10px', opacity: 0.35 }}>|</span>
              <span>
                <b>Block:</b> {klass.block_label ?? '—'}
              </span>
              <span style={{ margin: '0 10px', opacity: 0.35 }}>|</span>
              <span>
                <b>Room:</b> {klass.room ?? '—'}
              </span>
            </div>
          )}
        </div>

        <Link href="/admin/courses" style={styles.secondaryLink}>
          ← Back to Courses
        </Link>
      </div>

      {status === 'loading' && <div style={{ marginTop: 12 }}>Loading…</div>}

      {status === 'error' && error && <div style={styles.errorBox}>{error}</div>}

      {status !== 'loading' && (
        <div style={{ display: 'grid', gap: 14, marginTop: 14 }}>
          {/* 1) Top-level info */}
          <section style={styles.card}>
            <div style={styles.sectionHeader}>1. Top-level info</div>
            <div style={styles.grid2}>
              <label style={styles.field}>
                <div style={styles.label}>Teacher name *</div>
                <input value={teacherName} onChange={(e) => setTeacherName(e.target.value)} style={styles.input} />
              </label>
              <label style={styles.field}>
                <div style={styles.label}>Phone policy *</div>
                <input value={phonePolicy} onChange={(e) => setPhonePolicy(e.target.value)} style={styles.input} />
              </label>
              <label style={styles.field}>
                <div style={styles.label}>TA name (optional)</div>
                <input value={taName} onChange={(e) => setTaName(e.target.value)} style={styles.input} />
              </label>
              <label style={styles.field}>
                <div style={styles.label}>TA role (optional)</div>
                <input value={taRole} onChange={(e) => setTaRole(e.target.value)} style={styles.input} />
              </label>
            </div>
          </section>

          {/* 2) Note to TOC */}
          <section style={styles.card}>
            <div style={styles.sectionHeader}>2. Note to TOC</div>
            <label style={styles.field}>
              <div style={styles.label}>Note to the TOC (plain text)</div>
              <textarea value={noteToToc} onChange={(e) => setNoteToToc(e.target.value)} rows={6} style={styles.textarea} />
            </label>
          </section>

          {/* 3) Opening routine */}
          <section style={styles.card}>
            <div style={styles.sectionHeader}>3. Opening routine</div>
            <div style={styles.mutedSmall}>Ordered steps. Use up/down to reorder.</div>

            <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
              {openingRoutine.map((s, idx) => (
                <div key={idx} style={styles.rowItem}>
                  <input
                    value={s.text}
                    onChange={(e) =>
                      setOpeningRoutine((prev) => prev.map((x, i) => (i === idx ? { ...x, text: e.target.value } : x)))
                    }
                    placeholder={`Step ${idx + 1}`}
                    style={{ ...styles.input, flex: 1, minWidth: 280 }}
                  />
                  <div style={styles.rowBtns}>
                    <button onClick={() => setOpeningRoutine((prev) => moveUp(prev, idx))} style={styles.smallBtn}>
                      ↑
                    </button>
                    <button onClick={() => setOpeningRoutine((prev) => moveDown(prev, idx))} style={styles.smallBtn}>
                      ↓
                    </button>
                    <button
                      onClick={() => setOpeningRoutine((prev) => prev.filter((_, i) => i !== idx))}
                      style={styles.smallBtnDanger}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={() => setOpeningRoutine((prev) => [...prev, { text: '' }])} style={styles.secondaryBtn}>
              + Add step
            </button>
          </section>

          {/* 4) Plan mode */}
          <section style={styles.card}>
            <div style={styles.sectionHeader}>4. Plan mode</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
              <button
                onClick={() => confirmSwitch('lesson_flow')}
                style={planMode === 'lesson_flow' ? styles.tabActive : styles.tab}
              >
                Lesson Flow
              </button>
              <button
                onClick={() => confirmSwitch('activity_options')}
                style={planMode === 'activity_options' ? styles.tabActive : styles.tab}
              >
                Activity Options
              </button>
              <button
                onClick={() => {
                  const ok = window.confirm('Clear the inactive mode rows? This cannot be undone.');
                  if (!ok) return;
                  if (planMode === 'lesson_flow') setActivityOptions([]);
                  else setLessonFlow([]);
                }}
                style={styles.smallBtnDanger}
              >
                Clear inactive rows
              </button>
            </div>
          </section>

          {/* 5) Mode-specific content */}
          {planMode === 'lesson_flow' ? (
            <section style={styles.card}>
              <div style={styles.sectionHeader}>5. Lesson flow phases</div>
              <div style={styles.mutedSmall}>Ordered rows: time / phase / activity / purpose (purpose optional).</div>

              <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
                {lessonFlow.map((p, idx) => (
                  <div key={idx} style={styles.cardInner}>
                    <div style={styles.rowBetween}>
                      <div style={{ fontWeight: 900, color: RCS.deepNavy }}>Phase {idx + 1}</div>
                      <div style={styles.rowBtns}>
                        <button onClick={() => setLessonFlow((prev) => moveUp(prev, idx))} style={styles.smallBtn}>
                          ↑
                        </button>
                        <button onClick={() => setLessonFlow((prev) => moveDown(prev, idx))} style={styles.smallBtn}>
                          ↓
                        </button>
                        <button
                          onClick={() => setLessonFlow((prev) => prev.filter((_, i) => i !== idx))}
                          style={styles.smallBtnDanger}
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    <div style={styles.grid2}>
                      <label style={styles.field}>
                        <div style={styles.label}>Time</div>
                        <input
                          value={p.time_text}
                          onChange={(e) =>
                            setLessonFlow((prev) => prev.map((x, i) => (i === idx ? { ...x, time_text: e.target.value } : x)))
                          }
                          style={styles.input}
                        />
                      </label>
                      <label style={styles.field}>
                        <div style={styles.label}>Phase</div>
                        <input
                          value={p.phase_text}
                          onChange={(e) =>
                            setLessonFlow((prev) => prev.map((x, i) => (i === idx ? { ...x, phase_text: e.target.value } : x)))
                          }
                          style={styles.input}
                        />
                      </label>
                      <label style={{ ...styles.field, gridColumn: '1 / -1' }}>
                        <div style={styles.label}>Activity</div>
                        <textarea
                          value={p.activity_text}
                          onChange={(e) =>
                            setLessonFlow((prev) =>
                              prev.map((x, i) => (i === idx ? { ...x, activity_text: e.target.value } : x))
                            )
                          }
                          rows={4}
                          style={styles.textarea}
                        />
                      </label>
                      <label style={{ ...styles.field, gridColumn: '1 / -1' }}>
                        <div style={styles.label}>Purpose (optional)</div>
                        <input
                          value={p.purpose_text}
                          onChange={(e) =>
                            setLessonFlow((prev) =>
                              prev.map((x, i) => (i === idx ? { ...x, purpose_text: e.target.value } : x))
                            )
                          }
                          style={styles.input}
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() =>
                  setLessonFlow((prev) => [...prev, { time_text: '', phase_text: '', activity_text: '', purpose_text: '' }])
                }
                style={styles.secondaryBtn}
              >
                + Add phase
              </button>
            </section>
          ) : (
            <section style={styles.card}>
              <div style={styles.sectionHeader}>5. Activity options</div>
              <div style={styles.mutedSmall}>Ordered options. Each option can have optional bullet steps.</div>

              <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
                {activityOptions.map((o, idx) => (
                  <div key={idx} style={styles.cardInner}>
                    <div style={styles.rowBetween}>
                      <div style={{ fontWeight: 900, color: RCS.deepNavy }}>Option {idx + 1}</div>
                      <div style={styles.rowBtns}>
                        <button onClick={() => setActivityOptions((prev) => moveUp(prev, idx))} style={styles.smallBtn}>
                          ↑
                        </button>
                        <button onClick={() => setActivityOptions((prev) => moveDown(prev, idx))} style={styles.smallBtn}>
                          ↓
                        </button>
                        <button
                          onClick={() => setActivityOptions((prev) => prev.filter((_, i) => i !== idx))}
                          style={styles.smallBtnDanger}
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    <div style={styles.grid2}>
                      <label style={styles.field}>
                        <div style={styles.label}>Title</div>
                        <input
                          value={o.title}
                          onChange={(e) =>
                            setActivityOptions((prev) => prev.map((x, i) => (i === idx ? { ...x, title: e.target.value } : x)))
                          }
                          style={styles.input}
                        />
                      </label>
                      <label style={styles.field}>
                        <div style={styles.label}>Description</div>
                        <input
                          value={o.description}
                          onChange={(e) =>
                            setActivityOptions((prev) =>
                              prev.map((x, i) => (i === idx ? { ...x, description: e.target.value } : x))
                            )
                          }
                          style={styles.input}
                        />
                      </label>
                      <label style={{ ...styles.field, gridColumn: '1 / -1' }}>
                        <div style={styles.label}>Details</div>
                        <textarea
                          value={o.details_text}
                          onChange={(e) =>
                            setActivityOptions((prev) =>
                              prev.map((x, i) => (i === idx ? { ...x, details_text: e.target.value } : x))
                            )
                          }
                          rows={4}
                          style={styles.textarea}
                        />
                      </label>
                      <label style={{ ...styles.field, gridColumn: '1 / -1' }}>
                        <div style={styles.label}>TOC role (optional)</div>
                        <input
                          value={o.toc_role_text}
                          onChange={(e) =>
                            setActivityOptions((prev) =>
                              prev.map((x, i) => (i === idx ? { ...x, toc_role_text: e.target.value } : x))
                            )
                          }
                          style={styles.input}
                        />
                      </label>
                    </div>

                    <div style={{ marginTop: 10 }}>
                      <div style={styles.subSectionHeader}>Option bullet steps (optional)</div>
                      <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                        {(o.steps ?? []).map((s, sIdx) => (
                          <div key={sIdx} style={styles.rowItem}>
                            <input
                              value={s.text}
                              onChange={(e) =>
                                setActivityOptions((prev) =>
                                  prev.map((x, i) =>
                                    i === idx
                                      ? {
                                          ...x,
                                          steps: x.steps.map((ss, j) => (j === sIdx ? { ...ss, text: e.target.value } : ss)),
                                        }
                                      : x
                                  )
                                )
                              }
                              placeholder={`Step ${sIdx + 1}`}
                              style={{ ...styles.input, flex: 1, minWidth: 260 }}
                            />
                            <div style={styles.rowBtns}>
                              <button
                                onClick={() =>
                                  setActivityOptions((prev) =>
                                    prev.map((x, i) =>
                                      i === idx ? { ...x, steps: moveUp(x.steps, sIdx) } : x
                                    )
                                  )
                                }
                                style={styles.smallBtn}
                              >
                                ↑
                              </button>
                              <button
                                onClick={() =>
                                  setActivityOptions((prev) =>
                                    prev.map((x, i) =>
                                      i === idx ? { ...x, steps: moveDown(x.steps, sIdx) } : x
                                    )
                                  )
                                }
                                style={styles.smallBtn}
                              >
                                ↓
                              </button>
                              <button
                                onClick={() =>
                                  setActivityOptions((prev) =>
                                    prev.map((x, i) =>
                                      i === idx ? { ...x, steps: x.steps.filter((_, j) => j !== sIdx) } : x
                                    )
                                  )
                                }
                                style={styles.smallBtnDanger}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={() =>
                          setActivityOptions((prev) =>
                            prev.map((x, i) => (i === idx ? { ...x, steps: [...(x.steps ?? []), { text: '' }] } : x))
                          )
                        }
                        style={styles.secondaryBtn}
                      >
                        + Add option step
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() =>
                  setActivityOptions((prev) => [
                    ...prev,
                    { title: '', description: '', details_text: '', toc_role_text: '', steps: [] },
                  ])
                }
                style={styles.secondaryBtn}
              >
                + Add activity option
              </button>
            </section>
          )}

          {/* 6) What to do if */}
          <section style={styles.card}>
            <div style={styles.sectionHeader}>6. What to do if…</div>
            <div style={styles.mutedSmall}>Ordered scenario/response pairs.</div>

            <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
              {whatIfItems.map((w, idx) => (
                <div key={idx} style={styles.cardInnerCallout}>
                  <div style={styles.rowBetween}>
                    <div style={{ fontWeight: 900, color: RCS.deepNavy }}>Item {idx + 1}</div>
                    <div style={styles.rowBtns}>
                      <button onClick={() => setWhatIfItems((prev) => moveUp(prev, idx))} style={styles.smallBtn}>
                        ↑
                      </button>
                      <button onClick={() => setWhatIfItems((prev) => moveDown(prev, idx))} style={styles.smallBtn}>
                        ↓
                      </button>
                      <button
                        onClick={() => setWhatIfItems((prev) => prev.filter((_, i) => i !== idx))}
                        style={styles.smallBtnDanger}
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div style={styles.grid2}>
                    <label style={styles.field}>
                      <div style={styles.label}>Scenario</div>
                      <input
                        value={w.scenario_text}
                        onChange={(e) =>
                          setWhatIfItems((prev) =>
                            prev.map((x, i) => (i === idx ? { ...x, scenario_text: e.target.value } : x))
                          )
                        }
                        style={styles.input}
                      />
                    </label>
                    <label style={styles.field}>
                      <div style={styles.label}>Response</div>
                      <input
                        value={w.response_text}
                        onChange={(e) =>
                          setWhatIfItems((prev) =>
                            prev.map((x, i) => (i === idx ? { ...x, response_text: e.target.value } : x))
                          )
                        }
                        style={styles.input}
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setWhatIfItems((prev) => [...prev, { scenario_text: '', response_text: '' }])}
              style={styles.secondaryBtn}
            >
              + Add what-if item
            </button>
          </section>

          {/* 7) Save */}
          <section style={styles.card}>
            <div style={styles.sectionHeader}>7. Save</div>
            <div style={styles.mutedSmall}>
              Saves the template and all sections to Supabase. (One-click save; writes occur sequentially under the hood.)
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12, alignItems: 'center' }}>
              <button onClick={saveAll} disabled={status === 'saving'} style={styles.primaryBtn}>
                {status === 'saving' ? 'Saving…' : 'Save'}
              </button>
              {template?.id && (
                <div style={{ opacity: 0.85 }}>
                  Editing active template: <code>{template.id}</code>
                </div>
              )}
            </div>

            {status === 'error' && error && <div style={{ ...styles.errorBox, marginTop: 12 }}>{error}</div>}
          </section>
        </div>
      )}
    </main>
  );
}

function humanizeError(e: any): string {
  const message = (e?.message as string | undefined) ?? '';
  const code = e?.code as string | undefined;

  if (code === '42P01' || /relation .* does not exist/i.test(message)) {
    return 'Database tables are missing. Confirm you ran the Supabase schema SQL for TOC templates.';
  }
  if (code === '42501' || /row level security|permission denied/i.test(message)) {
    return 'Permission denied (RLS). Make sure you are logged in as staff and policies are applied.';
  }

  return message || 'Unknown error.';
}

const RCS = {
  deepNavy: '#1F4E79',
  midBlue: '#2E75B6',
  lightBlue: '#D6E4F0',
  gold: '#C9A84C',
  paleGold: '#FDF3DC',
  white: '#FFFFFF',
  lightGray: '#F5F5F5',
  textDark: '#1A1A1A',
} as const;

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: 24,
    maxWidth: 1100,
    margin: '0 auto',
    fontFamily: 'system-ui',
    color: RCS.textDark,
    background: RCS.white,
  },
  h1: { margin: 0, color: RCS.deepNavy },
  subhead: { marginTop: 6, opacity: 0.9 },
  mutedSmall: { opacity: 0.85, fontSize: 12, marginTop: 6 },
  card: {
    border: `1px solid ${RCS.deepNavy}`,
    borderRadius: 12,
    padding: 16,
    background: RCS.white,
  },
  cardInner: {
    border: `1px solid ${RCS.deepNavy}`,
    borderRadius: 12,
    padding: 12,
    background: RCS.lightBlue,
  },
  cardInnerCallout: {
    border: `1px solid ${RCS.gold}`,
    borderRadius: 12,
    padding: 12,
    background: RCS.paleGold,
  },
  sectionHeader: {
    background: RCS.deepNavy,
    color: RCS.white,
    padding: '8px 10px',
    borderRadius: 10,
    borderBottom: `3px solid ${RCS.gold}`,
    fontWeight: 900,
    marginBottom: 12,
  },
  subSectionHeader: {
    color: RCS.deepNavy,
    fontWeight: 900,
    borderLeft: `6px solid ${RCS.gold}`,
    paddingLeft: 10,
  },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  field: { display: 'grid', gap: 6 },
  label: { color: RCS.midBlue, fontWeight: 800, fontSize: 12 },
  input: {
    padding: '10px 12px',
    borderRadius: 10,
    border: `1px solid ${RCS.deepNavy}`,
    background: RCS.white,
    color: RCS.textDark,
  },
  textarea: {
    padding: '10px 12px',
    borderRadius: 10,
    border: `1px solid ${RCS.deepNavy}`,
    background: RCS.white,
    color: RCS.textDark,
    fontFamily: 'inherit',
  },
  rowItem: {
    display: 'flex',
    gap: 10,
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    border: `1px solid ${RCS.deepNavy}`,
    background: RCS.white,
  },
  rowBetween: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  rowBtns: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  tab: {
    padding: '8px 10px',
    borderRadius: 10,
    border: `1px solid ${RCS.deepNavy}`,
    background: RCS.white,
    color: RCS.deepNavy,
    cursor: 'pointer',
    fontWeight: 900,
  },
  tabActive: {
    padding: '8px 10px',
    borderRadius: 10,
    border: `1px solid ${RCS.gold}`,
    background: RCS.deepNavy,
    color: RCS.white,
    cursor: 'pointer',
    fontWeight: 900,
  },
  primaryBtn: {
    padding: '10px 12px',
    borderRadius: 10,
    border: `1px solid ${RCS.gold}`,
    background: RCS.deepNavy,
    color: RCS.white,
    cursor: 'pointer',
    fontWeight: 900,
  },
  secondaryBtn: {
    padding: '8px 10px',
    borderRadius: 10,
    border: `1px solid ${RCS.gold}`,
    background: RCS.white,
    color: RCS.deepNavy,
    cursor: 'pointer',
    fontWeight: 900,
    marginTop: 12,
  },
  smallBtn: {
    padding: '6px 10px',
    borderRadius: 10,
    border: `1px solid ${RCS.deepNavy}`,
    background: RCS.white,
    color: RCS.deepNavy,
    cursor: 'pointer',
    fontWeight: 900,
  },
  smallBtnDanger: {
    padding: '6px 10px',
    borderRadius: 10,
    border: '1px solid #991b1b',
    background: '#FEE2E2',
    color: '#7F1D1D',
    cursor: 'pointer',
    fontWeight: 900,
  },
  secondaryLink: {
    padding: '8px 10px',
    borderRadius: 10,
    border: `1px solid ${RCS.gold}`,
    background: RCS.white,
    color: RCS.deepNavy,
    textDecoration: 'none',
    fontWeight: 900,
    height: 'fit-content',
  },
  errorBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    border: '1px solid #991b1b',
    background: '#FEE2E2',
    color: '#7F1D1D',
    whiteSpace: 'pre-wrap',
  },
};
