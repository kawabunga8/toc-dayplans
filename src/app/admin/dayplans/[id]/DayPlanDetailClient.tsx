'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { buildDayplansListHref, asFridayType, isYyyyMmDd } from '@/lib/appRules/navigation';
import { normalizeBlockLabel } from '@/lib/appRules/specialBlocks';
import { getSupabaseClient } from '@/lib/supabaseClient';
import TocBlockPlanInstanceEditor from './TocBlockPlanInstanceEditor';

type DayPlanRow = {
  id: string;
  plan_date: string; // YYYY-MM-DD
  slot: string; // legacy
  friday_type: 'day1' | 'day2' | null;
  title: string;
  notes: string | null;
  learning_standard_focus: string | null;
  core_competency_focus: string | null;
  visibility: 'private' | 'link';
  share_expires_at: string | null;
  trashed_at: string | null;
};

type ClassRow = { id: string; block_label: string | null; name: string; room: string | null };

type PlanBlockRow = {
  id?: string;
  day_plan_id: string;
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  room: string;
  class_name: string;
  details: string | null;
  class_id: string | null;
};

type BlockTimeDefaultRow = {
  template_key: 'mon_thu' | 'fri';
  slot: string;
  start_time: string; // HH:MM or HH:MM:SS
  end_time: string; // HH:MM or HH:MM:SS
};

type Status = 'loading' | 'idle' | 'publishing' | 'revoking' | 'saving' | 'generating' | 'error';

export default function DayPlanDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const didAutoRef = useRef(false);

  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<DayPlanRow | null>(null);

  const [draftTitle, setDraftTitle] = useState('');
  const [draftNotes, setDraftNotes] = useState('');
  const [draftLearningStandardFocus, setDraftLearningStandardFocus] = useState('');
  const [draftCoreCompetencyFocus, setDraftCoreCompetencyFocus] = useState('');

  const [blocks, setBlocks] = useState<PlanBlockRow[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);

  const publicUrl = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return new URL(`/p/${id}`, window.location.origin).toString();
  }, [id]);

  const backHref = useMemo(() => {
    const d = searchParams.get('date') || plan?.plan_date || '';
    const ft = asFridayType(searchParams.get('friday_type') || (plan?.friday_type ?? ''));
    return buildDayplansListHref({ date: isYyyyMmDd(d) ? d : null, fridayType: ft || null });
  }, [searchParams, plan]);

  const headerTags = useMemo(() => {
    const className = blocks?.[0]?.class_name ?? plan?.title ?? '';
    const upper = String(className).toUpperCase();
    const isFa = upper.includes('BAND') || upper.includes('WORSHIP') || upper.includes('ART');
    return isFa ? ['#FA'] : [];
  }, [blocks, plan]);

  async function load() {
    setStatus('loading');
    setError(null);

    try {
      const supabase = getSupabaseClient();

      // Back-compat: older DBs may not have newly added columns yet.
      // Try selecting the full set; if it fails due to missing columns, retry with legacy select.
      const planPromise = (async () => {
        const full = await supabase
          .from('day_plans')
          .select(
            'id,plan_date,slot,friday_type,title,notes,learning_standard_focus,core_competency_focus,learning_standard_id,tags,visibility,share_expires_at,trashed_at'
          )
          .eq('id', id)
          .single();
        if (!full.error) return full;

        const msg = String((full.error as any)?.message ?? '');
        const code = String((full.error as any)?.code ?? '');
        const isMissingCol = code === '42703' || /column .* does not exist/i.test(msg);
        if (!isMissingCol) return full;

        return supabase
          .from('day_plans')
          .select('id,plan_date,slot,friday_type,title,notes,visibility,share_expires_at,trashed_at')
          .eq('id', id)
          .single();
      })();

      const [{ data: planData, error: planErr }, { data: blockData, error: blockErr }, { data: classData, error: classErr }] =
        await Promise.all([
          planPromise,
          supabase
            .from('day_plan_blocks')
            .select('id,day_plan_id,start_time,end_time,room,class_name,details,class_id')
            .eq('day_plan_id', id)
            .order('start_time', { ascending: true }),
          supabase
            .from('classes')
            .select('id,block_label,name,room,sort_order')
            .order('sort_order', { ascending: true, nullsFirst: false }),
        ]);

      if (planErr) throw planErr;
      if (blockErr) throw blockErr;
      if (classErr) throw classErr;

      const p = planData as DayPlanRow;
      setPlan(p);
      setDraftTitle(p.title ?? '');
      setDraftNotes(p.notes ?? '');
      setDraftLearningStandardFocus((p as any).learning_standard_focus ?? '');
      setDraftCoreCompetencyFocus((p as any).core_competency_focus ?? '');

      setBlocks((blockData ?? []).map((b: any) => ({
        id: b.id,
        day_plan_id: b.day_plan_id,
        start_time: (b.start_time as string).slice(0, 5),
        end_time: (b.end_time as string).slice(0, 5),
        room: b.room,
        class_name: b.class_name,
        details: b.details ?? null,
        class_id: b.class_id ?? null,
      })) as PlanBlockRow[]);

      setClasses((classData ?? []).map((c: any) => ({
        id: c.id,
        block_label: c.block_label ?? null,
        name: c.name,
        room: c.room ?? null,
      })) as ClassRow[]);

      setStatus('idle');
    } catch (e: any) {
      setStatus('error');
      setError(e?.message ?? 'Failed to load dayplan');
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Allow Core Competency picker to return a selected value via query param.
  useEffect(() => {
    const v = (searchParams.get('core_competency_focus') ?? '').trim();
    if (!v) return;
    setDraftCoreCompetencyFocus(v);

    // Clean the URL (remove the param) but keep date/friday_type context.
    const qs = new URLSearchParams(searchParams.toString());
    qs.delete('core_competency_focus');
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    router.replace(`/admin/dayplans/${id}${suffix}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, id]);

  useEffect(() => {
    const auto = searchParams.get('auto') === '1';
    if (!auto) return;
    if (didAutoRef.current) return;
    if (status !== 'idle') return;
    if (!plan) return;
    if (blocks.length !== 0) return; // leave existing blocks alone

    didAutoRef.current = true;

    void (async () => {
      await generateSchedule();
      // Remove the auto flag so refreshes don't re-run it (but keep date context for Back)
      const d = searchParams.get('date');
      const ft = asFridayType(searchParams.get('friday_type'));
      const qs = new URLSearchParams();
      if (isYyyyMmDd(d)) qs.set('date', d);
      if (ft) qs.set('friday_type', ft);
      const suffix = qs.toString() ? `?${qs.toString()}` : '';
      router.replace(`/admin/dayplans/${id}${suffix}`);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, status, plan, blocks.length, id]);

  function requestTocPublishForBlock(dayPlanBlockId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        window.dispatchEvent(
          new CustomEvent(`toc-publish-request:${dayPlanBlockId}`, {
            detail: {
              resolve: () => resolve(),
              reject: (err: any) => reject(err),
            },
          })
        );
      } catch (e) {
        reject(e);
      }
    });
  }

  async function publish() {
    setStatus('publishing');
    setError(null);

    try {
      // Publish should prune legacy TOC overrides (template-first) and save intended day overrides.
      const ids = (blocks ?? []).map((b) => b.id).filter(Boolean) as string[];
      for (const bid of ids) {
        await requestTocPublishForBlock(bid);
      }

      const res = await fetch(`/api/admin/dayplans/${id}/publish`, { method: 'POST' });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error ?? 'Failed to publish');
      await load();
      setStatus('idle');
    } catch (e: any) {
      setStatus('error');
      setError(e?.message ?? 'Failed to publish');
    }
  }

  async function savePlanMeta() {
    if (!plan) return;
    setStatus('saving');
    setError(null);

    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('day_plans')
        .update({
          title: draftTitle.trim(),
          notes: draftNotes.trim() ? draftNotes.trim() : null,
          learning_standard_focus: draftLearningStandardFocus.trim() ? draftLearningStandardFocus.trim() : null,
          core_competency_focus: draftCoreCompetencyFocus.trim() ? draftCoreCompetencyFocus.trim() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', plan.id);
      if (error) throw error;
      await load();
      setStatus('idle');
    } catch (e: any) {
      setStatus('error');
      setError(e?.message ?? 'Failed to save');
    }
  }

  async function generateSchedule() {
    if (!plan) return;

    const ok = blocks.length === 0 || window.confirm('Generate schedule will replace existing blocks for this day plan. Continue?');
    if (!ok) return;

    setStatus('generating');
    setError(null);

    try {
      const supabase = getSupabaseClient();

      const templateKey: 'mon_thu' | 'fri' = isFridayLocal(plan.plan_date) ? 'fri' : 'mon_thu';
      if (templateKey === 'fri' && !plan.friday_type) {
        throw new Error('Friday Type is required for Friday schedules (Day 1 / Day 2).');
      }

      const times = await loadTimeDefaults(supabase, templateKey, plan.plan_date);

      // Use DB-driven rotation order for this date (so schedule follows Admin → Block Rotation).
      // Falls back to legacy hardcoded mapping if rotation is missing.
      let rotationLabels: string[] = [];
      try {
        const { data: rot, error: rotErr } = await supabase.rpc('get_rotation_for_date', {
          plan_date: plan.plan_date,
          friday_type: plan.friday_type,
        });
        if (!rotErr && Array.isArray(rot)) {
          rotationLabels = rot.map((x: any) => String(x).trim()).filter(Boolean);
        }
      } catch {
        rotationLabels = [];
      }

      const slots = templateKey === 'fri' ? ['P1', 'P2', 'Chapel', 'Lunch', 'P5', 'P6'] : ['P1', 'P2', 'Flex', 'Lunch', 'P5', 'P6'];
      const mappingAll = rotationLabels.length === slots.length
        ? slots.map((slot, idx) => ({
            slot,
            block_label: String(rotationLabels[idx] ?? '').trim(),
            fallbackStart: '',
            fallbackEnd: '',
          }))
        : scheduleMapping(plan.plan_date, plan.friday_type);

      const wantedLabel = String(plan.slot ?? '').trim().toUpperCase();
      const mapping = mappingAll.filter((m: any) => String(m.block_label ?? '').trim().toUpperCase() === wantedLabel);
      if (mapping.length === 0) throw new Error(`No schedule mapping found for block “${plan.slot}” on ${plan.plan_date}.`);


      // classes lookup by block_label
      const classByLabel = new Map<string, ClassRow>();
      for (const c of classes) {
        if (c.block_label) classByLabel.set(String(c.block_label).toUpperCase(), c);
      }

      const gen: PlanBlockRow[] = mapping.map((m) => {
        const t = times.find((x) => x.slot === m.slot);
        const start = (t?.start_time ?? m.fallbackStart).slice(0, 5);
        const end = (t?.end_time ?? m.fallbackEnd).slice(0, 5);

        const labelRaw = String(m.block_label ?? '').trim();
        const label = normalizeBlockLabel(labelRaw);

        // Flex/Chapel/CLE/Lunch are seeded into the classes table (see schema.sql) so they can have templates.
        // Prefer a real class match when it exists.
        const c = label ? classByLabel.get(label) : undefined;

        const room = c?.room ?? '—';
        const className = c?.name ?? (labelRaw || '—');

        const details = (m as any).details ?? null;

        return {
          day_plan_id: plan.id,
          start_time: start,
          end_time: end,
          room,
          class_name: className,
          details,
          class_id: c?.id ?? null,
        };
      });

      // Replace existing
      const { error: delErr } = await supabase.from('day_plan_blocks').delete().eq('day_plan_id', plan.id);
      if (delErr) throw delErr;

      const { data: inserted, error: insErr } = await supabase
        .from('day_plan_blocks')
        .insert(gen.map((b) => ({
          day_plan_id: b.day_plan_id,
          start_time: b.start_time,
          end_time: b.end_time,
          room: b.room,
          class_name: b.class_name,
          details: b.details,
          class_id: b.class_id,
        })))
        .select('id,day_plan_id,start_time,end_time,room,class_name,details,class_id');
      if (insErr) throw insErr;

      setBlocks((inserted ?? []).map((b: any) => ({
        id: b.id,
        day_plan_id: b.day_plan_id,
        start_time: (b.start_time as string).slice(0, 5),
        end_time: (b.end_time as string).slice(0, 5),
        room: b.room,
        class_name: b.class_name,
        details: b.details ?? null,
        class_id: b.class_id ?? null,
      })) as PlanBlockRow[]);

      setStatus('idle');
    } catch (e: any) {
      setStatus('error');
      setError(e?.message ?? 'Failed to generate schedule');
    }
  }

  async function saveBlocks() {
    if (!plan) return;
    setStatus('saving');
    setError(null);

    try {
      const supabase = getSupabaseClient();

      // Replace all blocks (simple + predictable)
      const { error: delErr } = await supabase.from('day_plan_blocks').delete().eq('day_plan_id', plan.id);
      if (delErr) throw delErr;

      const classRoomById = new Map<string, string>();
      for (const c of classes) {
        if (c.id && c.room) classRoomById.set(c.id, c.room);
      }

      const payload = blocks.map((b) => ({
        day_plan_id: plan.id,
        start_time: b.start_time,
        end_time: b.end_time,
        // Room is class-owned (template-as-source). Persist the canonical class room.
        room: (b.class_id ? classRoomById.get(b.class_id) : null) ?? b.room ?? '—',
        class_name: b.class_name || '—',
        details: b.details?.trim() ? b.details.trim() : null,
        class_id: b.class_id,
      }));

      const { error: insErr } = await supabase.from('day_plan_blocks').insert(payload);
      if (insErr) throw insErr;

      await load();
      setStatus('idle');
    } catch (e: any) {
      setStatus('error');
      setError(e?.message ?? 'Failed to save blocks');
    }
  }

  async function recalcTimesFromDefaults() {
    if (!plan) return;

    const ok = window.confirm('Recalculate start/end times from Block Rotation + Block Times defaults? This will update the stored times for this plan (but will NOT change class/room/details).');
    if (!ok) return;

    setStatus('saving');
    setError(null);

    try {
      const supabase = getSupabaseClient();

      // Rotation order for this date
      const { data: rot, error: rotErr } = await supabase.rpc('get_rotation_for_date', {
        plan_date: plan.plan_date,
        friday_type: plan.friday_type,
      });
      if (rotErr) throw rotErr;
      const labels: string[] = Array.isArray(rot) ? rot.map((x: any) => String(x).trim()).filter(Boolean) : [];
      if (labels.length === 0) throw new Error('No rotation defaults found for this date.');

      const idx = labels.findIndex((b) => String(b).trim().toUpperCase() === String(plan.slot ?? '').trim().toUpperCase());
      if (idx < 0) throw new Error(`This plan slot (${plan.slot}) was not found in the rotation for ${plan.plan_date}.`);

      const templateKey: 'mon_thu' | 'fri' = isFridayLocal(plan.plan_date) ? 'fri' : 'mon_thu';
      if (templateKey === 'fri' && !plan.friday_type) throw new Error('Friday Type is required.');

      const slots = templateKey === 'fri' ? ['P1', 'P2', 'Chapel', 'Lunch', 'P5', 'P6'] : ['P1', 'P2', 'Flex', 'Lunch', 'P5', 'P6'];
      const slotName = slots[idx];
      if (!slotName) throw new Error('Could not map rotation position to a time slot.');

      const times = await loadTimeDefaults(supabase, templateKey, plan.plan_date);
      const t = times.find((x) => String(x.slot) === String(slotName));
      if (!t) throw new Error(`No block time defaults found for slot ${slotName} on ${plan.plan_date}.`);

      const start = String(t.start_time).slice(0, 5);
      const end = String(t.end_time).slice(0, 5);

      // Update stored times for all blocks in this plan (time-only)
      const { error: updErr } = await supabase
        .from('day_plan_blocks')
        .update({ start_time: start, end_time: end })
        .eq('day_plan_id', plan.id);
      if (updErr) throw updErr;

      await load();
      setStatus('idle');
    } catch (e: any) {
      setStatus('error');
      setError(e?.message ?? 'Failed to recalculate times');
    }
  }

  async function revoke() {
    setStatus('revoking');
    setError(null);

    try {
      const ok = window.confirm('Revoke this public TOC link?');
      if (!ok) {
        setStatus('idle');
        return;
      }

      const res = await fetch(`/api/admin/dayplans/${id}/revoke`, { method: 'POST' });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error ?? 'Failed to revoke');
      await load();
      setStatus('idle');
    } catch (e: any) {
      setStatus('error');
      setError(e?.message ?? 'Failed to revoke');
    }
  }

  async function copyLink() {
    if (!publicUrl) return;
    const { copyToClipboard } = await import('@/lib/appRules/clipboard');
    await copyToClipboard(publicUrl);
  }

  async function trash() {
    setStatus('saving');
    setError(null);

    try {
      const ok = window.confirm('Move this day plan to the trash? (This will also unpublish it.)');
      if (!ok) {
        setStatus('idle');
        return;
      }

      const res = await fetch(`/api/admin/dayplans/${id}/trash`, { method: 'POST' });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error ?? 'Failed to trash');
      await load();
      setStatus('idle');
    } catch (e: any) {
      setStatus('error');
      setError(e?.message ?? 'Failed to trash');
    }
  }

  async function restore() {
    setStatus('saving');
    setError(null);

    try {
      const res = await fetch(`/api/admin/dayplans/${id}/restore`, { method: 'POST' });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error ?? 'Failed to restore');
      await load();
      setStatus('idle');
    } catch (e: any) {
      setStatus('error');
      setError(e?.message ?? 'Failed to restore');
    }
  }

  const [showAllBlocks, setShowAllBlocks] = useState(false);

  const published = plan?.visibility === 'link';
  const trashed = !!plan?.trashed_at;

  const visibleBlocks = useMemo(() => {
    // Dayplans in this app are per-slot/per-course. If legacy data ever has multiple blocks,
    // default to showing the first block only (with an opt-in toggle to show all).
    return showAllBlocks ? blocks : blocks.slice(0, 1);
  }, [blocks, showAllBlocks]);

  return (
    <main style={styles.page}>
      <div style={styles.rowBetween}>
        <div>
          <h1 style={styles.h1}>Dayplan Builder</h1>
          {plan && (
            <div style={styles.meta}>
              {plan.plan_date}
              {isFridayLocal(plan.plan_date) ? ` • Friday ${plan.friday_type ? (plan.friday_type === 'day1' ? 'Day 1' : 'Day 2') : '(type not set)'}` : ''}
              {' • '}
              <b>{plan.title}</b>
              {headerTags.length ? (
                <span style={{ marginLeft: 10, display: 'inline-flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  {headerTags.map((t) => (
                    <span key={t} style={styles.tag}>
                      {t}
                    </span>
                  ))}
                </span>
              ) : null}
            </div>
          )}
        </div>
        <Link href={backHref} style={styles.secondaryLink}>
          ← Back
        </Link>
      </div>

      {!plan && status === 'loading' && <div>Loading…</div>}
      {!plan && status === 'error' && error && <div style={styles.errorBox}>{error}</div>}

      {plan && (
        <>
          <section style={styles.card}>
            <div style={styles.sectionHeader}>Plan info</div>
            <div style={{ display: 'grid', gap: 10 }}>
              {/* Title is derived from the class/block. Hidden to reduce drift. */}

              <label style={{ display: 'grid', gap: 6 }}>
                <span style={styles.label}>Notes (optional)</span>
                <textarea value={draftNotes} onChange={(e) => setDraftNotes(e.target.value)} rows={4} style={styles.textarea} />
              </label>

              <label style={{ display: 'grid', gap: 6 }}>
                <span style={styles.label}>Learning Standard Focus (optional)</span>
                <div style={{ display: 'flex', gap: 10, alignItems: 'stretch', flexWrap: 'wrap' }}>
                  <input
                    value={draftLearningStandardFocus}
                    onChange={(e) => setDraftLearningStandardFocus(e.target.value)}
                    style={{ ...styles.input, flex: 1, minWidth: 260 }}
                    placeholder="(empty)"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const className = blocks?.[0]?.class_name ?? plan?.title ?? '';
                      const upper = String(className).toUpperCase();
                      const isAdst = upper.includes('COMPUTER') || upper.includes('PROGRAM');
                      const isFa = upper.includes('BAND') || upper.includes('WORSHIP') || upper.includes('ART');

                      const m = String(className).match(/\b(9|10|11|12)\b/);
                      const grade = m ? m[1] : '';

                      const subject = isAdst ? 'ADST' : isFa ? 'FA' : '';
                      const qs = new URLSearchParams();
                      if (subject) qs.set('subject', subject);
                      if (grade) qs.set('grade', grade);
                      qs.set('return', `/admin/dayplans/${id}`);
                      window.location.href = `/admin/policies?${qs.toString()}`;
                    }}
                    style={styles.secondaryBtn}
                  >
                    Select…
                  </button>
                </div>
              </label>

              <label style={{ display: 'grid', gap: 6 }}>
                <span style={styles.label}>Core Competency Focus (optional)</span>
                <div style={{ display: 'flex', gap: 10, alignItems: 'stretch', flexWrap: 'wrap' }}>
                  <input
                    value={draftCoreCompetencyFocus}
                    onChange={(e) => setDraftCoreCompetencyFocus(e.target.value)}
                    style={{ ...styles.input, flex: 1, minWidth: 260 }}
                    placeholder="(empty)"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const qs = new URLSearchParams();
                      qs.set('return', `/admin/dayplans/${id}`);
                      window.location.href = `/admin/policies/core-competencies?${qs.toString()}`;
                    }}
                    style={styles.secondaryBtn}
                  >
                    Select…
                  </button>
                </div>
              </label>

              {isFridayLocal(plan.plan_date) && (
                <label style={{ display: 'grid', gap: 6, maxWidth: 260 }}>
                  <span style={styles.label}>Friday Type</span>
                  <select
                    value={plan.friday_type ?? ''}
                    onChange={(e) => setPlan((prev) => (prev ? { ...prev, friday_type: (e.target.value as any) || null } : prev))}
                    style={styles.input}
                  >
                    <option value="">Select…</option>
                    <option value="day1">Day 1</option>
                    <option value="day2">Day 2</option>
                  </select>
                </label>
              )}

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button onClick={savePlanMeta} disabled={status !== 'idle'} style={styles.primaryBtn}>
                  {status === 'saving' ? 'Saving…' : 'Save'}
                </button>
              </div>

              {error && <div style={styles.errorBox}>{error}</div>}
            </div>
          </section>

          <section style={styles.card}>
            <div style={styles.sectionHeader}>Schedule block</div>
            {blocks.length === 0 ? (
              <div style={{ display: 'grid', gap: 10 }}>
                <div style={{ opacity: 0.85 }}>No block yet.</div>
                <div>
                  <button onClick={generateSchedule} disabled={status !== 'idle'} style={styles.secondaryBtn}>
                    {status === 'generating' ? 'Generating…' : 'Generate block'}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {blocks.length > 1 && (
                  <div style={{ ...styles.callout, marginTop: 0 }}>
                    <div style={{ fontWeight: 900, color: RCS.deepNavy, marginBottom: 6 }}>
                      Multiple blocks found
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.9 }}>
                      This builder is intended to show one block (the course you opened). Extra rows may be legacy data.
                    </div>
                    <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
                      <button onClick={() => setShowAllBlocks((v) => !v)} style={styles.secondaryBtn}>
                        {showAllBlocks ? 'Show only this course' : `Show all (${blocks.length})`}
                      </button>
                      <button onClick={generateSchedule} disabled={status !== 'idle'} style={styles.secondaryBtn}>
                        Regenerate (keep only this course)
                      </button>
                    </div>
                  </div>
                )}

                {visibleBlocks.map((b, idx) => (
                  <div key={b.id ?? idx} style={idx % 2 === 0 ? styles.itemEven : styles.itemOdd}>
                    <div style={styles.rowBetweenTight}>
                      <div style={{ fontWeight: 900, color: RCS.deepNavy }}>
                        {b.start_time}–{b.end_time}
                      </div>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ opacity: 0.85, fontSize: 12 }}>ID: {b.id ?? '—'}</span>
                      </div>
                    </div>

                    <div style={{ marginTop: 6, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'baseline' }}>
                      <div style={{ fontWeight: 900, color: RCS.deepNavy }}>{b.class_name}</div>
                      <div style={{ opacity: 0.8, fontSize: 12 }}>Room {b.room}</div>
                    </div>

                    <div style={{ marginTop: 10, display: 'grid', gap: 6 }}>
                      <label style={{ display: 'grid', gap: 6 }}>
                        <span style={styles.label}>Details (optional)</span>
                        <textarea
                          value={b.details ?? ''}
                          onChange={(e) => setBlocks((prev) => prev.map((x, i) => (i === idx ? { ...x, details: e.target.value } : x)))}
                          rows={2}
                          style={styles.textarea}
                        />
                      </label>
                    </div>

                    {b.class_id && b.id && (
                      <TocBlockPlanInstanceEditor dayPlanBlockId={b.id} classId={b.class_id} />
                    )}

                    {b.class_id && !b.id && (
                      <div style={{ marginTop: 10, fontSize: 12, opacity: 0.8 }}>
                        Save blocks to create a TOC plan for this block.
                      </div>
                    )}
                  </div>
                ))}

                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <button onClick={saveBlocks} disabled={status !== 'idle'} style={styles.primaryBtn}>
                    {status === 'saving' ? 'Saving…' : 'Save blocks'}
                  </button>
                  <button onClick={recalcTimesFromDefaults} disabled={status !== 'idle'} style={styles.secondaryBtn}>
                    Fix times from defaults
                  </button>
                </div>
              </div>
            )}
          </section>

          <section style={styles.card}>
            <div style={styles.sectionHeader}>Publishing (TOC link)</div>
            {trashed && (
              <div style={{ ...styles.errorBox, marginTop: 0, marginBottom: 12 }}>
                This plan is in the trash. Restore it to publish again.
              </div>
            )}
            <div style={{ display: 'grid', gap: 8 }}>
              <div>
                <b>Status:</b> {published ? <span>Published</span> : <span>Not published</span>}
              </div>

              {published && publicUrl && (
                <div style={styles.callout}>
                  <div style={{ fontWeight: 900, color: RCS.deepNavy, marginBottom: 6 }}>Public URL</div>
                  <div style={{ wordBreak: 'break-all' }}>{publicUrl}</div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
                    <button onClick={copyLink} style={styles.secondaryBtn}>Copy link</button>
                    <a href={publicUrl} target="_blank" rel="noreferrer" style={styles.primaryLink}>Open</a>
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
              <button onClick={publish} disabled={status !== 'idle' || trashed} style={styles.primaryBtn}>
                {status === 'publishing' ? 'Publishing…' : published ? 'Republish' : 'Publish'}
              </button>
              <button onClick={revoke} disabled={!published || status !== 'idle'} style={styles.dangerBtn}>
                Revoke
              </button>
              {trashed ? (
                <button onClick={restore} disabled={status !== 'idle'} style={styles.secondaryBtn}>
                  Restore
                </button>
              ) : (
                <button onClick={trash} disabled={status !== 'idle'} style={styles.dangerBtn}>
                  Trash
                </button>
              )}
            </div>
          </section>
        </>
      )}
    </main>
  );
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

function isFridayLocal(yyyyMmDd: string): boolean {
  const [y, m, d] = yyyyMmDd.split('-').map((x) => Number(x));
  if (!y || !m || !d) return false;
  const dt = new Date(y, m - 1, d);
  return dt.getDay() === 5;
}

function weekdayLocal(yyyyMmDd: string): number {
  const [y, m, d] = yyyyMmDd.split('-').map((x) => Number(x));
  const dt = new Date(y, m - 1, d);
  return dt.getDay(); // Sun=0..Sat=6
}

function scheduleMapping(planDate: string, friType: DayPlanRow['friday_type']) {
  // Returns ordered slot rows for the schedule generator.
  // Slots correspond to block_time_defaults.slot labels.
  const dow = weekdayLocal(planDate);

  // fallback times (used only if block_time_defaults not set)
  const monThuTimes: Record<string, { start: string; end: string }> = {
    P1: { start: '08:30', end: '09:40' },
    P2: { start: '09:45', end: '10:55' },
    Flex: { start: '11:00', end: '11:50' },
    Lunch: { start: '11:50', end: '12:35' },
    P5: { start: '12:40', end: '13:50' },
    P6: { start: '13:55', end: '15:05' },
  };

  const friTimes: Record<string, { start: string; end: string }> = {
    P1: { start: '09:10', end: '10:10' },
    P2: { start: '10:15', end: '11:15' },
    Chapel: { start: '11:20', end: '12:10' },
    Lunch: { start: '12:10', end: '13:00' },
    P5: { start: '13:00', end: '14:00' },
    P6: { start: '14:05', end: '15:05' },
  };

  if (dow === 5) {
    // Friday: Day 1 vs Day 2
    const day1 = { P1: 'A', P2: 'B', P5: 'C', P6: 'D' };
    const day2 = { P1: 'E', P2: 'F', P5: 'G', P6: 'H' };
    const map = friType === 'day2' ? day2 : day1;

    return [
      { slot: 'P1', block_label: map.P1, fallbackStart: friTimes.P1.start, fallbackEnd: friTimes.P1.end },
      { slot: 'P2', block_label: map.P2, fallbackStart: friTimes.P2.start, fallbackEnd: friTimes.P2.end },
      { slot: 'Chapel', block_label: 'CHAPEL', fallbackStart: friTimes.Chapel.start, fallbackEnd: friTimes.Chapel.end },
      { slot: 'Lunch', block_label: 'LUNCH', fallbackStart: friTimes.Lunch.start, fallbackEnd: friTimes.Lunch.end },
      { slot: 'P5', block_label: map.P5, fallbackStart: friTimes.P5.start, fallbackEnd: friTimes.P5.end },
      { slot: 'P6', block_label: map.P6, fallbackStart: friTimes.P6.start, fallbackEnd: friTimes.P6.end },
    ];
  }

  // Mon–Thu fixed mapping by weekday
  // Mon: A/B/CLE/Lunch/C/D
  // Tue: E/F/Flex/Lunch/G/H
  // Wed: C/D/Flex/Lunch (gym supervision)/A/B
  // Thu: E/F/CLE/Lunch/G/H
  if (dow === 1) {
    return [
      { slot: 'P1', block_label: 'A', fallbackStart: monThuTimes.P1.start, fallbackEnd: monThuTimes.P1.end },
      { slot: 'P2', block_label: 'B', fallbackStart: monThuTimes.P2.start, fallbackEnd: monThuTimes.P2.end },
      { slot: 'Flex', block_label: 'CLE', fallbackStart: monThuTimes.Flex.start, fallbackEnd: monThuTimes.Flex.end },
      { slot: 'Lunch', block_label: 'LUNCH', fallbackStart: monThuTimes.Lunch.start, fallbackEnd: monThuTimes.Lunch.end },
      { slot: 'P5', block_label: 'C', fallbackStart: monThuTimes.P5.start, fallbackEnd: monThuTimes.P5.end },
      { slot: 'P6', block_label: 'D', fallbackStart: monThuTimes.P6.start, fallbackEnd: monThuTimes.P6.end },
    ];
  }

  if (dow === 2) {
    return [
      { slot: 'P1', block_label: 'E', fallbackStart: monThuTimes.P1.start, fallbackEnd: monThuTimes.P1.end },
      { slot: 'P2', block_label: 'F', fallbackStart: monThuTimes.P2.start, fallbackEnd: monThuTimes.P2.end },
      { slot: 'Flex', block_label: 'FLEX', fallbackStart: monThuTimes.Flex.start, fallbackEnd: monThuTimes.Flex.end },
      { slot: 'Lunch', block_label: 'LUNCH', fallbackStart: monThuTimes.Lunch.start, fallbackEnd: monThuTimes.Lunch.end },
      { slot: 'P5', block_label: 'G', fallbackStart: monThuTimes.P5.start, fallbackEnd: monThuTimes.P5.end },
      { slot: 'P6', block_label: 'H', fallbackStart: monThuTimes.P6.start, fallbackEnd: monThuTimes.P6.end },
    ];
  }

  if (dow === 3) {
    return [
      { slot: 'P1', block_label: 'C', fallbackStart: monThuTimes.P1.start, fallbackEnd: monThuTimes.P1.end },
      { slot: 'P2', block_label: 'D', fallbackStart: monThuTimes.P2.start, fallbackEnd: monThuTimes.P2.end },
      { slot: 'Flex', block_label: 'FLEX', fallbackStart: monThuTimes.Flex.start, fallbackEnd: monThuTimes.Flex.end },
      { slot: 'Lunch', block_label: 'LUNCH', details: 'Gym supervision', fallbackStart: monThuTimes.Lunch.start, fallbackEnd: monThuTimes.Lunch.end },
      { slot: 'P5', block_label: 'A', fallbackStart: monThuTimes.P5.start, fallbackEnd: monThuTimes.P5.end },
      { slot: 'P6', block_label: 'B', fallbackStart: monThuTimes.P6.start, fallbackEnd: monThuTimes.P6.end },
    ];
  }

  // Thu (dow=4)
  return [
    { slot: 'P1', block_label: 'E', fallbackStart: monThuTimes.P1.start, fallbackEnd: monThuTimes.P1.end },
    { slot: 'P2', block_label: 'F', fallbackStart: monThuTimes.P2.start, fallbackEnd: monThuTimes.P2.end },
    { slot: 'Flex', block_label: 'CLE', fallbackStart: monThuTimes.Flex.start, fallbackEnd: monThuTimes.Flex.end },
    { slot: 'Lunch', block_label: 'LUNCH', fallbackStart: monThuTimes.Lunch.start, fallbackEnd: monThuTimes.Lunch.end },
    { slot: 'P5', block_label: 'G', fallbackStart: monThuTimes.P5.start, fallbackEnd: monThuTimes.P5.end },
    { slot: 'P6', block_label: 'H', fallbackStart: monThuTimes.P6.start, fallbackEnd: monThuTimes.P6.end },
  ];
}

async function loadTimeDefaults(
  supabase: ReturnType<typeof getSupabaseClient>,
  templateKey: 'mon_thu' | 'fri',
  planDate: string
): Promise<BlockTimeDefaultRow[]> {
  // effective-dated lookup
  const { data, error } = await supabase
    .from('block_time_defaults')
    .select('template_key,slot,start_time,end_time,effective_from,effective_to')
    .eq('template_key', templateKey)
    .lte('effective_from', planDate)
    .or(`effective_to.is.null,effective_to.gt.${planDate}`)
    .order('start_time', { ascending: true });

  if (error) {
    // If table doesn't exist or perms, just fallback to empty and let mapping defaults apply.
    return [];
  }

  return (data ?? []).map((r: any) => ({
    template_key: r.template_key,
    slot: r.slot,
    start_time: String(r.start_time).slice(0, 5),
    end_time: String(r.end_time).slice(0, 5),
  }));
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: 24, maxWidth: 1000, margin: '0 auto', fontFamily: 'system-ui', background: RCS.white, color: RCS.textDark },
  h1: { margin: 0, color: RCS.deepNavy },
  meta: { marginTop: 6, opacity: 0.9 },
  tag: {
    fontSize: 12,
    fontWeight: 900,
    padding: '2px 8px',
    borderRadius: 999,
    border: `1px solid ${RCS.gold}`,
    background: RCS.paleGold,
    color: RCS.deepNavy,
  },
  rowBetween: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' },
  rowBetweenTight: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  label: { color: RCS.midBlue, fontWeight: 800, fontSize: 12 },
  input: { padding: '10px 12px', borderRadius: 10, border: `1px solid ${RCS.deepNavy}`, background: RCS.white, color: RCS.textDark },
  textarea: { padding: '10px 12px', borderRadius: 10, border: `1px solid ${RCS.deepNavy}`, background: RCS.white, color: RCS.textDark, fontFamily: 'inherit' },
  card: { border: `1px solid ${RCS.deepNavy}`, borderRadius: 12, padding: 16, background: RCS.white, marginTop: 14 },
  sectionHeader: {
    background: RCS.deepNavy,
    color: RCS.white,
    padding: '8px 10px',
    borderRadius: 10,
    borderBottom: `3px solid ${RCS.gold}`,
    fontWeight: 900,
    marginBottom: 12,
  },
  itemEven: { border: `1px solid ${RCS.deepNavy}`, borderRadius: 12, padding: 12, background: RCS.white },
  itemOdd: { border: `1px solid ${RCS.deepNavy}`, borderRadius: 12, padding: 12, background: RCS.lightGray },
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
    padding: '10px 12px',
    borderRadius: 10,
    border: `1px solid ${RCS.gold}`,
    background: 'transparent',
    color: RCS.deepNavy,
    cursor: 'pointer',
    fontWeight: 900,
    textDecoration: 'none',
  },
  primaryLink: {
    padding: '10px 12px',
    borderRadius: 10,
    border: `1px solid ${RCS.gold}`,
    background: RCS.deepNavy,
    color: RCS.white,
    fontWeight: 900,
    textDecoration: 'none',
  },
  dangerBtn: {
    padding: '10px 12px',
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
  callout: { marginTop: 12, padding: 12, borderRadius: 12, background: RCS.lightBlue, border: `1px solid ${RCS.deepNavy}` },
  errorBox: { marginTop: 12, padding: 12, borderRadius: 10, background: '#FEE2E2', border: '1px solid #991b1b', color: '#7F1D1D', whiteSpace: 'pre-wrap' },
};
