'use client';

import { useEffect, useMemo, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { useDemo } from '@/app/admin/DemoContext';

type Status = 'loading' | 'idle' | 'saving' | 'error';

type OpeningStep = { step_text: string; source_template_step_id: string | null };

type Phase = {
  time_text: string;
  phase_text: string;
  activity_text: string;
  purpose_text: string;
  source_template_phase_id: string | null;
};

type OptionStep = { step_text: string; source_template_option_step_id: string | null };

type ActivityOption = {
  title: string;
  description: string;
  details_text: string;
  toc_role_text: string;
  source_template_option_id: string | null;
  steps: OptionStep[];
};

type WhatIf = { scenario_text: string; response_text: string; source_template_item_id: string | null };

/**
 * Full structured per-instance TOC plan editor.
 *
 * Copy-on-open from the active class template:
 * - creates toc_block_plans if missing
 * - if instance has no toc_* child rows, copies template structure into instance tables
 *
 * Saves to toc_* tables only (templates remain untouched).
 */
export default function TocBlockPlanInstanceEditor(props: { dayPlanBlockId: string; classId: string }) {
  const { isDemo } = useDemo();
  const { dayPlanBlockId: blockId, classId } = props;

  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);

  const [tocBlockPlanId, setTocBlockPlanId] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState<string | null>(null);

  const [planMode, setPlanMode] = useState<'lesson_flow' | 'activity_options'>('lesson_flow');
  const [teacherName, setTeacherName] = useState('');
  const [taName, setTaName] = useState('');
  const [taRole, setTaRole] = useState('');
  const [phonePolicy, setPhonePolicy] = useState('Not permitted');
  const [noteTOC, setNoteTOC] = useState('');

  const [openingSteps, setOpeningSteps] = useState<OpeningStep[]>([]);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [activityOptions, setActivityOptions] = useState<ActivityOption[]>([]);
  const [whatIfItems, setWhatIfItems] = useState<WhatIf[]>([]);

  const modeLabel = useMemo(() => (planMode === 'lesson_flow' ? 'Lesson Flow' : 'Activity Options'), [planMode]);

  useEffect(() => {
    void ensureAndLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blockId, classId]);

  async function ensureAndLoad() {
    setStatus('loading');
    setError(null);

    try {
      const supabase = getSupabaseClient();

      // 1) Load or create toc_block_plans
      let { data: plan, error: planErr } = await supabase
        .from('toc_block_plans')
        .select('*')
        .eq('day_plan_block_id', blockId)
        .maybeSingle();
      if (planErr) throw planErr;

      if (!plan) {
        // Active template (newest updated)
        const { data: tpl, error: tplErr } = await supabase
          .from('class_toc_templates')
          .select('*')
          .eq('class_id', classId)
          .eq('is_active', true)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (tplErr) throw tplErr;

        const inferredMode: 'lesson_flow' | 'activity_options' = (tpl?.plan_mode as any) ?? 'lesson_flow';

        const { data: created, error: createErr } = await supabase
          .from('toc_block_plans')
          .insert({
            day_plan_block_id: blockId,
            class_id: classId,
            template_id: tpl?.id ?? null,
            plan_mode: inferredMode,
            override_teacher_name: null,
            override_ta_name: null,
            override_ta_role: null,
            override_phone_policy: null,
            override_note_to_toc: null,
          })
          .select('*')
          .single();
        if (createErr) throw createErr;
        plan = created;
      }

      setTocBlockPlanId(plan.id);
      setTemplateId(plan.template_id ?? null);

      // 2) If instance is empty, copy from template
      const { data: stepRows } = await supabase
        .from('toc_opening_routine_steps')
        .select('id')
        .eq('toc_block_plan_id', plan.id)
        .limit(1);
      const hasAny = (stepRows?.length ?? 0) > 0;

      if (!hasAny) {
        await copyTemplateIntoInstance(supabase, plan.id, classId);
      }

      // 3) Load instance for editing
      await loadInstance(supabase, plan.id);

      setStatus('idle');
    } catch (e: any) {
      setStatus('error');
      setError(e?.message ?? 'Failed to load TOC plan');
    }
  }

  async function copyTemplateIntoInstance(supabase: ReturnType<typeof getSupabaseClient>, tocPlanId: string, classId: string) {
    // Active template (newest updated)
    const { data: tpl, error: tplErr } = await supabase
      .from('class_toc_templates')
      .select('*')
      .eq('class_id', classId)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (tplErr) throw tplErr;
    if (!tpl) return;

    // Update instance plan header to link template + plan_mode
    await supabase
      .from('toc_block_plans')
      .update({ template_id: tpl.id, plan_mode: tpl.plan_mode })
      .eq('id', tocPlanId);

    // Opening routine
    const { data: tSteps, error: tStepsErr } = await supabase
      .from('class_opening_routine_steps')
      .select('id,sort_order,step_text')
      .eq('template_id', tpl.id)
      .order('sort_order', { ascending: true });
    if (tStepsErr) throw tStepsErr;
    if ((tSteps?.length ?? 0) > 0) {
      const rows = (tSteps ?? []).map((r: any) => ({
        toc_block_plan_id: tocPlanId,
        sort_order: r.sort_order,
        step_text: r.step_text,
        source_template_step_id: r.id,
      }));
      const { error } = await supabase.from('toc_opening_routine_steps').insert(rows);
      if (error) throw error;
    }

    // Lesson flow phases
    const { data: tPhases, error: tPhErr } = await supabase
      .from('class_lesson_flow_phases')
      .select('id,sort_order,time_text,phase_text,activity_text,purpose_text')
      .eq('template_id', tpl.id)
      .order('sort_order', { ascending: true });
    if (tPhErr) throw tPhErr;
    if ((tPhases?.length ?? 0) > 0) {
      const rows = (tPhases ?? []).map((r: any) => ({
        toc_block_plan_id: tocPlanId,
        sort_order: r.sort_order,
        time_text: r.time_text,
        phase_text: r.phase_text,
        activity_text: r.activity_text,
        purpose_text: r.purpose_text,
        source_template_phase_id: r.id,
      }));
      const { error } = await supabase.from('toc_lesson_flow_phases').insert(rows);
      if (error) throw error;
    }

    // Activity options + nested steps
    const { data: tOpts, error: tOptErr } = await supabase
      .from('class_activity_options')
      .select('id,sort_order,title,description,details_text,toc_role_text')
      .eq('template_id', tpl.id)
      .order('sort_order', { ascending: true });
    if (tOptErr) throw tOptErr;

    const optIdMap = new Map<string, string>();
    if ((tOpts?.length ?? 0) > 0) {
      const rows = (tOpts ?? []).map((r: any) => ({
        toc_block_plan_id: tocPlanId,
        sort_order: r.sort_order,
        title: r.title,
        description: r.description,
        details_text: r.details_text,
        toc_role_text: r.toc_role_text,
        source_template_option_id: r.id,
      }));
      const { data: inserted, error: insErr } = await supabase
        .from('toc_activity_options')
        .insert(rows)
        .select('id,source_template_option_id');
      if (insErr) throw insErr;
      for (const r of inserted ?? []) {
        if (r.source_template_option_id) optIdMap.set(r.source_template_option_id, r.id);
      }

      // Steps per option
      for (const tOpt of tOpts ?? []) {
        const newOptId = optIdMap.get(tOpt.id);
        if (!newOptId) continue;
        const { data: tSteps2, error: tSteps2Err } = await supabase
          .from('class_activity_option_steps')
          .select('id,sort_order,step_text')
          .eq('activity_option_id', tOpt.id)
          .order('sort_order', { ascending: true });
        if (tSteps2Err) throw tSteps2Err;
        if ((tSteps2?.length ?? 0) > 0) {
          const rows2 = (tSteps2 ?? []).map((r: any) => ({
            toc_activity_option_id: newOptId,
            sort_order: r.sort_order,
            step_text: r.step_text,
            source_template_option_step_id: r.id,
          }));
          const { error: ins2Err } = await supabase.from('toc_activity_option_steps').insert(rows2);
          if (ins2Err) throw ins2Err;
        }
      }
    }

    // What-to-do-if
    const { data: tWhatIf, error: tWhatIfErr } = await supabase
      .from('class_what_to_do_if_items')
      .select('id,sort_order,scenario_text,response_text')
      .eq('template_id', tpl.id)
      .order('sort_order', { ascending: true });
    if (tWhatIfErr) throw tWhatIfErr;
    if ((tWhatIf?.length ?? 0) > 0) {
      const rows = (tWhatIf ?? []).map((r: any) => ({
        toc_block_plan_id: tocPlanId,
        sort_order: r.sort_order,
        scenario_text: r.scenario_text,
        response_text: r.response_text,
        source_template_item_id: r.id,
      }));
      const { error } = await supabase.from('toc_what_to_do_if_items').insert(rows);
      if (error) throw error;
    }
  }

  async function loadInstance(supabase: ReturnType<typeof getSupabaseClient>, tocPlanId: string) {
    const { data: plan, error: pErr } = await supabase.from('toc_block_plans').select('*').eq('id', tocPlanId).single();
    if (pErr) throw pErr;

    setTemplateId(plan.template_id ?? null);
    setPlanMode(plan.plan_mode);
    setTeacherName(plan.override_teacher_name ?? '');
    setTaName(plan.override_ta_name ?? '');
    setTaRole(plan.override_ta_role ?? '');
    setPhonePolicy(plan.override_phone_policy ?? 'Not permitted');
    setNoteTOC(plan.override_note_to_toc ?? '');

    const { data: oSteps, error: oErr } = await supabase
      .from('toc_opening_routine_steps')
      .select('sort_order,step_text,source_template_step_id')
      .eq('toc_block_plan_id', tocPlanId)
      .order('sort_order', { ascending: true });
    if (oErr) throw oErr;
    setOpeningSteps((oSteps ?? []).map((r: any) => ({ step_text: r.step_text, source_template_step_id: r.source_template_step_id ?? null })));

    const { data: lPh, error: lErr } = await supabase
      .from('toc_lesson_flow_phases')
      .select('sort_order,time_text,phase_text,activity_text,purpose_text,source_template_phase_id')
      .eq('toc_block_plan_id', tocPlanId)
      .order('sort_order', { ascending: true });
    if (lErr) throw lErr;
    setPhases(
      (lPh ?? []).map((r: any) => ({
        time_text: r.time_text,
        phase_text: r.phase_text,
        activity_text: r.activity_text,
        purpose_text: r.purpose_text ?? '',
        source_template_phase_id: r.source_template_phase_id ?? null,
      }))
    );

    const { data: opts, error: optErr } = await supabase
      .from('toc_activity_options')
      .select('id,sort_order,title,description,details_text,toc_role_text,source_template_option_id')
      .eq('toc_block_plan_id', tocPlanId)
      .order('sort_order', { ascending: true });
    if (optErr) throw optErr;

    const optIds = (opts ?? []).map((o: any) => o.id);
    let stepsByOpt: Record<string, any[]> = {};
    if (optIds.length > 0) {
      const { data: s2, error: s2Err } = await supabase
        .from('toc_activity_option_steps')
        .select('toc_activity_option_id,sort_order,step_text,source_template_option_step_id')
        .in('toc_activity_option_id', optIds)
        .order('sort_order', { ascending: true });
      if (s2Err) throw s2Err;
      for (const r of s2 ?? []) {
        const key = r.toc_activity_option_id;
        const arr = stepsByOpt[key] ?? [];
        arr.push(r);
        stepsByOpt[key] = arr;
      }
    }

    setActivityOptions(
      (opts ?? []).map((o: any) => ({
        title: o.title,
        description: o.description,
        details_text: o.details_text,
        toc_role_text: o.toc_role_text ?? '',
        source_template_option_id: o.source_template_option_id ?? null,
        steps: (stepsByOpt[o.id] ?? []).map((s: any) => ({ step_text: s.step_text, source_template_option_step_id: s.source_template_option_step_id ?? null })),
      }))
    );

    const { data: wi, error: wiErr } = await supabase
      .from('toc_what_to_do_if_items')
      .select('sort_order,scenario_text,response_text,source_template_item_id')
      .eq('toc_block_plan_id', tocPlanId)
      .order('sort_order', { ascending: true });
    if (wiErr) throw wiErr;
    setWhatIfItems((wi ?? []).map((r: any) => ({ scenario_text: r.scenario_text, response_text: r.response_text, source_template_item_id: r.source_template_item_id ?? null })));
  }

  async function saveAll() {
    if (!tocBlockPlanId) return;
    if (isDemo) return;

    setStatus('saving');
    setError(null);

    try {
      const supabase = getSupabaseClient();

      // 1) header
      const headerPayload = {
        plan_mode: planMode,
        override_teacher_name: teacherName.trim() ? teacherName.trim() : null,
        override_ta_name: taName.trim() ? taName.trim() : null,
        override_ta_role: taRole.trim() ? taRole.trim() : null,
        override_phone_policy: phonePolicy || null,
        override_note_to_toc: noteTOC.trim() ? noteTOC.trim() : null,
      };
      const { error: upErr } = await supabase.from('toc_block_plans').update(headerPayload).eq('id', tocBlockPlanId);
      if (upErr) throw upErr;

      // 2) Replace child tables (simple + robust)
      await supabase.from('toc_opening_routine_steps').delete().eq('toc_block_plan_id', tocBlockPlanId);
      await supabase.from('toc_lesson_flow_phases').delete().eq('toc_block_plan_id', tocBlockPlanId);
      await supabase.from('toc_activity_options').delete().eq('toc_block_plan_id', tocBlockPlanId);
      // steps are cascade-deleted from options; still delete orphan steps safely
      // (ignore errors if none)
      await supabase.from('toc_what_to_do_if_items').delete().eq('toc_block_plan_id', tocBlockPlanId);

      if (openingSteps.length > 0) {
        const rows = openingSteps.map((s, i) => ({
          toc_block_plan_id: tocBlockPlanId,
          sort_order: i + 1,
          step_text: s.step_text,
          source_template_step_id: s.source_template_step_id,
        }));
        const { error } = await supabase.from('toc_opening_routine_steps').insert(rows);
        if (error) throw error;
      }

      if (phases.length > 0) {
        const rows = phases.map((p, i) => ({
          toc_block_plan_id: tocBlockPlanId,
          sort_order: i + 1,
          time_text: p.time_text,
          phase_text: p.phase_text,
          activity_text: p.activity_text,
          purpose_text: p.purpose_text || null,
          source_template_phase_id: p.source_template_phase_id,
        }));
        const { error } = await supabase.from('toc_lesson_flow_phases').insert(rows);
        if (error) throw error;
      }

      // Options + nested steps
      if (activityOptions.length > 0) {
        const optRows = activityOptions.map((o, i) => ({
          toc_block_plan_id: tocBlockPlanId,
          sort_order: i + 1,
          title: o.title,
          description: o.description,
          details_text: o.details_text,
          toc_role_text: o.toc_role_text || null,
          source_template_option_id: o.source_template_option_id,
        }));

        const { data: insertedOpts, error: insOptErr } = await supabase
          .from('toc_activity_options')
          .insert(optRows)
          .select('id,sort_order');
        if (insOptErr) throw insOptErr;

        // Insert steps using returned order
        const bySort = new Map<number, string>();
        for (const r of insertedOpts ?? []) bySort.set(r.sort_order, r.id);

        const stepRows: any[] = [];
        for (let i = 0; i < activityOptions.length; i++) {
          const opt = activityOptions[i]!;
          const newOptId = bySort.get(i + 1);
          if (!newOptId) continue;
          for (let j = 0; j < (opt.steps ?? []).length; j++) {
            const st = opt.steps[j]!;
            stepRows.push({
              toc_activity_option_id: newOptId,
              sort_order: j + 1,
              step_text: st.step_text,
              source_template_option_step_id: st.source_template_option_step_id,
            });
          }
        }
        if (stepRows.length > 0) {
          const { error: insStepsErr } = await supabase.from('toc_activity_option_steps').insert(stepRows);
          if (insStepsErr) throw insStepsErr;
        }
      }

      if (whatIfItems.length > 0) {
        const rows = whatIfItems.map((w, i) => ({
          toc_block_plan_id: tocBlockPlanId,
          sort_order: i + 1,
          scenario_text: w.scenario_text,
          response_text: w.response_text,
          source_template_item_id: w.source_template_item_id,
        }));
        const { error } = await supabase.from('toc_what_to_do_if_items').insert(rows);
        if (error) throw error;
      }

      setStatus('idle');
    } catch (e: any) {
      setStatus('error');
      setError(e?.message ?? 'Failed to save');
    }
  }

  if (status === 'loading') return <div style={{ marginTop: 12, opacity: 0.75 }}>Loading TOC plan…</div>;

  return (
    <section style={styles.wrap}>
      <div style={styles.topRow}>
        <div>
          <div style={{ fontWeight: 900 }}>TOC Plan (instance)</div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>
            Mode: <b>{modeLabel}</b> {templateId ? '• copied from active template' : '• no template found'}
          </div>
        </div>

        <button onClick={saveAll} disabled={isDemo || status === 'saving'} style={styles.primaryBtn}>
          {isDemo ? 'Demo' : status === 'saving' ? 'Saving…' : 'Save TOC plan'}
        </button>
      </div>

      {error ? <div style={styles.errorBox}>{error}</div> : null}

      <div style={styles.grid2}>
        <label style={styles.field}>
          <span style={styles.label}>Plan Mode</span>
          <select value={planMode} onChange={(e) => setPlanMode(e.target.value as any)} style={styles.input} disabled={isDemo}>
            <option value="lesson_flow">Lesson Flow</option>
            <option value="activity_options">Activity Options</option>
          </select>
        </label>

        <label style={styles.field}>
          <span style={styles.label}>Phone Policy</span>
          <select value={phonePolicy} onChange={(e) => setPhonePolicy(e.target.value)} style={styles.input} disabled={isDemo}>
            <option value="Not permitted">Not permitted</option>
            <option value="Allowed in back">Allowed in back</option>
            <option value="Allowed with permission">Allowed with permission</option>
          </select>
        </label>

        <label style={{ ...styles.field, gridColumn: '1 / -1' }}>
          <span style={styles.label}>Teacher Name (override)</span>
          <input value={teacherName} onChange={(e) => setTeacherName(e.target.value)} style={styles.input} disabled={isDemo} />
        </label>

        <label style={styles.field}>
          <span style={styles.label}>TA Name (override)</span>
          <input value={taName} onChange={(e) => setTaName(e.target.value)} style={styles.input} disabled={isDemo} />
        </label>

        <label style={styles.field}>
          <span style={styles.label}>TA Role (override)</span>
          <input value={taRole} onChange={(e) => setTaRole(e.target.value)} style={styles.input} disabled={isDemo} />
        </label>

        <label style={{ ...styles.field, gridColumn: '1 / -1' }}>
          <span style={styles.label}>Note to TOC (override)</span>
          <textarea value={noteTOC} onChange={(e) => setNoteTOC(e.target.value)} rows={3} style={styles.textarea} disabled={isDemo} />
        </label>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionHeader}>Opening Routine</div>
        <div style={{ display: 'grid', gap: 8 }}>
          {openingSteps.map((s, idx) => (
            <div key={idx} style={styles.row3}>
              <input
                value={s.step_text}
                onChange={(e) => setOpeningSteps((prev) => prev.map((x, i) => (i === idx ? { ...x, step_text: e.target.value } : x)))}
                style={styles.input}
                disabled={isDemo}
              />
              <button
                onClick={() => setOpeningSteps((prev) => prev.filter((_, i) => i !== idx))}
                style={styles.dangerBtn}
                disabled={isDemo}
              >
                Remove
              </button>
            </div>
          ))}
          <button onClick={() => setOpeningSteps((p) => [...p, { step_text: '', source_template_step_id: null }])} style={styles.secondaryBtn} disabled={isDemo}>
            + Add step
          </button>
        </div>
      </div>

      {planMode === 'lesson_flow' ? (
        <div style={styles.section}>
          <div style={styles.sectionHeader}>Lesson Flow</div>
          <div style={{ display: 'grid', gap: 8 }}>
            {phases.map((p, idx) => (
              <div key={idx} style={styles.phaseRow}>
                <input value={p.time_text} onChange={(e) => setPhases((prev) => prev.map((x, i) => (i === idx ? { ...x, time_text: e.target.value } : x)))} style={styles.input} disabled={isDemo} placeholder="Time" />
                <input value={p.phase_text} onChange={(e) => setPhases((prev) => prev.map((x, i) => (i === idx ? { ...x, phase_text: e.target.value } : x)))} style={styles.input} disabled={isDemo} placeholder="Phase" />
                <input value={p.activity_text} onChange={(e) => setPhases((prev) => prev.map((x, i) => (i === idx ? { ...x, activity_text: e.target.value } : x)))} style={styles.input} disabled={isDemo} placeholder="Activity" />
                <input value={p.purpose_text} onChange={(e) => setPhases((prev) => prev.map((x, i) => (i === idx ? { ...x, purpose_text: e.target.value } : x)))} style={styles.input} disabled={isDemo} placeholder="Purpose (optional)" />
                <button onClick={() => setPhases((prev) => prev.filter((_, i) => i !== idx))} style={styles.dangerBtn} disabled={isDemo}>
                  Remove
                </button>
              </div>
            ))}
            <button
              onClick={() =>
                setPhases((p) => [
                  ...p,
                  { time_text: '', phase_text: '', activity_text: '', purpose_text: '', source_template_phase_id: null },
                ])
              }
              style={styles.secondaryBtn}
              disabled={isDemo}
            >
              + Add phase
            </button>
          </div>
        </div>
      ) : (
        <div style={styles.section}>
          <div style={styles.sectionHeader}>Activity Options</div>
          <div style={{ display: 'grid', gap: 12 }}>
            {activityOptions.map((o, idx) => (
              <div key={idx} style={styles.optionCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ fontWeight: 900 }}>Option {idx + 1}</div>
                  <button onClick={() => setActivityOptions((prev) => prev.filter((_, i) => i !== idx))} style={styles.dangerBtn} disabled={isDemo}>
                    Remove option
                  </button>
                </div>

                <div style={styles.grid2}>
                  <label style={styles.field}>
                    <span style={styles.label}>Title</span>
                    <input value={o.title} onChange={(e) => setActivityOptions((prev) => prev.map((x, i) => (i === idx ? { ...x, title: e.target.value } : x)))} style={styles.input} disabled={isDemo} />
                  </label>
                  <label style={styles.field}>
                    <span style={styles.label}>TOC role text (optional)</span>
                    <input value={o.toc_role_text} onChange={(e) => setActivityOptions((prev) => prev.map((x, i) => (i === idx ? { ...x, toc_role_text: e.target.value } : x)))} style={styles.input} disabled={isDemo} />
                  </label>
                  <label style={{ ...styles.field, gridColumn: '1 / -1' }}>
                    <span style={styles.label}>Description</span>
                    <textarea value={o.description} onChange={(e) => setActivityOptions((prev) => prev.map((x, i) => (i === idx ? { ...x, description: e.target.value } : x)))} rows={2} style={styles.textarea} disabled={isDemo} />
                  </label>
                  <label style={{ ...styles.field, gridColumn: '1 / -1' }}>
                    <span style={styles.label}>Details</span>
                    <textarea value={o.details_text} onChange={(e) => setActivityOptions((prev) => prev.map((x, i) => (i === idx ? { ...x, details_text: e.target.value } : x)))} rows={3} style={styles.textarea} disabled={isDemo} />
                  </label>
                </div>

                <div style={{ marginTop: 10 }}>
                  <div style={{ fontWeight: 900, color: '#1F4E79', marginBottom: 6 }}>Steps</div>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {o.steps.map((s, sIdx) => (
                      <div key={sIdx} style={styles.row3}>
                        <input
                          value={s.step_text}
                          onChange={(e) =>
                            setActivityOptions((prev) =>
                              prev.map((x, i) =>
                                i === idx
                                  ? {
                                      ...x,
                                      steps: x.steps.map((st, j) => (j === sIdx ? { ...st, step_text: e.target.value } : st)),
                                    }
                                  : x
                              )
                            )
                          }
                          style={styles.input}
                          disabled={isDemo}
                        />
                        <button
                          onClick={() =>
                            setActivityOptions((prev) =>
                              prev.map((x, i) => (i === idx ? { ...x, steps: x.steps.filter((_, j) => j !== sIdx) } : x))
                            )
                          }
                          style={styles.dangerBtn}
                          disabled={isDemo}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() =>
                        setActivityOptions((prev) =>
                          prev.map((x, i) => (i === idx ? { ...x, steps: [...x.steps, { step_text: '', source_template_option_step_id: null }] } : x))
                        )
                      }
                      style={styles.secondaryBtn}
                      disabled={isDemo}
                    >
                      + Add step
                    </button>
                  </div>
                </div>
              </div>
            ))}

            <button
              onClick={() =>
                setActivityOptions((p) => [
                  ...p,
                  {
                    title: '',
                    description: '',
                    details_text: '',
                    toc_role_text: '',
                    source_template_option_id: null,
                    steps: [],
                  },
                ])
              }
              style={styles.secondaryBtn}
              disabled={isDemo}
            >
              + Add activity option
            </button>
          </div>
        </div>
      )}

      <div style={styles.section}>
        <div style={styles.sectionHeader}>What to do if…</div>
        <div style={{ display: 'grid', gap: 8 }}>
          {whatIfItems.map((w, idx) => (
            <div key={idx} style={styles.whatIfRow}>
              <input value={w.scenario_text} onChange={(e) => setWhatIfItems((prev) => prev.map((x, i) => (i === idx ? { ...x, scenario_text: e.target.value } : x)))} style={styles.input} disabled={isDemo} placeholder="Scenario" />
              <input value={w.response_text} onChange={(e) => setWhatIfItems((prev) => prev.map((x, i) => (i === idx ? { ...x, response_text: e.target.value } : x)))} style={styles.input} disabled={isDemo} placeholder="Response" />
              <button onClick={() => setWhatIfItems((prev) => prev.filter((_, i) => i !== idx))} style={styles.dangerBtn} disabled={isDemo}>
                Remove
              </button>
            </div>
          ))}
          <button onClick={() => setWhatIfItems((p) => [...p, { scenario_text: '', response_text: '', source_template_item_id: null }])} style={styles.secondaryBtn} disabled={isDemo}>
            + Add what-if
          </button>
        </div>
      </div>
    </section>
  );
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
  wrap: { marginTop: 12, borderTop: `1px solid rgba(0,0,0,0.12)`, paddingTop: 12 },
  topRow: { display: 'flex', gap: 12, justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 },
  field: { display: 'grid', gap: 6 },
  label: { fontWeight: 900, fontSize: 12, color: RCS.midBlue },
  input: { padding: '10px 12px', borderRadius: 10, border: `1px solid ${RCS.deepNavy}`, background: RCS.white, color: RCS.textDark },
  textarea: { padding: '10px 12px', borderRadius: 10, border: `1px solid ${RCS.deepNavy}`, background: RCS.white, color: RCS.textDark, fontFamily: 'inherit' },
  primaryBtn: { padding: '10px 12px', borderRadius: 10, border: `1px solid ${RCS.gold}`, background: RCS.deepNavy, color: RCS.white, cursor: 'pointer', fontWeight: 900 },
  secondaryBtn: { padding: '10px 12px', borderRadius: 10, border: `1px solid ${RCS.gold}`, background: 'transparent', color: RCS.deepNavy, cursor: 'pointer', fontWeight: 900 },
  dangerBtn: { padding: '8px 10px', borderRadius: 10, border: '1px solid #991b1b', background: '#FEE2E2', color: '#7F1D1D', cursor: 'pointer', fontWeight: 900, whiteSpace: 'nowrap' },
  errorBox: { marginTop: 10, padding: 10, borderRadius: 10, background: '#FEE2E2', border: '1px solid #991b1b', color: '#7F1D1D', whiteSpace: 'pre-wrap' },
  section: { marginTop: 14, border: `1px solid ${RCS.deepNavy}`, borderRadius: 12, padding: 12, background: RCS.lightBlue },
  sectionHeader: { fontWeight: 900, color: RCS.deepNavy, borderLeft: `6px solid ${RCS.gold}`, paddingLeft: 10, marginBottom: 10 },
  row3: { display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center' },
  phaseRow: { display: 'grid', gridTemplateColumns: '110px 1fr 1fr 1fr auto', gap: 10, alignItems: 'center' },
  optionCard: { border: `1px solid ${RCS.deepNavy}`, borderRadius: 12, padding: 12, background: RCS.white },
  whatIfRow: { display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 10, alignItems: 'center' },
};
