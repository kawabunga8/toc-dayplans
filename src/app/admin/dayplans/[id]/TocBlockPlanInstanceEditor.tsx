'use client';

import { useEffect, useMemo, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { ensureDefaultTemplateForClass } from '@/lib/appRules/templates';
import { useDemo } from '@/app/admin/DemoContext';
import type { TocSnippetRow } from '@/lib/tocSnippetTypes';

type Status = 'loading' | 'idle' | 'saving' | 'error';

type PlanMode = 'lesson_flow' | 'activity_options';

type AssessmentTouchPoint = {
  timing_in_lesson: string;
  learning_standard_focus: string;
  evidence_to_collect: string;
  differentiation_strategy: string;
  cyclical_loop_type: string;
};

type TemplateRow = {
  id: string;
  plan_mode: PlanMode;
  note_to_toc: string | null;
  assessment_touch_point?: AssessmentTouchPoint | null;
};

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
  id?: string;
  title: string;
  description: string;
  details_text: string;
  toc_role_text: string;
  source_template_option_id: string | null;
  steps: OptionStep[];
};

type WhatIf = { scenario_text: string; response_text: string; source_template_item_id: string | null };

/**
 * Dayplans TOC editor (Template-as-Source)
 *
 * - Lesson Flow is day-owned and editable by default (initialized from template once).
 * - Other sections are template previews by default.
 * - A section becomes editable only after "Create Day Override" clones that section into toc_* tables.
 */
export default function TocBlockPlanInstanceEditor(props: { dayPlanBlockId: string; classId: string }) {
  const { isDemo } = useDemo();
  const { dayPlanBlockId: blockId, classId } = props;

  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);

  const [tocBlockPlanId, setTocBlockPlanId] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState<string | null>(null);

  const [planMode, setPlanMode] = useState<PlanMode>('lesson_flow');
  const [noteTOC, setNoteTOC] = useState('');
  const [templateNoteTOC, setTemplateNoteTOC] = useState('');

  // Assessment touch point (template preview + day override)
  const [templateTouchPoint, setTemplateTouchPoint] = useState<AssessmentTouchPoint | null>(null);
  const [touchTiming, setTouchTiming] = useState('');
  const [touchStandard, setTouchStandard] = useState('');
  const [touchEvidence, setTouchEvidence] = useState('');
  const [touchDiff, setTouchDiff] = useState('');
  const [touchCycle, setTouchCycle] = useState('');

  // Template previews
  const [tplOpeningSteps, setTplOpeningSteps] = useState<Array<{ step_text: string }>>([]);
  const [tplWhatIf, setTplWhatIf] = useState<Array<{ scenario_text: string; response_text: string }>>([]);
  const [tplLessonFlow, setTplLessonFlow] = useState<Array<{ time_text: string; phase_text: string; activity_text: string; purpose_text: string | null }>>([]);
  const [tplActivityOptions, setTplActivityOptions] = useState<ActivityOption[]>([]);
  const [tplRoles, setTplRoles] = useState<Array<{ who: string; responsibility: string }>>([]);

  // Overrides (instance)
  const [openingSteps, setOpeningSteps] = useState<OpeningStep[]>([]);
  const [openingOverride, setOpeningOverride] = useState(false);
  const [openingTouched, setOpeningTouched] = useState(false);

  const [phases, setPhases] = useState<Phase[]>([]);
  const [lessonOverride, setLessonOverride] = useState(false);
  const [lessonTouched, setLessonTouched] = useState(false);
  const [dragPhaseIdx, setDragPhaseIdx] = useState<number | null>(null);

  const [activityOptions, setActivityOptions] = useState<ActivityOption[]>([]);
  const [activityOverride, setActivityOverride] = useState(false);
  const [activityTouched, setActivityTouched] = useState(false);

  const [whatIfItems, setWhatIfItems] = useState<WhatIf[]>([]);
  const [whatIfOverride, setWhatIfOverride] = useState(false);
  const [whatIfTouched, setWhatIfTouched] = useState(false);

  const [roles, setRoles] = useState<Array<{ who: string; responsibility: string }>>([]);
  const [rolesOverride, setRolesOverride] = useState(false);
  const [rolesTouched, setRolesTouched] = useState(false);
  const [showRolesEditor, setShowRolesEditor] = useState(false);

  const [showOpeningEditor, setShowOpeningEditor] = useState(false);
  const [showWhatIfEditor, setShowWhatIfEditor] = useState(false);
  const [showActivityEditor, setShowActivityEditor] = useState(false);

  // Snippet Library
  const [snippetOpen, setSnippetOpen] = useState(false);
  const [snippets, setSnippets] = useState<TocSnippetRow[]>([]);
  const [snippetStatus, setSnippetStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [snippetError, setSnippetError] = useState<string | null>(null);

  const modeLabel = useMemo(() => (planMode === 'lesson_flow' ? 'Lesson Flow' : 'Activity Options'), [planMode]);

  useEffect(() => {
    void ensureAndLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blockId, classId]);

  // Allow parent to request a publish-time cleanup+save.
  // This deletes legacy overrides that were never intentionally touched in this session,
  // so published /p reflects the template-first model.
  useEffect(() => {
    const type = `toc-publish-request:${blockId}`;
    const handler = async (e: Event) => {
      const evt = e as CustomEvent<{ resolve?: (x: any) => void; reject?: (err: any) => void }>;
      try {
        const supabase = getSupabaseClient();
        if (tocBlockPlanId) {
          // Lesson flow: if legacy override exists but user didn't touch, revert to template.
          if (!lessonTouched) {
            await supabase.from('toc_lesson_flow_phases').delete().eq('toc_block_plan_id', tocBlockPlanId);
            setLessonOverride(false);
            setPhases([]);
          }

          if (openingOverride && !openingTouched) {
            await supabase.from('toc_opening_routine_steps').delete().eq('toc_block_plan_id', tocBlockPlanId);
            setOpeningOverride(false);
            setOpeningSteps([]);
            setShowOpeningEditor(false);
          }

          if (whatIfOverride && !whatIfTouched) {
            await supabase.from('toc_what_to_do_if_items').delete().eq('toc_block_plan_id', tocBlockPlanId);
            setWhatIfOverride(false);
            setWhatIfItems([]);
            setShowWhatIfEditor(false);
          }

          if (rolesOverride && !rolesTouched) {
            await supabase.from('toc_role_rows').delete().eq('toc_block_plan_id', tocBlockPlanId);
            setRolesOverride(false);
            setRoles([]);
            setShowRolesEditor(false);
          }

          if (activityOverride && !activityTouched) {
            // Delete steps first, then options
            const { data: existing, error: exErr } = await supabase.from('toc_activity_options').select('id').eq('toc_block_plan_id', tocBlockPlanId);
            if (!exErr) {
              const ids = (existing ?? []).map((r: any) => r.id);
              if (ids.length) await supabase.from('toc_activity_option_steps').delete().in('toc_activity_option_id', ids);
            }
            await supabase.from('toc_activity_options').delete().eq('toc_block_plan_id', tocBlockPlanId);
            setActivityOverride(false);
            setActivityOptions([]);
            setShowActivityEditor(false);
          }

          // Refresh from DB after pruning.
          await loadAll(supabase, tocBlockPlanId, templateId);
        }

        await saveAll();
        evt.detail?.resolve?.(true);
      } catch (err) {
        evt.detail?.reject?.(err);
      }
    };

    window.addEventListener(type, handler as any);
    return () => window.removeEventListener(type, handler as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blockId, tocBlockPlanId, templateId, lessonTouched, openingTouched, whatIfTouched, rolesTouched, activityTouched, openingOverride, whatIfOverride, rolesOverride, activityOverride]);

  async function ensureAndLoad() {
    setStatus('loading');
    setError(null);

    try {
      const supabase = getSupabaseClient();

      // 1) Ensure toc_block_plans exists
      let { data: plan, error: planErr } = await supabase
        .from('toc_block_plans')
        .select('*')
        .eq('day_plan_block_id', blockId)
        .maybeSingle();
      if (planErr) throw planErr;

      if (!plan) {
        const { data: tpl, error: tplErr } = await supabase
          .from('class_toc_templates')
          .select('id,plan_mode,note_to_toc')
          .eq('class_id', classId)
          .eq('is_active', true)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (tplErr) throw tplErr;

        const inferredMode: PlanMode = (tpl?.plan_mode as any) ?? 'lesson_flow';

        const { data: created, error: createErr } = await supabase
          .from('toc_block_plans')
          .insert({
            day_plan_block_id: blockId,
            class_id: classId,
            template_id: tpl?.id ?? null,
            plan_mode: inferredMode,
            override_note_to_toc: null,
            // legacy overrides kept in DB, but not used in this UI
            override_teacher_name: null,
            override_ta_name: null,
            override_ta_role: null,
            override_phone_policy: null,
          })
          .select('*')
          .single();
        if (createErr) throw createErr;
        plan = created;
      }

      setTocBlockPlanId(plan.id);
      setTemplateId(plan.template_id ?? null);

      // 2) Ensure we point at the latest active template for this class.
      // If a newer template exists, we should use it as the source immediately
      // (day overrides are stored separately and remain intact).
      const { data: latestTpl, error: latestErr } = await supabase
        .from('class_toc_templates')
        .select('id,plan_mode,note_to_toc')
        .eq('class_id', classId)
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (latestErr) throw latestErr;

      if (latestTpl?.id && latestTpl.id !== plan.template_id) {
        await supabase.from('toc_block_plans').update({ template_id: latestTpl.id }).eq('id', plan.id);
        plan.template_id = latestTpl.id;
        setTemplateId(latestTpl.id);
      }

      // If no template exists yet, create a default.
      if (!plan.template_id) {
        const created = await ensureDefaultTemplateForClass(supabase, classId);
        if (created?.id) {
          await supabase.from('toc_block_plans').update({ template_id: created.id }).eq('id', plan.id);
          plan.template_id = created.id;
          setTemplateId(created.id);
        }
      }

      // 3) Load template previews + instance overrides
      await loadAll(supabase, plan.id, plan.template_id ?? null);
      setStatus('idle');
    } catch (e: any) {
      setStatus('error');
      setError(e?.message ?? 'Failed to load TOC plan');
    }
  }

  async function loadSnippets() {
    setSnippetStatus('loading');
    setSnippetError(null);
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('toc_snippets')
        .select('id,title,description,tags,payload,updated_at')
        .order('title', { ascending: true });
      if (error) throw error;
      setSnippets((data ?? []) as any);
      setSnippetStatus('idle');
    } catch (e: any) {
      setSnippetStatus('error');
      setSnippetError(e?.message ?? 'Failed to load snippet library');
      setSnippets([]);
    }
  }

  async function applySnippet(snippet: TocSnippetRow) {
    if (!tocBlockPlanId) return;
    if (isDemo) return;

    const payload = snippet.payload ?? ({} as any);

    const ok = window.confirm(
      `Insert “${snippet.title}” into this day plan override? This will replace any existing day overrides in the affected sections.`
    );
    if (!ok) return;

    setStatus('saving');
    setError(null);

    try {
      const supabase = getSupabaseClient();
      const pid = tocBlockPlanId;

      // Opening steps
      if (Array.isArray(payload.opening_steps) && payload.opening_steps.length > 0) {
        await supabase.from('toc_opening_routine_steps').delete().eq('toc_block_plan_id', pid);
        const rows = payload.opening_steps.map((step_text, idx) => ({
          toc_block_plan_id: pid,
          sort_order: idx + 1,
          step_text,
          source_template_step_id: null,
        }));
        const { error } = await supabase.from('toc_opening_routine_steps').insert(rows);
        if (error) throw error;
        setOpeningOverride(true);
        setOpeningTouched(true);
        setShowOpeningEditor(true);
      }

      // Lesson flow phases
      if (Array.isArray(payload.lesson_flow_phases) && payload.lesson_flow_phases.length > 0) {
        await supabase.from('toc_lesson_flow_phases').delete().eq('toc_block_plan_id', pid);
        const rows = payload.lesson_flow_phases.map((p, idx) => ({
          toc_block_plan_id: pid,
          sort_order: idx + 1,
          time_text: String(p.time_text ?? ''),
          phase_text: String(p.phase_text ?? ''),
          activity_text: String(p.activity_text ?? ''),
          purpose_text: p.purpose_text ? String(p.purpose_text) : null,
          source_template_phase_id: null,
        }));
        const { error } = await supabase.from('toc_lesson_flow_phases').insert(rows);
        if (error) throw error;
        setLessonOverride(true);
        setLessonTouched(true);
      }

      // What-if
      if (Array.isArray(payload.what_if_items) && payload.what_if_items.length > 0) {
        await supabase.from('toc_what_to_do_if_items').delete().eq('toc_block_plan_id', pid);
        const rows = payload.what_if_items.map((w, idx) => ({
          toc_block_plan_id: pid,
          sort_order: idx + 1,
          scenario_text: String(w.scenario_text ?? ''),
          response_text: String(w.response_text ?? ''),
          source_template_item_id: null,
        }));
        const { error } = await supabase.from('toc_what_to_do_if_items').insert(rows);
        if (error) throw error;
        setWhatIfOverride(true);
        setWhatIfTouched(true);
        setShowWhatIfEditor(true);
      }

      // Roles
      if (Array.isArray(payload.roles) && payload.roles.length > 0) {
        await supabase.from('toc_role_rows').delete().eq('toc_block_plan_id', pid);
        const rows = payload.roles.map((r, idx) => ({
          toc_block_plan_id: pid,
          sort_order: idx + 1,
          who: String(r.who ?? ''),
          responsibility: String(r.responsibility ?? ''),
        }));
        const { error } = await supabase.from('toc_role_rows').insert(rows);
        if (error) throw error;
        setRolesOverride(true);
        setRolesTouched(true);
        setShowRolesEditor(true);
      }

      // Activity options
      if (Array.isArray(payload.activity_options) && payload.activity_options.length > 0) {
        // delete steps first, then options
        const { data: existing, error: exErr } = await supabase.from('toc_activity_options').select('id').eq('toc_block_plan_id', pid);
        if (exErr) throw exErr;
        const ids = (existing ?? []).map((r: any) => r.id);
        if (ids.length) {
          const { error } = await supabase.from('toc_activity_option_steps').delete().in('toc_activity_option_id', ids);
          if (error) throw error;
        }
        await supabase.from('toc_activity_options').delete().eq('toc_block_plan_id', pid);

        const optRows = payload.activity_options.map((o, idx) => ({
          toc_block_plan_id: pid,
          sort_order: idx + 1,
          title: String(o.title ?? ''),
          description: String(o.description ?? ''),
          details_text: String(o.details_text ?? ''),
          toc_role_text: o.toc_role_text ? String(o.toc_role_text) : null,
          source_template_option_id: null,
        }));

        const { data: inserted, error: insErr } = await supabase.from('toc_activity_options').insert(optRows).select('id,sort_order');
        if (insErr) throw insErr;

        const bySort = new Map<number, string>();
        for (const r of inserted ?? []) bySort.set((r as any).sort_order, (r as any).id);

        const stepRows: any[] = [];
        for (let i = 0; i < payload.activity_options.length; i++) {
          const o = payload.activity_options[i]!;
          const optId = bySort.get(i + 1);
          if (!optId) continue;
          const steps = Array.isArray(o.steps) ? o.steps : [];
          for (let j = 0; j < steps.length; j++) {
            const st = steps[j]!;
            stepRows.push({
              toc_activity_option_id: optId,
              sort_order: j + 1,
              step_text: String((st as any).step_text ?? ''),
              source_template_option_step_id: null,
            });
          }
        }
        if (stepRows.length) {
          const { error } = await supabase.from('toc_activity_option_steps').insert(stepRows);
          if (error) throw error;
        }

        setActivityOverride(true);
        setActivityTouched(true);
        setShowActivityEditor(true);
      }

      await loadAll(supabase, pid, templateId);
      setSnippetOpen(false);
      setStatus('idle');
    } catch (e: any) {
      setStatus('error');
      setError(e?.message ?? 'Failed to apply snippet');
    }
  }

  async function loadAll(supabase: ReturnType<typeof getSupabaseClient>, tocPlanId: string, tplId: string | null) {
    const { data: plan, error: pErr } = await supabase
      .from('toc_block_plans')
      .select('template_id,plan_mode,override_note_to_toc,override_assessment_touch_point')
      .eq('id', tocPlanId)
      .single();
    if (pErr) throw pErr;

    // Always prefer the latest active template for this class (in case it changed since plan creation).
    let effectiveTplId = tplId ?? plan.template_id ?? null;
    try {
      const { data: latestTpl, error: latestErr } = await supabase
        .from('class_toc_templates')
        .select('id')
        .eq('class_id', classId)
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!latestErr && latestTpl?.id) effectiveTplId = latestTpl.id;
    } catch {
      // ignore
    }

    if (effectiveTplId && effectiveTplId !== plan.template_id) {
      await supabase.from('toc_block_plans').update({ template_id: effectiveTplId }).eq('id', tocPlanId);
    }

    setTemplateId(effectiveTplId);
    setPlanMode(plan.plan_mode as PlanMode);

    let tplNote = '';
    let tplTouch: any = null;
    if (effectiveTplId) {
      const { data: tplRow, error: tErr } = await supabase
        .from('class_toc_templates')
        .select('note_to_toc,assessment_touch_point')
        .eq('id', effectiveTplId)
        .maybeSingle();
      if (tErr) throw tErr;
      tplNote = (tplRow?.note_to_toc ?? '').toString();
      tplTouch = (tplRow as any)?.assessment_touch_point ?? null;
    }
    setTemplateNoteTOC(tplNote);
    setTemplateTouchPoint(tplTouch);
    const override = (plan.override_note_to_toc ?? '').toString();
    setNoteTOC(override || tplNote);

    const tp = ((plan as any).override_assessment_touch_point ?? null) as any;
    const baseTp = tplTouch ?? null;
    const effectiveTp = tp && Object.keys(tp).length ? tp : baseTp;
    setTouchTiming(String(effectiveTp?.timing_in_lesson ?? ''));
    setTouchStandard(String(effectiveTp?.learning_standard_focus ?? ''));
    setTouchEvidence(String(effectiveTp?.evidence_to_collect ?? ''));
    setTouchDiff(String(effectiveTp?.differentiation_strategy ?? ''));
    setTouchCycle(String(effectiveTp?.cyclical_loop_type ?? ''));

    // template previews
    if (effectiveTplId) {
      const [orRes, wiRes, lfRes, optRes, roleRes] = await Promise.all([
        supabase.from('class_opening_routine_steps').select('sort_order,step_text').eq('template_id', effectiveTplId).order('sort_order', { ascending: true }),
        supabase.from('class_what_to_do_if_items').select('sort_order,scenario_text,response_text').eq('template_id', effectiveTplId).order('sort_order', { ascending: true }),
        supabase.from('class_lesson_flow_phases').select('sort_order,time_text,phase_text,activity_text,purpose_text').eq('template_id', effectiveTplId).order('sort_order', { ascending: true }),
        supabase.from('class_activity_options').select('id,sort_order,title,description,details_text,toc_role_text').eq('template_id', effectiveTplId).order('sort_order', { ascending: true }),
        supabase.from('class_role_rows').select('sort_order,who,responsibility').eq('template_id', effectiveTplId).order('sort_order', { ascending: true }),
      ]);
      if (orRes.error) throw orRes.error;
      if (wiRes.error) throw wiRes.error;
      if (lfRes.error) throw lfRes.error;
      if (optRes.error) throw optRes.error;
      if (roleRes.error) throw roleRes.error;

      setTplOpeningSteps((orRes.data ?? []).map((r: any) => ({ step_text: r.step_text })));
      setTplWhatIf((wiRes.data ?? []).map((r: any) => ({ scenario_text: r.scenario_text, response_text: r.response_text })));
      setTplLessonFlow((lfRes.data ?? []).map((r: any) => ({ time_text: r.time_text, phase_text: r.phase_text, activity_text: r.activity_text, purpose_text: r.purpose_text ?? null })));

      const tOpts = optRes.data ?? [];
      const optIds = tOpts.map((o: any) => o.id);
      let tStepsByOpt: Record<string, any[]> = {};
      if (optIds.length) {
        const { data: st, error: stErr } = await supabase
          .from('class_activity_option_steps')
          .select('activity_option_id,sort_order,step_text')
          .in('activity_option_id', optIds)
          .order('sort_order', { ascending: true });
        if (stErr) throw stErr;
        for (const r of st ?? []) {
          const arr = tStepsByOpt[r.activity_option_id] ?? [];
          arr.push(r);
          tStepsByOpt[r.activity_option_id] = arr;
        }
      }
      setTplActivityOptions(
        tOpts.map((o: any) => ({
          title: o.title,
          description: o.description,
          details_text: o.details_text,
          toc_role_text: o.toc_role_text ?? '',
          source_template_option_id: o.id,
          steps: (tStepsByOpt[o.id] ?? []).map((s: any) => ({ step_text: s.step_text, source_template_option_step_id: null })),
        }))
      );

      setTplRoles((roleRes.data ?? []).map((r: any) => ({ who: r.who, responsibility: r.responsibility })));
    } else {
      setTplOpeningSteps([]);
      setTplWhatIf([]);
      setTplLessonFlow([]);
      setTplActivityOptions([]);
      setTplRoles([]);
    }

    // overrides (instance)
    const [or2, lf2, wi2, opt2, role2] = await Promise.all([
      supabase
        .from('toc_opening_routine_steps')
        .select('sort_order,step_text,source_template_step_id')
        .eq('toc_block_plan_id', tocPlanId)
        .order('sort_order', { ascending: true }),
      supabase
        .from('toc_lesson_flow_phases')
        .select('sort_order,time_text,phase_text,activity_text,purpose_text,source_template_phase_id')
        .eq('toc_block_plan_id', tocPlanId)
        .order('sort_order', { ascending: true }),
      supabase
        .from('toc_what_to_do_if_items')
        .select('sort_order,scenario_text,response_text,source_template_item_id')
        .eq('toc_block_plan_id', tocPlanId)
        .order('sort_order', { ascending: true }),
      supabase
        .from('toc_activity_options')
        .select('id,sort_order,title,description,details_text,toc_role_text,source_template_option_id')
        .eq('toc_block_plan_id', tocPlanId)
        .order('sort_order', { ascending: true }),
      supabase
        .from('toc_role_rows')
        .select('sort_order,who,responsibility')
        .eq('toc_block_plan_id', tocPlanId)
        .order('sort_order', { ascending: true }),
    ]);
    if (or2.error) throw or2.error;
    if (lf2.error) throw lf2.error;
    if (wi2.error) throw wi2.error;
    if (opt2.error) throw opt2.error;
    if (role2.error) throw role2.error;

    setOpeningSteps((or2.data ?? []).map((r: any) => ({ step_text: r.step_text, source_template_step_id: r.source_template_step_id ?? null })));
    setOpeningOverride((or2.data ?? []).length > 0);

    setPhases(
      (lf2.data ?? []).map((r: any) => ({
        time_text: r.time_text,
        phase_text: r.phase_text,
        activity_text: r.activity_text,
        purpose_text: r.purpose_text ?? '',
        source_template_phase_id: r.source_template_phase_id ?? null,
      }))
    );
    setLessonOverride((lf2.data ?? []).length > 0);

    setWhatIfItems((wi2.data ?? []).map((r: any) => ({ scenario_text: r.scenario_text, response_text: r.response_text, source_template_item_id: r.source_template_item_id ?? null })));
    setWhatIfOverride((wi2.data ?? []).length > 0);

    const opts = opt2.data ?? [];
    const optIds = opts.map((o: any) => o.id);
    let stepsByOpt: Record<string, any[]> = {};
    if (optIds.length) {
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
      opts.map((o: any) => ({
        title: o.title,
        description: o.description,
        details_text: o.details_text,
        toc_role_text: o.toc_role_text ?? '',
        source_template_option_id: o.source_template_option_id ?? null,
        steps: (stepsByOpt[o.id] ?? []).map((s: any) => ({ step_text: s.step_text, source_template_option_step_id: s.source_template_option_step_id ?? null })),
      }))
    );
    setActivityOverride(opts.length > 0);

    setRoles((role2.data ?? []).map((r: any) => ({ who: r.who, responsibility: r.responsibility })));
    setRolesOverride((role2.data ?? []).length > 0);
  }

  async function createOpeningOverride() {
    if (!tocBlockPlanId || !templateId || isDemo) return;
    setStatus('saving');
    setError(null);
    try {
      const supabase = getSupabaseClient();
      const { data: tSteps, error: tErr } = await supabase
        .from('class_opening_routine_steps')
        .select('id,sort_order,step_text')
        .eq('template_id', templateId)
        .order('sort_order', { ascending: true });
      if (tErr) throw tErr;

      await supabase.from('toc_opening_routine_steps').delete().eq('toc_block_plan_id', tocBlockPlanId);
      if ((tSteps?.length ?? 0) > 0) {
        const rows = (tSteps ?? []).map((r: any) => ({
          toc_block_plan_id: tocBlockPlanId,
          sort_order: r.sort_order,
          step_text: r.step_text,
          source_template_step_id: r.id,
        }));
        const { error } = await supabase.from('toc_opening_routine_steps').insert(rows);
        if (error) throw error;
      }

      await loadAll(supabase, tocBlockPlanId, templateId);
      setOpeningOverride(true);
      setOpeningTouched(true);
      setShowOpeningEditor(true);
      setStatus('idle');
    } catch (e: any) {
      setStatus('error');
      setError(e?.message ?? 'Failed to create override');
    }
  }

  async function createWhatIfOverride() {
    if (!tocBlockPlanId || !templateId || isDemo) return;
    setStatus('saving');
    setError(null);
    try {
      const supabase = getSupabaseClient();
      const { data: rows0, error: tErr } = await supabase
        .from('class_what_to_do_if_items')
        .select('id,sort_order,scenario_text,response_text')
        .eq('template_id', templateId)
        .order('sort_order', { ascending: true });
      if (tErr) throw tErr;

      await supabase.from('toc_what_to_do_if_items').delete().eq('toc_block_plan_id', tocBlockPlanId);
      if ((rows0?.length ?? 0) > 0) {
        const rows = (rows0 ?? []).map((r: any) => ({
          toc_block_plan_id: tocBlockPlanId,
          sort_order: r.sort_order,
          scenario_text: r.scenario_text,
          response_text: r.response_text,
          source_template_item_id: r.id,
        }));
        const { error } = await supabase.from('toc_what_to_do_if_items').insert(rows);
        if (error) throw error;
      }

      await loadAll(supabase, tocBlockPlanId, templateId);
      setWhatIfOverride(true);
      setWhatIfTouched(true);
      setShowWhatIfEditor(true);
      setStatus('idle');
    } catch (e: any) {
      setStatus('error');
      setError(e?.message ?? 'Failed to create override');
    }
  }

  async function createRolesOverride() {
    if (!tocBlockPlanId || !templateId || isDemo) return;
    setStatus('saving');
    setError(null);
    try {
      const supabase = getSupabaseClient();
      const { data: rows0, error: tErr } = await supabase
        .from('class_role_rows')
        .select('id,sort_order,who,responsibility')
        .eq('template_id', templateId)
        .order('sort_order', { ascending: true });
      if (tErr) throw tErr;

      await supabase.from('toc_role_rows').delete().eq('toc_block_plan_id', tocBlockPlanId);
      if ((rows0?.length ?? 0) > 0) {
        const rows = (rows0 ?? []).map((r: any) => ({
          toc_block_plan_id: tocBlockPlanId,
          sort_order: r.sort_order,
          who: r.who,
          responsibility: r.responsibility,
        }));
        const { error } = await supabase.from('toc_role_rows').insert(rows);
        if (error) throw error;
      }

      await loadAll(supabase, tocBlockPlanId, templateId);
      setRolesOverride(true);
      setRolesTouched(true);
      setShowRolesEditor(true);
      setStatus('idle');
    } catch (e: any) {
      setStatus('error');
      setError(e?.message ?? 'Failed to create override');
    }
  }

  async function createActivityOverride() {
    if (!tocBlockPlanId || !templateId || isDemo) return;
    setStatus('saving');
    setError(null);
    try {
      const supabase = getSupabaseClient();

      const { data: tOpts, error: tOptErr } = await supabase
        .from('class_activity_options')
        .select('id,sort_order,title,description,details_text,toc_role_text')
        .eq('template_id', templateId)
        .order('sort_order', { ascending: true });
      if (tOptErr) throw tOptErr;

      // wipe existing
      const { data: existingOpts, error: exErr } = await supabase
        .from('toc_activity_options')
        .select('id')
        .eq('toc_block_plan_id', tocBlockPlanId);
      if (exErr) throw exErr;
      const ids = (existingOpts ?? []).map((r: any) => r.id);
      if (ids.length) await supabase.from('toc_activity_option_steps').delete().in('toc_activity_option_id', ids);
      await supabase.from('toc_activity_options').delete().eq('toc_block_plan_id', tocBlockPlanId);

      if ((tOpts?.length ?? 0) > 0) {
        const insRows = (tOpts ?? []).map((r: any) => ({
          toc_block_plan_id: tocBlockPlanId,
          sort_order: r.sort_order,
          title: r.title,
          description: r.description,
          details_text: r.details_text,
          toc_role_text: r.toc_role_text,
          source_template_option_id: r.id,
        }));

        const { data: inserted, error: insErr } = await supabase
          .from('toc_activity_options')
          .insert(insRows)
          .select('id,source_template_option_id');
        if (insErr) throw insErr;

        const idBySource = new Map<string, string>();
        for (const r of inserted ?? []) {
          if (r.source_template_option_id) idBySource.set(r.source_template_option_id, r.id);
        }

        const { data: tSteps, error: tStepsErr } = await supabase
          .from('class_activity_option_steps')
          .select('id,activity_option_id,sort_order,step_text')
          .in(
            'activity_option_id',
            (tOpts ?? []).map((o: any) => o.id)
          )
          .order('sort_order', { ascending: true });
        if (tStepsErr) throw tStepsErr;

        const stepRows = (tSteps ?? [])
          .map((s: any) => ({
            toc_activity_option_id: idBySource.get(s.activity_option_id) ?? null,
            sort_order: s.sort_order,
            step_text: s.step_text,
            source_template_option_step_id: s.id,
          }))
          .filter((r: any) => !!r.toc_activity_option_id);

        if (stepRows.length) {
          const { error } = await supabase.from('toc_activity_option_steps').insert(stepRows);
          if (error) throw error;
        }
      }

      await loadAll(supabase, tocBlockPlanId, templateId);
      setActivityOverride(true);
      setActivityTouched(true);
      setShowActivityEditor(true);
      setStatus('idle');
    } catch (e: any) {
      setStatus('error');
      setError(e?.message ?? 'Failed to create override');
    }
  }

  function ensureLessonOverrideForEdit(): Phase[] {
    if (lessonOverride) return phases;

    const seeded: Phase[] = (tplLessonFlow ?? []).map((r: any) => ({
      time_text: String(r.time_text ?? ''),
      phase_text: String(r.phase_text ?? ''),
      activity_text: String(r.activity_text ?? ''),
      purpose_text: String(r.purpose_text ?? ''),
      source_template_phase_id: null,
    }));

    setLessonOverride(true);
    setLessonTouched(true);
    setPhases(seeded);
    return seeded;
  }

  async function saveAll() {
    if (!tocBlockPlanId) return;
    if (isDemo) return;

    setStatus('saving');
    setError(null);

    try {
      const supabase = getSupabaseClient();

      // header
      const { error: upErr } = await supabase
        .from('toc_block_plans')
        .update({
          plan_mode: planMode,
          override_note_to_toc: (() => {
            const v = noteTOC.trim() ? noteTOC.trim() : null;
            const base = templateNoteTOC.trim() ? templateNoteTOC.trim() : null;
            if (v && base && v === base) return null;
            return v;
          })(),
          override_assessment_touch_point: {
            timing_in_lesson: touchTiming.trim(),
            learning_standard_focus: touchStandard.trim(),
            evidence_to_collect: touchEvidence.trim(),
            differentiation_strategy: touchDiff.trim(),
            cyclical_loop_type: touchCycle.trim(),
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', tocBlockPlanId);
      if (upErr) throw upErr;

      // Lesson flow: only persist an override if the user actually edited for this day.
      if (lessonOverride) {
        await supabase.from('toc_lesson_flow_phases').delete().eq('toc_block_plan_id', tocBlockPlanId);
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
      }

      // Opening routine overrides only if created
      if (openingOverride) {
        await supabase.from('toc_opening_routine_steps').delete().eq('toc_block_plan_id', tocBlockPlanId);
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
      }

      // What-if overrides only if created
      if (whatIfOverride) {
        await supabase.from('toc_what_to_do_if_items').delete().eq('toc_block_plan_id', tocBlockPlanId);
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
      }

      // Roles overrides only if created
      if (rolesOverride) {
        await supabase.from('toc_role_rows').delete().eq('toc_block_plan_id', tocBlockPlanId);
        if (roles.length > 0) {
          const rows = roles.map((r, i) => ({
            toc_block_plan_id: tocBlockPlanId,
            sort_order: i + 1,
            who: r.who,
            responsibility: r.responsibility,
          }));
          const { error } = await supabase.from('toc_role_rows').insert(rows);
          if (error) throw error;
        }
      }

      // Activity options overrides only if created
      if (activityOverride) {
        // Delete steps first, then options
        const { data: existingOpts, error: loadOptErr } = await supabase
          .from('toc_activity_options')
          .select('id')
          .eq('toc_block_plan_id', tocBlockPlanId);
        if (loadOptErr) throw loadOptErr;
        const optIds = (existingOpts ?? []).map((r: any) => r.id);
        if (optIds.length) {
          const { error } = await supabase.from('toc_activity_option_steps').delete().in('toc_activity_option_id', optIds);
          if (error) throw error;
        }
        await supabase.from('toc_activity_options').delete().eq('toc_block_plan_id', tocBlockPlanId);

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
      }

      // Reload state
      await loadAll(supabase, tocBlockPlanId, templateId);
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
          <div style={{ fontWeight: 900 }}>TOC Plan (dayplan)</div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>
            Mode: <b>{modeLabel}</b> {templateId ? '• template-driven' : '• no template'}
          </div>
        </div>

        <div style={{ fontSize: 12, opacity: 0.8 }}>
          {status === 'saving' ? 'Saving…' : status === 'error' ? 'Not saved' : ' '}
        </div>
      </div>

      <div style={styles.templateHint}>
        <div style={{ fontWeight: 900, color: '#1F4E79' }}>Most content comes from the Class Template.</div>
        <div style={{ fontSize: 12, opacity: 0.85 }}>Change defaults once in the template. Day overrides are optional.</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <a href={`/admin/courses/${classId}/toc-template`} style={styles.templateLink}>
            Edit class template →
          </a>
          <button
            type="button"
            style={styles.secondaryBtn}
            disabled={isDemo}
            onClick={() => {
              setSnippetOpen(true);
              if (snippets.length === 0 && snippetStatus !== 'loading') void loadSnippets();
            }}
          >
            Insert from Library…
          </button>
        </div>
      </div>

      {error ? <div style={styles.errorBox}>{error}</div> : null}

      {snippetOpen ? (
        <div style={styles.snippetBackdrop} onClick={(e) => {
          if (e.target === e.currentTarget) setSnippetOpen(false);
        }}>
          <div style={styles.snippetModal}>
            <div style={styles.snippetHeader}>
              <div>
                <div style={{ fontWeight: 900, color: RCS.deepNavy }}>Snippet Library</div>
                <div style={{ fontSize: 12, opacity: 0.85 }}>Insert structured routines into this day override.</div>
              </div>
              <button type="button" style={styles.secondaryBtn} onClick={() => setSnippetOpen(false)}>
                Close
              </button>
            </div>

            {snippetStatus === 'loading' ? <div style={{ opacity: 0.8 }}>Loading…</div> : null}
            {snippetStatus === 'error' && snippetError ? <div style={styles.errorBox}>{snippetError}</div> : null}

            <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
              {snippets.length ? (
                snippets.map((s) => (
                  <div key={s.id} style={styles.snippetRow}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 900 }}>{s.title}</div>
                      {s.description ? <div style={{ fontSize: 12, opacity: 0.85 }}>{s.description}</div> : null}
                      {Array.isArray(s.tags) && s.tags.length ? (
                        <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85 }}>
                          {s.tags.map((t) => `#${t}`).join(' ')}
                        </div>
                      ) : null}
                    </div>
                    <button type="button" style={styles.primaryBtn} onClick={() => void applySnippet(s)} disabled={isDemo || status === 'saving'}>
                      Insert
                    </button>
                  </div>
                ))
              ) : (
                <div style={{ opacity: 0.8 }}>No snippets found. (Run supabase/schema_toc_snippets.sql)</div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <div style={styles.grid2}>
        <label style={styles.field}>
          <span style={styles.label}>Plan Mode</span>
          <select value={planMode} onChange={(e) => setPlanMode(e.target.value as any)} style={styles.input} disabled={isDemo}>
            <option value="lesson_flow">Lesson Flow</option>
            <option value="activity_options">Activity Options</option>
          </select>
        </label>

        <label style={{ ...styles.field, gridColumn: '1 / -1' }}>
          <span style={styles.label}>Note to TOC (blank = use template)</span>
          <textarea
            value={noteTOC}
            placeholder={templateNoteTOC || ''}
            onChange={(e) => setNoteTOC(e.target.value)}
            rows={3}
            style={styles.textarea}
            disabled={isDemo}
          />
        </label>

        <div style={{ gridColumn: '1 / -1', ...styles.touchCard }}>
          <div style={{ ...styles.sectionHeader, marginBottom: 8 }}>Standards-Based Assessment Touch Point</div>
          <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 10 }}>
            A quick check-in embedded in your lesson (evidence + differentiation). Saved as a day override.
          </div>

          <div style={styles.grid2}>
            <label style={styles.field}>
              <span style={styles.label}>Timing in lesson</span>
              <input value={touchTiming} onChange={(e) => setTouchTiming(e.target.value)} style={styles.input} placeholder="e.g., 15 minutes into flow" />
            </label>
            <label style={styles.field}>
              <span style={styles.label}>Cyclical loop type</span>
              <input value={touchCycle} onChange={(e) => setTouchCycle(e.target.value)} style={styles.input} placeholder="design / rehearsal / refinement" />
            </label>
            <label style={{ ...styles.field, gridColumn: '1 / -1' }}>
              <span style={styles.label}>Learning Standard focus (reference)</span>
              <input value={touchStandard} onChange={(e) => setTouchStandard(e.target.value)} style={styles.input} placeholder="e.g., ADST > Define and Ideate" />
            </label>
            <label style={{ ...styles.field, gridColumn: '1 / -1' }}>
              <span style={styles.label}>Evidence to collect</span>
              <input value={touchEvidence} onChange={(e) => setTouchEvidence(e.target.value)} style={styles.input} placeholder="e.g., verbal articulation of…" />
            </label>
            <label style={{ ...styles.field, gridColumn: '1 / -1' }}>
              <span style={styles.label}>Differentiation strategy (UDL / IEP)</span>
              <input value={touchDiff} onChange={(e) => setTouchDiff(e.target.value)} style={styles.input} placeholder="e.g., chunking, sentence starters, extended time…" />
            </label>
          </div>

          {templateTouchPoint ? (
            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.8 }}>
              Template baseline: {String((templateTouchPoint as any)?.timing_in_lesson ?? '').trim() ? 'set' : '—'}
            </div>
          ) : null}
        </div>
      </div>

      {/* Lesson flow: template-first; first edit creates a day override */}
      <div style={styles.section}>
        <div style={{ ...styles.sectionHeader, display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div>Lesson Flow {lessonOverride ? '(overridden for this day)' : '(using template)'}</div>
          {lessonOverride ? (
            <button
              type="button"
              onClick={async () => {
                if (!tocBlockPlanId) return;
                if (isDemo) return;
                const ok = window.confirm('Revert lesson flow to the class template? This will delete day-specific overrides.');
                if (!ok) return;
                try {
                  setStatus('saving');
                  const supabase = getSupabaseClient();
                  await supabase.from('toc_lesson_flow_phases').delete().eq('toc_block_plan_id', tocBlockPlanId);
                  setLessonOverride(false);
                  setLessonTouched(false);
                  setPhases([]);
                  await loadAll(supabase, tocBlockPlanId, templateId);
                  setStatus('idle');
                } catch (e: any) {
                  setStatus('error');
                  setError(e?.message ?? 'Failed to revert');
                }
              }}
              style={styles.secondaryBtn}
              disabled={isDemo || status === 'saving'}
            >
              Revert to template
            </button>
          ) : null}
        </div>

        <div style={{ display: 'grid', gap: 8 }}>
          {(lessonOverride ? phases : (tplLessonFlow as any[])).map((p: any, idx: number) => (
            <div
              key={idx}
              style={{
                ...styles.phaseRow,
                opacity: dragPhaseIdx === idx ? 0.6 : 1,
                borderStyle: dragPhaseIdx !== null && dragPhaseIdx !== idx ? 'dashed' : (styles.phaseRow as any).borderStyle,
              }}
              draggable={!isDemo && lessonOverride}
              onDragStart={() => {
                if (isDemo) return;
                if (!lessonOverride) return;
                setDragPhaseIdx(idx);
              }}
              onDragEnd={() => setDragPhaseIdx(null)}
              onDragOver={(e) => {
                if (isDemo) return;
                if (!lessonOverride) return;
                e.preventDefault();
              }}
              onDrop={() => {
                if (isDemo) return;
                if (!lessonOverride) return;
                if (dragPhaseIdx === null || dragPhaseIdx === idx) return;
                setPhases((prev) => {
                  const copy = [...prev];
                  const [moved] = copy.splice(dragPhaseIdx, 1);
                  copy.splice(idx, 0, moved);
                  return copy;
                });
                setDragPhaseIdx(null);
              }}
            >
              <div style={styles.dragHandle} title={lessonOverride ? 'Drag to reorder' : 'Template row'}>
                ⋮⋮
              </div>
              <input
                value={String(p.time_text ?? '')}
                onChange={(e) => {
                  const next = ensureLessonOverrideForEdit();
                  setPhases(next.map((x, i) => (i === idx ? { ...x, time_text: e.target.value } : x)));
                }}
                style={styles.input}
                disabled={isDemo}
                placeholder="Time"
              />
              <input
                value={String(p.phase_text ?? '')}
                onChange={(e) => {
                  const next = ensureLessonOverrideForEdit();
                  setPhases(next.map((x, i) => (i === idx ? { ...x, phase_text: e.target.value } : x)));
                }}
                style={styles.input}
                disabled={isDemo}
                placeholder="Phase"
              />
              <textarea
                value={String(p.activity_text ?? '')}
                onChange={(e) => {
                  const next = ensureLessonOverrideForEdit();
                  setPhases(next.map((x, i) => (i === idx ? { ...x, activity_text: e.target.value } : x)));
                }}
                style={{ ...styles.textarea, resize: 'vertical' }}
                disabled={isDemo}
                placeholder="Activity"
                rows={2}
              />
              <input
                value={String(p.purpose_text ?? '')}
                onChange={(e) => {
                  const next = ensureLessonOverrideForEdit();
                  setPhases(next.map((x, i) => (i === idx ? { ...x, purpose_text: e.target.value } : x)));
                }}
                style={styles.input}
                disabled={isDemo}
                placeholder="Purpose (optional)"
              />
              <button
                onClick={() => {
                  const next = ensureLessonOverrideForEdit();
                  setPhases(next.filter((_, i) => i !== idx));
                }}
                style={styles.dangerBtn}
                disabled={isDemo}
              >
                Remove
              </button>
            </div>
          ))}

          <button
            onClick={() => {
              const next = ensureLessonOverrideForEdit();
              setPhases((p) => [...(lessonOverride ? p : next), { time_text: '', phase_text: '', activity_text: '', purpose_text: '', source_template_phase_id: null }]);
            }}
            style={styles.secondaryBtn}
            disabled={isDemo}
          >
            + Add phase
          </button>

          {!lessonOverride && tplLessonFlow.length === 0 ? (
            <div style={{ fontSize: 12, opacity: 0.8 }}>No lesson flow rows in template.</div>
          ) : null}
        </div>
      </div>

      {/* Opening routine: template preview unless override */}
      <div style={styles.previewCard}>
        <div style={styles.previewHeader}>
          <div style={{ fontWeight: 900 }}>Opening Routine</div>
          {!openingOverride ? (
            <button onClick={createOpeningOverride} style={styles.secondaryBtn} disabled={isDemo || status === 'saving'}>
              Create Day Override
            </button>
          ) : (
            <button
              onClick={() => {
                setOpeningTouched(true);
                setShowOpeningEditor((x) => !x);
              }}
              style={styles.secondaryBtn}
              disabled={isDemo}
            >
              {showOpeningEditor ? 'Hide editor' : 'Edit override'}
            </button>
          )}
        </div>

        {!openingOverride ? (
          <ol style={{ margin: 0, paddingLeft: 18 }}>
            {(tplOpeningSteps.length ? tplOpeningSteps : [{ step_text: '—' }]).map((s, i) => (
              <li key={i} style={{ marginBottom: 4, opacity: s.step_text === '—' ? 0.6 : 1 }}>
                {s.step_text}
              </li>
            ))}
          </ol>
        ) : showOpeningEditor ? (
          <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
            {openingSteps.map((s, idx) => (
              <div key={idx} style={styles.row3}>
                <input
                  value={s.step_text}
                  onChange={(e) => setOpeningSteps((prev) => prev.map((x, i) => (i === idx ? { ...x, step_text: e.target.value } : x)))}
                  style={styles.input}
                  disabled={isDemo}
                />
                <button onClick={() => setOpeningSteps((prev) => prev.filter((_, i) => i !== idx))} style={styles.dangerBtn} disabled={isDemo}>
                  Remove
                </button>
              </div>
            ))}
            <button onClick={() => setOpeningSteps((p) => [...p, { step_text: '', source_template_step_id: null }])} style={styles.secondaryBtn} disabled={isDemo}>
              + Add step
            </button>
          </div>
        ) : (
          <div style={{ fontSize: 12, opacity: 0.8 }}>Override exists. Click “Edit override” to change it.</div>
        )}
      </div>

      {/* Division of Roles: template preview unless override */}
      <div style={styles.previewCard}>
        <div style={styles.previewHeader}>
          <div style={{ fontWeight: 900 }}>Division of Roles</div>
          {!rolesOverride ? (
            <button onClick={createRolesOverride} style={styles.secondaryBtn} disabled={isDemo || status === 'saving'}>
              Create Day Override
            </button>
          ) : (
            <button
              onClick={() => {
                setRolesTouched(true);
                setShowRolesEditor((x) => !x);
              }}
              style={styles.secondaryBtn}
              disabled={isDemo}
            >
              {showRolesEditor ? 'Hide editor' : 'Edit override'}
            </button>
          )}
        </div>

        {!rolesOverride ? (
          <div style={{ display: 'grid', gap: 6 }}>
            {(tplRoles.length ? tplRoles : [{ who: '—', responsibility: '' }]).map((r, i) => (
              <div key={i} style={{ opacity: r.who === '—' ? 0.6 : 1 }}>
                <b>{r.who}:</b> {r.responsibility}
              </div>
            ))}
          </div>
        ) : showRolesEditor ? (
          <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
            {roles.map((r, idx) => (
              <div key={idx} style={styles.whatIfRow}>
                <input value={r.who} onChange={(e) => setRoles((prev) => prev.map((x, i) => (i === idx ? { ...x, who: e.target.value } : x)))} style={styles.input} disabled={isDemo} placeholder="Who" />
                <input
                  value={r.responsibility}
                  onChange={(e) => setRoles((prev) => prev.map((x, i) => (i === idx ? { ...x, responsibility: e.target.value } : x)))}
                  style={styles.input}
                  disabled={isDemo}
                  placeholder="Responsibility"
                />
                <button onClick={() => setRoles((prev) => prev.filter((_, i) => i !== idx))} style={styles.dangerBtn} disabled={isDemo}>
                  Remove
                </button>
              </div>
            ))}
            <button onClick={() => setRoles((p) => [...p, { who: '', responsibility: '' }])} style={styles.secondaryBtn} disabled={isDemo}>
              + Add role row
            </button>
          </div>
        ) : (
          <div style={{ fontSize: 12, opacity: 0.8 }}>Override exists. Click “Edit override” to change it.</div>
        )}
      </div>

      {/* What to do if: template preview unless override */}
      <div style={styles.previewCard}>
        <div style={styles.previewHeader}>
          <div style={{ fontWeight: 900 }}>What to do if…</div>
          {!whatIfOverride ? (
            <button onClick={createWhatIfOverride} style={styles.secondaryBtn} disabled={isDemo || status === 'saving'}>
              Create Day Override
            </button>
          ) : (
            <button
              onClick={() => {
                setWhatIfTouched(true);
                setShowWhatIfEditor((x) => !x);
              }}
              style={styles.secondaryBtn}
              disabled={isDemo}
            >
              {showWhatIfEditor ? 'Hide editor' : 'Edit override'}
            </button>
          )}
        </div>

        {!whatIfOverride ? (
          <div style={{ display: 'grid', gap: 6 }}>
            {(tplWhatIf.length ? tplWhatIf : [{ scenario_text: '—', response_text: '' }]).map((w, i) => (
              <div key={i} style={{ fontSize: 13, opacity: w.scenario_text === '—' ? 0.6 : 1 }}>
                <div>
                  <b>If:</b> {w.scenario_text}
                </div>
                {w.response_text ? (
                  <div>
                    <b>Then:</b> {w.response_text}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : showWhatIfEditor ? (
          <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
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
        ) : (
          <div style={{ fontSize: 12, opacity: 0.8 }}>Override exists. Click “Edit override” to change it.</div>
        )}
      </div>

      {/* Activity options: template preview unless override (only relevant if user switches mode) */}
      {planMode === 'activity_options' ? (
        <div style={styles.previewCard}>
          <div style={styles.previewHeader}>
            <div style={{ fontWeight: 900 }}>Activity Options</div>
            {!activityOverride ? (
              <button onClick={createActivityOverride} style={styles.secondaryBtn} disabled={isDemo || status === 'saving'}>
                Create Day Override
              </button>
            ) : (
              <button
              onClick={() => {
                setActivityTouched(true);
                setShowActivityEditor((x) => !x);
              }}
              style={styles.secondaryBtn}
              disabled={isDemo}
            >
              {showActivityEditor ? 'Hide editor' : 'Edit override'}
            </button>
            )}
          </div>

          {!activityOverride ? (
            <div style={{ display: 'grid', gap: 10 }}>
              {(tplActivityOptions.length ? tplActivityOptions : [{ title: '—', description: '', details_text: '', toc_role_text: '', source_template_option_id: null, steps: [] }]).map((o, i) => (
                <div key={i} style={{ borderTop: i ? '1px solid rgba(0,0,0,0.08)' : 'none', paddingTop: i ? 10 : 0, opacity: o.title === '—' ? 0.6 : 1 }}>
                  <div style={{ fontWeight: 900 }}>{o.title}</div>
                  {o.description ? <div style={{ opacity: 0.9 }}>{o.description}</div> : null}
                </div>
              ))}
            </div>
          ) : showActivityEditor ? (
            <div style={{ display: 'grid', gap: 12, marginTop: 10 }}>
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
                    { title: '', description: '', details_text: '', toc_role_text: '', source_template_option_id: null, steps: [] },
                  ])
                }
                style={styles.secondaryBtn}
                disabled={isDemo}
              >
                + Add activity option
              </button>
            </div>
          ) : (
            <div style={{ fontSize: 12, opacity: 0.8 }}>Override exists. Click “Edit override” to change it.</div>
          )}
        </div>
      ) : null}
    </section>
  );
}

const RCS = {
  deepNavy: '#1F4E79',
  midBlue: '#2E75B6',
  lightBlue: '#D6E4F0',
  gold: '#C9A84C',
  white: '#FFFFFF',
  textDark: '#1A1A1A',
} as const;

const styles: Record<string, React.CSSProperties> = {
  wrap: { marginTop: 12, borderTop: `1px solid rgba(0,0,0,0.12)`, paddingTop: 12 },
  topRow: { display: 'flex', gap: 12, justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' },

  templateHint: {
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    border: `1px solid ${RCS.deepNavy}`,
    background: RCS.lightBlue,
    display: 'flex',
    gap: 12,
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  templateLink: {
    padding: '8px 10px',
    borderRadius: 10,
    border: `1px solid ${RCS.gold}`,
    background: RCS.deepNavy,
    color: RCS.white,
    textDecoration: 'none',
    fontWeight: 900,
    whiteSpace: 'nowrap',
  },

  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 },
  field: { display: 'grid', gap: 6 },
  label: { fontWeight: 900, fontSize: 12, color: RCS.midBlue },
  input: { padding: '10px 12px', borderRadius: 10, border: `1px solid ${RCS.deepNavy}`, background: RCS.white, color: RCS.textDark },
  textarea: { padding: '10px 12px', borderRadius: 10, border: `1px solid ${RCS.deepNavy}`, background: RCS.white, color: RCS.textDark, fontFamily: 'inherit' },

  primaryBtn: { padding: '10px 12px', borderRadius: 10, border: `1px solid ${RCS.gold}`, background: RCS.deepNavy, color: RCS.white, cursor: 'pointer', fontWeight: 900 },
  secondaryBtn: { padding: '8px 10px', borderRadius: 10, border: `1px solid ${RCS.gold}`, background: 'transparent', color: RCS.deepNavy, cursor: 'pointer', fontWeight: 900 },
  dangerBtn: { padding: '8px 10px', borderRadius: 10, border: '1px solid #991b1b', background: '#FEE2E2', color: '#7F1D1D', cursor: 'pointer', fontWeight: 900, whiteSpace: 'nowrap' },
  errorBox: { marginTop: 10, padding: 10, borderRadius: 10, background: '#FEE2E2', border: '1px solid #991b1b', color: '#7F1D1D', whiteSpace: 'pre-wrap' },

  section: { marginTop: 14, border: `1px solid ${RCS.deepNavy}`, borderRadius: 12, padding: 12, background: RCS.lightBlue },
  sectionHeader: { fontWeight: 900, color: RCS.deepNavy, borderLeft: `6px solid ${RCS.gold}`, paddingLeft: 10, marginBottom: 10 },
  row3: { display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center' },
  phaseRow: { display: 'grid', gridTemplateColumns: '28px 110px 1fr 1fr 1fr auto', gap: 10, alignItems: 'start', border: `1px solid rgba(31,78,121,0.35)`, borderRadius: 12, padding: 8, background: 'rgba(255,255,255,0.9)' },
  dragHandle: { cursor: 'grab', userSelect: 'none', fontWeight: 900, opacity: 0.75, textAlign: 'center' },

  previewCard: { marginTop: 14, border: `1px solid ${RCS.deepNavy}`, borderRadius: 12, padding: 12, background: RCS.white },
  previewHeader: { display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 },

  touchCard: { border: `1px solid ${RCS.deepNavy}`, borderRadius: 12, padding: 12, background: RCS.white },

  optionCard: { border: `1px solid ${RCS.deepNavy}`, borderRadius: 12, padding: 12, background: RCS.white },
  whatIfRow: { display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 10, alignItems: 'center' },

  snippetBackdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.35)',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: 24,
    zIndex: 50,
  },
  snippetModal: {
    width: '100%',
    maxWidth: 900,
    background: RCS.white,
    borderRadius: 14,
    border: `1px solid ${RCS.deepNavy}`,
    padding: 14,
    boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
  },
  snippetHeader: { display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' },
  snippetRow: { display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', border: `1px solid ${RCS.deepNavy}`, borderRadius: 12, padding: 12, background: RCS.lightBlue },
};
