'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { getSupabaseClient } from '@/lib/supabaseClient';

type PlanMode = 'lesson_flow' | 'activity_options';

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

type TocBlockPlanRow = {
  id: string;
  day_plan_block_id: string;
  class_id: string;
  template_id: string | null;
  plan_mode: PlanMode;
  override_teacher_name: string | null;
  override_ta_name: string | null;
  override_ta_role: string | null;
  override_phone_policy: string | null;
  override_note_to_toc: string | null;
};

type RoutineStep = { text: string };

type PhaseRow = {
  time_text: string;
  phase_text: string;
  activity_text: string;
  purpose_text: string;
};

type ActivityOption = {
  title: string;
  description: string;
  details_text: string;
  toc_role_text: string;
  steps: { text: string }[];
};

type WhatIfItem = { scenario_text: string; response_text: string };

type Status = 'loading' | 'idle' | 'saving' | 'error';

function moveUp<T>(arr: T[], idx: number): T[] {
  if (idx <= 0) return arr;
  const next = [...arr];
  const t = next[idx - 1];
  next[idx - 1] = next[idx];
  next[idx] = t;
  return next;
}

function moveDown<T>(arr: T[], idx: number): T[] {
  if (idx < 0 || idx >= arr.length - 1) return arr;
  const next = [...arr];
  const t = next[idx + 1];
  next[idx + 1] = next[idx];
  next[idx] = t;
  return next;
}

function cleanTextOrNull(s: string): string | null {
  const t = s.trim();
  return t ? t : null;
}

function asPlanMode(x: any): PlanMode {
  return x === 'activity_options' ? 'activity_options' : 'lesson_flow';
}

async function ensureTocBlockPlanExists(dayPlanBlockId: string, classId: string) {
  const supabase = getSupabaseClient();

  // already exists?
  const { data: existing, error: existErr } = await supabase
    .from('toc_block_plans')
    .select('*')
    .eq('day_plan_block_id', dayPlanBlockId)
    .maybeSingle();
  if (existErr) throw existErr;
  if (existing) return existing as TocBlockPlanRow;

  // template (optional)
  const { data: tpl, error: tplErr } = await supabase
    .from('class_toc_templates')
    .select('*')
    .eq('class_id', classId)
    .eq('is_active', true)
    .maybeSingle();
  if (tplErr) throw tplErr;

  const template = tpl as TemplateRow | null;

  const { data: insertedPlan, error: insErr } = await supabase
    .from('toc_block_plans')
    .insert({
      day_plan_block_id: dayPlanBlockId,
      class_id: classId,
      template_id: template?.id ?? null,
      plan_mode: asPlanMode(template?.plan_mode ?? 'lesson_flow'),
      override_teacher_name: null,
      override_ta_name: null,
      override_ta_role: null,
      override_phone_policy: null,
      override_note_to_toc: null,
    })
    .select('*')
    .single();
  if (insErr) throw insErr;

  // No template -> keep empty child tables
  if (!template) return insertedPlan as TocBlockPlanRow;

  const planId = (insertedPlan as any).id as string;

  // Copy children from template. Best-effort: if any of these fail, we still keep the toc_block_plan row.
  // Opening routine
  const { data: orSteps, error: orErr } = await supabase
    .from('class_opening_routine_steps')
    .select('id,sort_order,step_text')
    .eq('template_id', template.id)
    .order('sort_order', { ascending: true });
  if (orErr) throw orErr;

  if ((orSteps ?? []).length) {
    const { error } = await supabase.from('toc_opening_routine_steps').insert(
      (orSteps ?? []).map((s: any, idx: number) => ({
        toc_block_plan_id: planId,
        sort_order: idx,
        step_text: s.step_text,
        source_template_step_id: s.id,
      }))
    );
    if (error) throw error;
  }

  // Lesson flow phases
  const { data: phases, error: phErr } = await supabase
    .from('class_lesson_flow_phases')
    .select('id,sort_order,time_text,phase_text,activity_text,purpose_text')
    .eq('template_id', template.id)
    .order('sort_order', { ascending: true });
  if (phErr) throw phErr;

  if ((phases ?? []).length) {
    const { error } = await supabase.from('toc_lesson_flow_phases').insert(
      (phases ?? []).map((p: any, idx: number) => ({
        toc_block_plan_id: planId,
        sort_order: idx,
        time_text: p.time_text,
        phase_text: p.phase_text,
        activity_text: p.activity_text,
        purpose_text: p.purpose_text ?? null,
        source_template_phase_id: p.id,
      }))
    );
    if (error) throw error;
  }

  // Activity options + steps
  const { data: opts, error: optErr } = await supabase
    .from('class_activity_options')
    .select('id,sort_order,title,description,details_text,toc_role_text')
    .eq('template_id', template.id)
    .order('sort_order', { ascending: true });
  if (optErr) throw optErr;

  if ((opts ?? []).length) {
    const { data: insertedOpts, error: insOptErr } = await supabase
      .from('toc_activity_options')
      .insert(
        (opts ?? []).map((o: any, idx: number) => ({
          toc_block_plan_id: planId,
          sort_order: idx,
          title: o.title,
          description: o.description,
          details_text: o.details_text,
          toc_role_text: o.toc_role_text ?? null,
          source_template_option_id: o.id,
        }))
      )
      .select('id,source_template_option_id');
    if (insOptErr) throw insOptErr;

    const idBySource = new Map<string, string>();
    for (const r of insertedOpts ?? []) {
      if ((r as any).source_template_option_id) idBySource.set((r as any).source_template_option_id, (r as any).id);
    }

    const { data: optSteps, error: stepErr } = await supabase
      .from('class_activity_option_steps')
      .select('id,activity_option_id,sort_order,step_text')
      .in(
        'activity_option_id',
        (opts ?? []).map((o: any) => o.id)
      )
      .order('sort_order', { ascending: true });
    if (stepErr) throw stepErr;

    if ((optSteps ?? []).length) {
      const rows = (optSteps ?? [])
        .map((s: any, idx: number) => ({
          toc_activity_option_id: idBySource.get(s.activity_option_id) ?? null,
          sort_order: s.sort_order ?? idx,
          step_text: s.step_text,
          source_template_option_step_id: s.id,
        }))
        .filter((r: any) => !!r.toc_activity_option_id);

      if (rows.length) {
        const { error } = await supabase.from('toc_activity_option_steps').insert(rows);
        if (error) throw error;
      }
    }
  }

  // What-if items
  const { data: wi, error: wiErr } = await supabase
    .from('class_what_to_do_if_items')
    .select('id,sort_order,scenario_text,response_text')
    .eq('template_id', template.id)
    .order('sort_order', { ascending: true });
  if (wiErr) throw wiErr;

  if ((wi ?? []).length) {
    const { error } = await supabase.from('toc_what_to_do_if_items').insert(
      (wi ?? []).map((x: any, idx: number) => ({
        toc_block_plan_id: planId,
        sort_order: idx,
        scenario_text: x.scenario_text,
        response_text: x.response_text,
        source_template_item_id: x.id,
      }))
    );
    if (error) throw error;
  }

  return insertedPlan as TocBlockPlanRow;
}

async function loadEditorData(dayPlanBlockId: string): Promise<{
  plan: TocBlockPlanRow;
  template: TemplateRow | null;
  openingRoutine: RoutineStep[];
  lessonFlow: PhaseRow[];
  activityOptions: ActivityOption[];
  whatIfItems: WhatIfItem[];
}> {
  const supabase = getSupabaseClient();

  const { data: plan, error: planErr } = await supabase
    .from('toc_block_plans')
    .select('*')
    .eq('day_plan_block_id', dayPlanBlockId)
    .single();
  if (planErr) throw planErr;

  const tplId = (plan as any).template_id as string | null;
  const template = tplId
    ? ((await supabase.from('class_toc_templates').select('*').eq('id', tplId).maybeSingle()).data as TemplateRow | null)
    : null;

  const [orRes, phRes, wiRes, optRes] = await Promise.all([
    supabase
      .from('toc_opening_routine_steps')
      .select('id,sort_order,step_text')
      .eq('toc_block_plan_id', (plan as any).id)
      .order('sort_order', { ascending: true }),
    supabase
      .from('toc_lesson_flow_phases')
      .select('id,sort_order,time_text,phase_text,activity_text,purpose_text')
      .eq('toc_block_plan_id', (plan as any).id)
      .order('sort_order', { ascending: true }),
    supabase
      .from('toc_what_to_do_if_items')
      .select('id,sort_order,scenario_text,response_text')
      .eq('toc_block_plan_id', (plan as any).id)
      .order('sort_order', { ascending: true }),
    supabase
      .from('toc_activity_options')
      .select('id,sort_order,title,description,details_text,toc_role_text')
      .eq('toc_block_plan_id', (plan as any).id)
      .order('sort_order', { ascending: true }),
  ]);

  if (orRes.error) throw orRes.error;
  if (phRes.error) throw phRes.error;
  if (wiRes.error) throw wiRes.error;
  if (optRes.error) throw optRes.error;

  const optionRows = optRes.data ?? [];
  const optionIds = optionRows.map((o: any) => o.id);

  let stepRows: any[] = [];
  if (optionIds.length) {
    const { data, error } = await supabase
      .from('toc_activity_option_steps')
      .select('id,toc_activity_option_id,sort_order,step_text')
      .in('toc_activity_option_id', optionIds)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    stepRows = data ?? [];
  }

  const stepsByOptionId = new Map<string, { text: string }[]>();
  for (const s of stepRows) {
    const key = s.toc_activity_option_id as string;
    const prev = stepsByOptionId.get(key) ?? [];
    prev.push({ text: s.step_text });
    stepsByOptionId.set(key, prev);
  }

  return {
    plan: plan as TocBlockPlanRow,
    template,
    openingRoutine: (orRes.data ?? []).map((r: any) => ({ text: r.step_text })),
    lessonFlow: (phRes.data ?? []).map((r: any) => ({
      time_text: r.time_text,
      phase_text: r.phase_text,
      activity_text: r.activity_text,
      purpose_text: r.purpose_text ?? '',
    })),
    activityOptions: optionRows.map((o: any) => ({
      title: o.title,
      description: o.description,
      details_text: o.details_text,
      toc_role_text: o.toc_role_text ?? '',
      steps: stepsByOptionId.get(o.id) ?? [],
    })),
    whatIfItems: (wiRes.data ?? []).map((r: any) => ({ scenario_text: r.scenario_text, response_text: r.response_text })),
  };
}

const ui = {
  card: { border: '1px solid #1F4E79', borderRadius: 12, padding: 12, background: '#FFFFFF', marginTop: 12 } as const,
  details: { border: '1px solid #1F4E79', borderRadius: 12, background: '#FFFFFF', overflow: 'hidden' } as const,
  summary: {
    cursor: 'pointer',
    listStyle: 'none',
    padding: '10px 12px',
    background: '#D6E4F0',
    fontWeight: 900,
    color: '#1F4E79',
    borderBottom: '1px solid #1F4E79',
  } as const,
  body: { padding: 12, display: 'grid', gap: 10 } as const,
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 } as const,
  label: { color: '#2E75B6', fontWeight: 800, fontSize: 12 } as const,
  input: { padding: '10px 12px', borderRadius: 10, border: '1px solid #1F4E79', background: '#FFFFFF' } as const,
  textarea: {
    padding: '10px 12px',
    borderRadius: 10,
    border: '1px solid #1F4E79',
    background: '#FFFFFF',
    fontFamily: 'inherit',
  } as const,
  muted: { opacity: 0.8, fontSize: 12 } as const,
  rowItem: { display: 'flex', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' } as const,
  rowBtns: { display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' } as const,
  smallBtn: {
    padding: '6px 10px',
    borderRadius: 10,
    border: '1px solid #C9A84C',
    background: '#FFFFFF',
    color: '#1F4E79',
    cursor: 'pointer',
    fontWeight: 900,
  } as const,
  smallBtnDanger: {
    padding: '6px 10px',
    borderRadius: 10,
    border: '1px solid #991b1b',
    background: '#FEE2E2',
    color: '#7F1D1D',
    cursor: 'pointer',
    fontWeight: 900,
  } as const,
  secondaryBtn: {
    padding: '10px 12px',
    borderRadius: 10,
    border: '1px solid #C9A84C',
    background: 'transparent',
    color: '#1F4E79',
    cursor: 'pointer',
    fontWeight: 900,
    width: 'fit-content',
  } as const,
  primaryBtn: {
    padding: '10px 12px',
    borderRadius: 10,
    border: '1px solid #C9A84C',
    background: '#1F4E79',
    color: '#FFFFFF',
    cursor: 'pointer',
    fontWeight: 900,
  } as const,
  error: { padding: 10, borderRadius: 10, border: '1px solid #991b1b', background: '#FEE2E2', color: '#7F1D1D', whiteSpace: 'pre-wrap' } as const,
};

function Collapsible({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: (next: boolean) => void;
  children: ReactNode;
}) {
  return (
    <details
      open={open}
      onToggle={(e) => onToggle((e.currentTarget as HTMLDetailsElement).open)}
      style={ui.details}
    >
      <summary style={ui.summary}>{title}</summary>
      <div style={ui.body}>{children}</div>
    </details>
  );
}

export default function TocBlockPlanInlineEditor({ dayPlanBlockId, classId }: { dayPlanBlockId: string; classId: string }) {
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);

  const [tpl, setTpl] = useState<TemplateRow | null>(null);
  const [plan, setPlan] = useState<TocBlockPlanRow | null>(null);

  const [overrideTeacherName, setOverrideTeacherName] = useState('');
  const [overridePhonePolicy, setOverridePhonePolicy] = useState('');
  const [overrideTaName, setOverrideTaName] = useState('');
  const [overrideTaRole, setOverrideTaRole] = useState('');
  const [overrideNoteToToc, setOverrideNoteToToc] = useState('');

  const [openingRoutine, setOpeningRoutine] = useState<RoutineStep[]>([]);
  const [planMode, setPlanMode] = useState<PlanMode>('lesson_flow');
  const [lessonFlow, setLessonFlow] = useState<PhaseRow[]>([]);
  const [activityOptions, setActivityOptions] = useState<ActivityOption[]>([]);
  const [whatIfItems, setWhatIfItems] = useState<WhatIfItem[]>([]);

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    overrides: false,
    note: false,
    opening: false,
    mode: false,
    whatif: false,
  });

  const effectiveTeacherName = useMemo(() => {
    const o = overrideTeacherName.trim();
    if (o) return o;
    return tpl?.teacher_name ?? '';
  }, [overrideTeacherName, tpl]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setStatus('loading');
      setError(null);

      try {
        await ensureTocBlockPlanExists(dayPlanBlockId, classId);
        const data = await loadEditorData(dayPlanBlockId);

        if (cancelled) return;

        setPlan(data.plan);
        setTpl(data.template);

        setOverrideTeacherName(data.plan.override_teacher_name ?? '');
        setOverridePhonePolicy(data.plan.override_phone_policy ?? '');
        setOverrideTaName(data.plan.override_ta_name ?? '');
        setOverrideTaRole(data.plan.override_ta_role ?? '');
        setOverrideNoteToToc(data.plan.override_note_to_toc ?? '');

        setPlanMode(asPlanMode(data.plan.plan_mode));
        setOpeningRoutine(data.openingRoutine);
        setLessonFlow(data.lessonFlow);
        setActivityOptions(data.activityOptions);
        setWhatIfItems(data.whatIfItems);

        setStatus('idle');
      } catch (e: any) {
        if (cancelled) return;
        setStatus('error');
        setError(e?.message ?? 'Failed to load TOC block plan');
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [dayPlanBlockId, classId]);

  async function save() {
    if (!plan) return;

    setStatus('saving');
    setError(null);

    try {
      const supabase = getSupabaseClient();

      const { error: upErr } = await supabase
        .from('toc_block_plans')
        .update({
          plan_mode: planMode,
          override_teacher_name: cleanTextOrNull(overrideTeacherName),
          override_phone_policy: cleanTextOrNull(overridePhonePolicy),
          override_ta_name: cleanTextOrNull(overrideTaName),
          override_ta_role: cleanTextOrNull(overrideTaRole),
          override_note_to_toc: cleanTextOrNull(overrideNoteToToc),
          updated_at: new Date().toISOString(),
        })
        .eq('id', plan.id);
      if (upErr) throw upErr;

      // Replace children with current draft arrays.
      // Opening routine
      const { error: delOrErr } = await supabase.from('toc_opening_routine_steps').delete().eq('toc_block_plan_id', plan.id);
      if (delOrErr) throw delOrErr;
      if (openingRoutine.length) {
        const { error } = await supabase.from('toc_opening_routine_steps').insert(
          openingRoutine.map((s, idx) => ({
            toc_block_plan_id: plan.id,
            sort_order: idx,
            step_text: s.text,
          }))
        );
        if (error) throw error;
      }

      // Lesson flow
      const { error: delPhErr } = await supabase.from('toc_lesson_flow_phases').delete().eq('toc_block_plan_id', plan.id);
      if (delPhErr) throw delPhErr;
      if (lessonFlow.length) {
        const { error } = await supabase.from('toc_lesson_flow_phases').insert(
          lessonFlow.map((p, idx) => ({
            toc_block_plan_id: plan.id,
            sort_order: idx,
            time_text: p.time_text,
            phase_text: p.phase_text,
            activity_text: p.activity_text,
            purpose_text: cleanTextOrNull(p.purpose_text),
          }))
        );
        if (error) throw error;
      }

      // What-if
      const { error: delWiErr } = await supabase.from('toc_what_to_do_if_items').delete().eq('toc_block_plan_id', plan.id);
      if (delWiErr) throw delWiErr;
      if (whatIfItems.length) {
        const { error } = await supabase.from('toc_what_to_do_if_items').insert(
          whatIfItems.map((x, idx) => ({
            toc_block_plan_id: plan.id,
            sort_order: idx,
            scenario_text: x.scenario_text,
            response_text: x.response_text,
          }))
        );
        if (error) throw error;
      }

      // Activity options + steps
      // Delete steps first, then options (FK)
      const { data: existingOpts, error: loadOptErr } = await supabase
        .from('toc_activity_options')
        .select('id')
        .eq('toc_block_plan_id', plan.id);
      if (loadOptErr) throw loadOptErr;
      const optIds = (existingOpts ?? []).map((r: any) => r.id);
      if (optIds.length) {
        const { error } = await supabase.from('toc_activity_option_steps').delete().in('toc_activity_option_id', optIds);
        if (error) throw error;
      }
      const { error: delOptErr } = await supabase.from('toc_activity_options').delete().eq('toc_block_plan_id', plan.id);
      if (delOptErr) throw delOptErr;

      if (activityOptions.length) {
        const { data: insertedOpts, error: insOptErr } = await supabase
          .from('toc_activity_options')
          .insert(
            activityOptions.map((o, idx) => ({
              toc_block_plan_id: plan.id,
              sort_order: idx,
              title: o.title,
              description: o.description,
              details_text: o.details_text,
              toc_role_text: cleanTextOrNull(o.toc_role_text),
            }))
          )
          .select('id,sort_order');
        if (insOptErr) throw insOptErr;

        // Insert steps
        const rows: any[] = [];
        const bySort = new Map<number, string>();
        for (const r of insertedOpts ?? []) bySort.set((r as any).sort_order, (r as any).id);

        activityOptions.forEach((o, optIdx) => {
          const optId = bySort.get(optIdx);
          if (!optId) return;
          o.steps.forEach((s, stepIdx) => {
            rows.push({ toc_activity_option_id: optId, sort_order: stepIdx, step_text: s.text });
          });
        });

        if (rows.length) {
          const { error } = await supabase.from('toc_activity_option_steps').insert(rows);
          if (error) throw error;
        }
      }

      // Reload to get fresh ids/order (and reflect RLS-side defaults)
      const refreshed = await loadEditorData(dayPlanBlockId);
      setPlan(refreshed.plan);
      setTpl(refreshed.template);
      setPlanMode(asPlanMode(refreshed.plan.plan_mode));
      setOpeningRoutine(refreshed.openingRoutine);
      setLessonFlow(refreshed.lessonFlow);
      setActivityOptions(refreshed.activityOptions);
      setWhatIfItems(refreshed.whatIfItems);

      setStatus('idle');
    } catch (e: any) {
      setStatus('error');
      setError(e?.message ?? 'Failed to save TOC plan');
    }
  }

  const hasTemplate = !!tpl;

  return (
    <div style={ui.card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontWeight: 900, color: '#1F4E79' }}>TOC plan (this block)</div>
          <div style={ui.muted}>
            {hasTemplate ? (
              <span>
                Based on active template. Teacher: <b>{tpl?.teacher_name}</b>
              </span>
            ) : (
              <span>No active template for this class (safe blank plan created).</span>
            )}
          </div>
        </div>

        <button onClick={save} disabled={status !== 'idle'} style={ui.primaryBtn}>
          {status === 'saving' ? 'Saving…' : 'Save TOC plan'}
        </button>
      </div>

      {status === 'loading' && <div style={{ marginTop: 10 }}>Loading TOC plan…</div>}
      {status === 'error' && error && <div style={{ ...ui.error, marginTop: 10 }}>{error}</div>}

      {status !== 'loading' && plan && (
        <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
          <Collapsible
            title="1. Top-level overrides"
            open={!!openSections.overrides}
            onToggle={(next) => setOpenSections((p) => ({ ...p, overrides: next }))}
          >
            <div style={ui.grid2}>
              <label style={{ display: 'grid', gap: 6 }}>
                <div style={ui.label}>Teacher name override</div>
                <input
                  value={overrideTeacherName}
                  placeholder={tpl?.teacher_name ?? ''}
                  onFocus={() => setOpenSections((p) => ({ ...p, overrides: true }))}
                  onChange={(e) => setOverrideTeacherName(e.target.value)}
                  style={ui.input}
                />
              </label>
              <label style={{ display: 'grid', gap: 6 }}>
                <div style={ui.label}>Phone policy override</div>
                <input
                  value={overridePhonePolicy}
                  placeholder={tpl?.phone_policy ?? ''}
                  onFocus={() => setOpenSections((p) => ({ ...p, overrides: true }))}
                  onChange={(e) => setOverridePhonePolicy(e.target.value)}
                  style={ui.input}
                />
              </label>
              <label style={{ display: 'grid', gap: 6 }}>
                <div style={ui.label}>TA name override</div>
                <input
                  value={overrideTaName}
                  placeholder={tpl?.ta_name ?? ''}
                  onFocus={() => setOpenSections((p) => ({ ...p, overrides: true }))}
                  onChange={(e) => setOverrideTaName(e.target.value)}
                  style={ui.input}
                />
              </label>
              <label style={{ display: 'grid', gap: 6 }}>
                <div style={ui.label}>TA role override</div>
                <input
                  value={overrideTaRole}
                  placeholder={tpl?.ta_role ?? ''}
                  onFocus={() => setOpenSections((p) => ({ ...p, overrides: true }))}
                  onChange={(e) => setOverrideTaRole(e.target.value)}
                  style={ui.input}
                />
              </label>
            </div>
            <div style={ui.muted}>Effective teacher: {effectiveTeacherName || '—'}</div>
          </Collapsible>

          <Collapsible title="2. Note to TOC" open={!!openSections.note} onToggle={(next) => setOpenSections((p) => ({ ...p, note: next }))}>
            <label style={{ display: 'grid', gap: 6 }}>
              <div style={ui.label}>Override note (blank = use template note)</div>
              <textarea
                value={overrideNoteToToc}
                placeholder={tpl?.note_to_toc ?? ''}
                onFocus={() => setOpenSections((p) => ({ ...p, note: true }))}
                onChange={(e) => setOverrideNoteToToc(e.target.value)}
                rows={5}
                style={ui.textarea}
              />
            </label>
          </Collapsible>

          <Collapsible
            title="3. Opening routine"
            open={!!openSections.opening}
            onToggle={(next) => setOpenSections((p) => ({ ...p, opening: next }))}
          >
            <div style={ui.muted}>Ordered steps. Use up/down to reorder.</div>
            <div style={{ display: 'grid', gap: 10 }}>
              {openingRoutine.map((s, idx) => (
                <div key={idx} style={ui.rowItem}>
                  <input
                    value={s.text}
                    onFocus={() => setOpenSections((p) => ({ ...p, opening: true }))}
                    onChange={(e) => setOpeningRoutine((prev) => prev.map((x, i) => (i === idx ? { ...x, text: e.target.value } : x)))}
                    placeholder={`Step ${idx + 1}`}
                    style={{ ...ui.input, flex: 1, minWidth: 280 }}
                  />
                  <div style={ui.rowBtns}>
                    <button onClick={() => setOpeningRoutine((prev) => moveUp(prev, idx))} style={ui.smallBtn}>
                      ↑
                    </button>
                    <button onClick={() => setOpeningRoutine((prev) => moveDown(prev, idx))} style={ui.smallBtn}>
                      ↓
                    </button>
                    <button onClick={() => setOpeningRoutine((prev) => prev.filter((_, i) => i !== idx))} style={ui.smallBtnDanger}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setOpeningRoutine((prev) => [...prev, { text: '' }])} style={ui.secondaryBtn}>
              + Add step
            </button>
          </Collapsible>

          <Collapsible
            title="4. Plan mode + content"
            open={!!openSections.mode}
            onToggle={(next) => setOpenSections((p) => ({ ...p, mode: next }))}
          >
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                onClick={() => {
                  setPlanMode('lesson_flow');
                  setOpenSections((p) => ({ ...p, mode: true }));
                }}
                style={planMode === 'lesson_flow' ? ui.primaryBtn : ui.secondaryBtn}
              >
                Lesson Flow
              </button>
              <button
                onClick={() => {
                  setPlanMode('activity_options');
                  setOpenSections((p) => ({ ...p, mode: true }));
                }}
                style={planMode === 'activity_options' ? ui.primaryBtn : ui.secondaryBtn}
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
                style={ui.smallBtnDanger}
              >
                Clear inactive rows
              </button>
            </div>

            {planMode === 'lesson_flow' ? (
              <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
                <div style={ui.muted}>Ordered rows: time / phase / activity / purpose (purpose optional).</div>
                {lessonFlow.map((p, idx) => (
                  <div key={idx} style={{ border: '1px solid #1F4E79', borderRadius: 12, padding: 10, background: '#FFFFFF' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                      <div style={{ fontWeight: 900, color: '#1F4E79' }}>Phase {idx + 1}</div>
                      <div style={ui.rowBtns}>
                        <button onClick={() => setLessonFlow((prev) => moveUp(prev, idx))} style={ui.smallBtn}>
                          ↑
                        </button>
                        <button onClick={() => setLessonFlow((prev) => moveDown(prev, idx))} style={ui.smallBtn}>
                          ↓
                        </button>
                        <button onClick={() => setLessonFlow((prev) => prev.filter((_, i) => i !== idx))} style={ui.smallBtnDanger}>
                          Delete
                        </button>
                      </div>
                    </div>

                    <div style={{ ...ui.grid2, marginTop: 10 }}>
                      <label style={{ display: 'grid', gap: 6 }}>
                        <div style={ui.label}>Time</div>
                        <input
                          value={p.time_text}
                          onFocus={() => setOpenSections((x) => ({ ...x, mode: true }))}
                          onChange={(e) => setLessonFlow((prev) => prev.map((x, i) => (i === idx ? { ...x, time_text: e.target.value } : x)))}
                          style={ui.input}
                        />
                      </label>
                      <label style={{ display: 'grid', gap: 6 }}>
                        <div style={ui.label}>Phase</div>
                        <input
                          value={p.phase_text}
                          onFocus={() => setOpenSections((x) => ({ ...x, mode: true }))}
                          onChange={(e) => setLessonFlow((prev) => prev.map((x, i) => (i === idx ? { ...x, phase_text: e.target.value } : x)))}
                          style={ui.input}
                        />
                      </label>
                      <label style={{ display: 'grid', gap: 6, gridColumn: '1 / -1' }}>
                        <div style={ui.label}>Activity</div>
                        <textarea
                          value={p.activity_text}
                          onFocus={() => setOpenSections((x) => ({ ...x, mode: true }))}
                          onChange={(e) => setLessonFlow((prev) => prev.map((x, i) => (i === idx ? { ...x, activity_text: e.target.value } : x)))}
                          rows={4}
                          style={ui.textarea}
                        />
                      </label>
                      <label style={{ display: 'grid', gap: 6, gridColumn: '1 / -1' }}>
                        <div style={ui.label}>Purpose (optional)</div>
                        <input
                          value={p.purpose_text}
                          onFocus={() => setOpenSections((x) => ({ ...x, mode: true }))}
                          onChange={(e) => setLessonFlow((prev) => prev.map((x, i) => (i === idx ? { ...x, purpose_text: e.target.value } : x)))}
                          style={ui.input}
                        />
                      </label>
                    </div>
                  </div>
                ))}

                <button
                  onClick={() => setLessonFlow((prev) => [...prev, { time_text: '', phase_text: '', activity_text: '', purpose_text: '' }])}
                  style={ui.secondaryBtn}
                >
                  + Add phase
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
                <div style={ui.muted}>Ordered options. Each option can include ordered steps.</div>

                {activityOptions.map((o, idx) => (
                  <div key={idx} style={{ border: '1px solid #1F4E79', borderRadius: 12, padding: 10, background: '#FFFFFF' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                      <div style={{ fontWeight: 900, color: '#1F4E79' }}>Option {idx + 1}</div>
                      <div style={ui.rowBtns}>
                        <button onClick={() => setActivityOptions((prev) => moveUp(prev, idx))} style={ui.smallBtn}>
                          ↑
                        </button>
                        <button onClick={() => setActivityOptions((prev) => moveDown(prev, idx))} style={ui.smallBtn}>
                          ↓
                        </button>
                        <button onClick={() => setActivityOptions((prev) => prev.filter((_, i) => i !== idx))} style={ui.smallBtnDanger}>
                          Delete
                        </button>
                      </div>
                    </div>

                    <div style={{ ...ui.grid2, marginTop: 10 }}>
                      <label style={{ display: 'grid', gap: 6, gridColumn: '1 / -1' }}>
                        <div style={ui.label}>Title</div>
                        <input
                          value={o.title}
                          onFocus={() => setOpenSections((x) => ({ ...x, mode: true }))}
                          onChange={(e) =>
                            setActivityOptions((prev) => prev.map((x, i) => (i === idx ? { ...x, title: e.target.value } : x)))
                          }
                          style={ui.input}
                        />
                      </label>
                      <label style={{ display: 'grid', gap: 6, gridColumn: '1 / -1' }}>
                        <div style={ui.label}>Description</div>
                        <textarea
                          value={o.description}
                          onFocus={() => setOpenSections((x) => ({ ...x, mode: true }))}
                          onChange={(e) =>
                            setActivityOptions((prev) => prev.map((x, i) => (i === idx ? { ...x, description: e.target.value } : x)))
                          }
                          rows={3}
                          style={ui.textarea}
                        />
                      </label>
                      <label style={{ display: 'grid', gap: 6, gridColumn: '1 / -1' }}>
                        <div style={ui.label}>Details</div>
                        <textarea
                          value={o.details_text}
                          onFocus={() => setOpenSections((x) => ({ ...x, mode: true }))}
                          onChange={(e) =>
                            setActivityOptions((prev) => prev.map((x, i) => (i === idx ? { ...x, details_text: e.target.value } : x)))
                          }
                          rows={4}
                          style={ui.textarea}
                        />
                      </label>
                      <label style={{ display: 'grid', gap: 6, gridColumn: '1 / -1' }}>
                        <div style={ui.label}>TOC role (optional)</div>
                        <input
                          value={o.toc_role_text}
                          onFocus={() => setOpenSections((x) => ({ ...x, mode: true }))}
                          onChange={(e) =>
                            setActivityOptions((prev) => prev.map((x, i) => (i === idx ? { ...x, toc_role_text: e.target.value } : x)))
                          }
                          style={ui.input}
                        />
                      </label>
                    </div>

                    <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
                      <div style={{ fontWeight: 900, color: '#1F4E79' }}>Steps</div>
                      {o.steps.map((s, sIdx) => (
                        <div key={sIdx} style={ui.rowItem}>
                          <input
                            value={s.text}
                            onFocus={() => setOpenSections((x) => ({ ...x, mode: true }))}
                            onChange={(e) =>
                              setActivityOptions((prev) =>
                                prev.map((x, i) =>
                                  i === idx
                                    ? {
                                        ...x,
                                        steps: x.steps.map((st, j) => (j === sIdx ? { ...st, text: e.target.value } : st)),
                                      }
                                    : x
                                )
                              )
                            }
                            placeholder={`Step ${sIdx + 1}`}
                            style={{ ...ui.input, flex: 1, minWidth: 280 }}
                          />
                          <div style={ui.rowBtns}>
                            <button
                              onClick={() =>
                                setActivityOptions((prev) =>
                                  prev.map((x, i) =>
                                    i === idx
                                      ? {
                                          ...x,
                                          steps: moveUp(x.steps, sIdx),
                                        }
                                      : x
                                  )
                                )
                              }
                              style={ui.smallBtn}
                            >
                              ↑
                            </button>
                            <button
                              onClick={() =>
                                setActivityOptions((prev) =>
                                  prev.map((x, i) =>
                                    i === idx
                                      ? {
                                          ...x,
                                          steps: moveDown(x.steps, sIdx),
                                        }
                                      : x
                                  )
                                )
                              }
                              style={ui.smallBtn}
                            >
                              ↓
                            </button>
                            <button
                              onClick={() =>
                                setActivityOptions((prev) =>
                                  prev.map((x, i) =>
                                    i === idx
                                      ? {
                                          ...x,
                                          steps: x.steps.filter((_, j) => j !== sIdx),
                                        }
                                      : x
                                  )
                                )
                              }
                              style={ui.smallBtnDanger}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}

                      <button
                        onClick={() =>
                          setActivityOptions((prev) => prev.map((x, i) => (i === idx ? { ...x, steps: [...x.steps, { text: '' }] } : x)))
                        }
                        style={ui.secondaryBtn}
                      >
                        + Add step
                      </button>
                    </div>
                  </div>
                ))}

                <button
                  onClick={() =>
                    setActivityOptions((prev) => [
                      ...prev,
                      { title: '', description: '', details_text: '', toc_role_text: '', steps: [{ text: '' }] },
                    ])
                  }
                  style={ui.secondaryBtn}
                >
                  + Add option
                </button>
              </div>
            )}
          </Collapsible>

          <Collapsible
            title="5. What to do if"
            open={!!openSections.whatif}
            onToggle={(next) => setOpenSections((p) => ({ ...p, whatif: next }))}
          >
            <div style={ui.muted}>Ordered scenarios + responses.</div>
            <div style={{ display: 'grid', gap: 10 }}>
              {whatIfItems.map((x, idx) => (
                <div key={idx} style={{ border: '1px solid #1F4E79', borderRadius: 12, padding: 10, background: '#FFFFFF' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ fontWeight: 900, color: '#1F4E79' }}>Item {idx + 1}</div>
                    <div style={ui.rowBtns}>
                      <button onClick={() => setWhatIfItems((prev) => moveUp(prev, idx))} style={ui.smallBtn}>
                        ↑
                      </button>
                      <button onClick={() => setWhatIfItems((prev) => moveDown(prev, idx))} style={ui.smallBtn}>
                        ↓
                      </button>
                      <button onClick={() => setWhatIfItems((prev) => prev.filter((_, i) => i !== idx))} style={ui.smallBtnDanger}>
                        Delete
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
                    <label style={{ display: 'grid', gap: 6 }}>
                      <div style={ui.label}>Scenario</div>
                      <input
                        value={x.scenario_text}
                        onFocus={() => setOpenSections((p) => ({ ...p, whatif: true }))}
                        onChange={(e) => setWhatIfItems((prev) => prev.map((r, i) => (i === idx ? { ...r, scenario_text: e.target.value } : r)))}
                        style={ui.input}
                      />
                    </label>
                    <label style={{ display: 'grid', gap: 6 }}>
                      <div style={ui.label}>Response</div>
                      <textarea
                        value={x.response_text}
                        onFocus={() => setOpenSections((p) => ({ ...p, whatif: true }))}
                        onChange={(e) => setWhatIfItems((prev) => prev.map((r, i) => (i === idx ? { ...r, response_text: e.target.value } : r)))}
                        rows={3}
                        style={ui.textarea}
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={() => setWhatIfItems((prev) => [...prev, { scenario_text: '', response_text: '' }])} style={ui.secondaryBtn}>
              + Add item
            </button>
          </Collapsible>
        </div>
      )}
    </div>
  );
}
