'use client';

import { useEffect, useMemo, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { useDemo } from '@/app/admin/DemoContext';
import type { TocSnippetRow, TocSnippetPayload } from '@/lib/tocSnippetTypes';

type Status = 'loading' | 'idle' | 'saving' | 'error';

type LessonPhase = { time_text: string; phase_text: string; activity_text: string; purpose_text: string };
type WhatIfItem = { scenario_text: string; response_text: string };
type RoleItem = { who: string; responsibility: string };
type ActivityStep = { step_text: string };
type ActivityOption = { title: string; description: string; details_text: string; toc_role_text: string; steps: ActivityStep[] };

type Draft = {
  id: string | null;
  title: string;
  description: string;
  tags: string;
  opening_steps: string[];
  lesson_flow_phases: LessonPhase[];
  what_if_items: WhatIfItem[];
  roles: RoleItem[];
  activity_options: ActivityOption[];
};

const EMPTY_DRAFT: Draft = {
  id: null,
  title: '',
  description: '',
  tags: '',
  opening_steps: [],
  lesson_flow_phases: [],
  what_if_items: [],
  roles: [],
  activity_options: [],
};

function payloadToDraft(payload: TocSnippetPayload, partial: Partial<Draft> = {}): Partial<Draft> {
  return {
    opening_steps: payload.opening_steps ?? [],
    lesson_flow_phases: (payload.lesson_flow_phases ?? []).map((p) => ({
      time_text: p.time_text ?? '',
      phase_text: p.phase_text ?? '',
      activity_text: p.activity_text ?? '',
      purpose_text: p.purpose_text ?? '',
    })),
    what_if_items: (payload.what_if_items ?? []).map((w) => ({
      scenario_text: w.scenario_text ?? '',
      response_text: w.response_text ?? '',
    })),
    roles: (payload.roles ?? []).map((r) => ({
      who: r.who ?? '',
      responsibility: r.responsibility ?? '',
    })),
    activity_options: (payload.activity_options ?? []).map((o) => ({
      title: o.title ?? '',
      description: o.description ?? '',
      details_text: o.details_text ?? '',
      toc_role_text: o.toc_role_text ?? '',
      steps: (o.steps ?? []).map((s) => ({ step_text: s.step_text ?? '' })),
    })),
    ...partial,
  };
}

function draftToPayload(draft: Draft): TocSnippetPayload {
  return {
    opening_steps: draft.opening_steps.filter((s) => s.trim()),
    lesson_flow_phases: draft.lesson_flow_phases
      .filter((p) => p.phase_text.trim() || p.activity_text.trim())
      .map((p) => ({ time_text: p.time_text, phase_text: p.phase_text, activity_text: p.activity_text, purpose_text: p.purpose_text || null })),
    what_if_items: draft.what_if_items.filter((w) => w.scenario_text.trim()),
    roles: draft.roles.filter((r) => r.who.trim()),
    activity_options: draft.activity_options
      .filter((o) => o.title.trim())
      .map((o) => ({
        title: o.title,
        description: o.description,
        details_text: o.details_text,
        toc_role_text: o.toc_role_text || null,
        steps: o.steps.filter((s) => s.step_text.trim()),
      })),
  };
}

export default function TocSnippetsClient() {
  const { isDemo } = useDemo();
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const [snippets, setSnippets] = useState<TocSnippetRow[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const selected = useMemo(() => snippets.find((s) => s.id === selectedId) ?? null, [snippets, selectedId]);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);

  useEffect(() => { void load(); }, []);

  useEffect(() => {
    if (!selected) return;
    setDraft({
      ...EMPTY_DRAFT,
      id: selected.id,
      title: selected.title ?? '',
      description: selected.description ?? '',
      tags: (selected.tags ?? []).join(', '),
      ...payloadToDraft(selected.payload ?? {}),
    } as Draft);
  }, [selectedId]);

  async function load() {
    setStatus('loading');
    setError(null);
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('toc_snippets')
        .select('id,title,description,tags,payload,updated_at')
        .order('title', { ascending: true });
      if (error) throw error;
      const rows = (data ?? []) as any[];
      setSnippets(rows as any);
      setSelectedId((prev) => prev || (rows[0]?.id ?? ''));
      setStatus('idle');
    } catch (e: any) {
      setStatus('error');
      setError(String(e?.message ?? e));
    }
  }

  function newSnippet() {
    setSelectedId('');
    setDraft(EMPTY_DRAFT);
    setError(null);
    setStatus('idle');
  }

  function parseTags(csv: string): string[] {
    return String(csv).split(',').map((t) => t.trim()).filter(Boolean);
  }

  async function save() {
    if (isDemo) return;
    setStatus('saving');
    setError(null);
    try {
      const title = draft.title.trim();
      if (!title) throw new Error('Title is required');
      const payload = draftToPayload(draft);
      const patch: any = {
        title,
        description: draft.description.trim() || null,
        tags: parseTags(draft.tags),
        payload,
        updated_at: new Date().toISOString(),
      };
      const supabase = getSupabaseClient();
      if (draft.id) {
        let { error } = await supabase.from('toc_snippets').update(patch).eq('id', draft.id);
        const msg = String((error as any)?.message ?? '');
        const code = String((error as any)?.code ?? '');
        if (error && (code === '42703' || /column .* does not exist/i.test(msg))) {
          delete patch.updated_at;
          const retry = await supabase.from('toc_snippets').update(patch).eq('id', draft.id);
          error = retry.error;
        }
        if (error) throw error;
      } else {
        let { data, error } = await supabase.from('toc_snippets').insert(patch).select('id').single();
        const msg = String((error as any)?.message ?? '');
        const code = String((error as any)?.code ?? '');
        if (error && (code === '42703' || /column .* does not exist/i.test(msg))) {
          delete patch.updated_at;
          const retry = await supabase.from('toc_snippets').insert(patch).select('id').single();
          data = retry.data;
          error = retry.error;
        }
        if (error) throw error;
        if (data?.id) setSelectedId(String(data.id));
      }
      await load();
      setStatus('idle');
    } catch (e: any) {
      setStatus('error');
      setError(String(e?.message ?? e));
    }
  }

  async function del() {
    if (!draft.id || isDemo) return;
    if (!window.confirm('Delete this snippet?')) return;
    setStatus('saving');
    setError(null);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.from('toc_snippets').delete().eq('id', draft.id);
      if (error) throw error;
      await load();
      setSelectedId('');
      newSnippet();
      setStatus('idle');
    } catch (e: any) {
      setStatus('error');
      setError(String(e?.message ?? e));
    }
  }

  // ── helpers ──────────────────────────────────────────────────────────────

  function set<K extends keyof Draft>(key: K, val: Draft[K]) {
    setDraft((p) => ({ ...p, [key]: val }));
  }

  // opening_steps
  function addOpeningStep() { set('opening_steps', [...draft.opening_steps, '']); }
  function updateOpeningStep(i: number, v: string) {
    const next = [...draft.opening_steps]; next[i] = v; set('opening_steps', next);
  }
  function removeOpeningStep(i: number) { set('opening_steps', draft.opening_steps.filter((_, j) => j !== i)); }

  // lesson_flow_phases
  function addPhase() { set('lesson_flow_phases', [...draft.lesson_flow_phases, { time_text: '', phase_text: '', activity_text: '', purpose_text: '' }]); }
  function updatePhase<K extends keyof LessonPhase>(i: number, key: K, v: string) {
    const next = draft.lesson_flow_phases.map((p, j) => j === i ? { ...p, [key]: v } : p);
    set('lesson_flow_phases', next);
  }
  function removePhase(i: number) { set('lesson_flow_phases', draft.lesson_flow_phases.filter((_, j) => j !== i)); }

  // what_if_items
  function addWhatIf() { set('what_if_items', [...draft.what_if_items, { scenario_text: '', response_text: '' }]); }
  function updateWhatIf<K extends keyof WhatIfItem>(i: number, key: K, v: string) {
    const next = draft.what_if_items.map((w, j) => j === i ? { ...w, [key]: v } : w);
    set('what_if_items', next);
  }
  function removeWhatIf(i: number) { set('what_if_items', draft.what_if_items.filter((_, j) => j !== i)); }

  // roles
  function addRole() { set('roles', [...draft.roles, { who: '', responsibility: '' }]); }
  function updateRole<K extends keyof RoleItem>(i: number, key: K, v: string) {
    const next = draft.roles.map((r, j) => j === i ? { ...r, [key]: v } : r);
    set('roles', next);
  }
  function removeRole(i: number) { set('roles', draft.roles.filter((_, j) => j !== i)); }

  // activity_options
  function addActivity() {
    set('activity_options', [...draft.activity_options, { title: '', description: '', details_text: '', toc_role_text: '', steps: [] }]);
  }
  function updateActivity<K extends keyof Omit<ActivityOption, 'steps'>>(i: number, key: K, v: string) {
    const next = draft.activity_options.map((o, j) => j === i ? { ...o, [key]: v } : o);
    set('activity_options', next);
  }
  function removeActivity(i: number) { set('activity_options', draft.activity_options.filter((_, j) => j !== i)); }
  function addActivityStep(ai: number) {
    const next = draft.activity_options.map((o, j) => j === ai ? { ...o, steps: [...o.steps, { step_text: '' }] } : o);
    set('activity_options', next);
  }
  function updateActivityStep(ai: number, si: number, v: string) {
    const next = draft.activity_options.map((o, j) => j !== ai ? o : { ...o, steps: o.steps.map((s, k) => k === si ? { step_text: v } : s) });
    set('activity_options', next);
  }
  function removeActivityStep(ai: number, si: number) {
    const next = draft.activity_options.map((o, j) => j !== ai ? o : { ...o, steps: o.steps.filter((_, k) => k !== si) });
    set('activity_options', next);
  }

  // ── render ────────────────────────────────────────────────────────────────

  const sections: Array<{ key: string; label: string; count: number; content: React.ReactNode }> = [
    {
      key: 'opening_steps',
      label: 'Opening Steps',
      count: draft.opening_steps.length,
      content: (
        <div style={{ display: 'grid', gap: 6 }}>
          {draft.opening_steps.map((s, i) => (
            <div key={i} style={styles.rowInline}>
              <span style={styles.rowNum}>{i + 1}</span>
              <input
                type="text"
                value={s}
                onChange={(e) => updateOpeningStep(i, e.target.value)}
                style={{ ...styles.input, flex: 1 }}
                placeholder="Step description"
              />
              <button type="button" onClick={() => removeOpeningStep(i)} style={styles.removeBtn}>✕</button>
            </div>
          ))}
          <button type="button" onClick={addOpeningStep} style={styles.addBtn}>+ Add step</button>
        </div>
      ),
    },
    {
      key: 'lesson_flow_phases',
      label: 'Lesson Flow Phases',
      count: draft.lesson_flow_phases.length,
      content: (
        <div style={{ display: 'grid', gap: 10 }}>
          {draft.lesson_flow_phases.map((p, i) => (
            <div key={i} style={styles.itemCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={styles.itemNum}>Phase {i + 1}</span>
                <button type="button" onClick={() => removePhase(i)} style={styles.removeBtn}>✕ Remove</button>
              </div>
              <div style={styles.fieldGrid2}>
                <label style={styles.field}>
                  <span style={styles.label}>Time</span>
                  <input type="text" value={p.time_text} onChange={(e) => updatePhase(i, 'time_text', e.target.value)} style={styles.input} placeholder="15–20 min" />
                </label>
                <label style={styles.field}>
                  <span style={styles.label}>Phase</span>
                  <input type="text" value={p.phase_text} onChange={(e) => updatePhase(i, 'phase_text', e.target.value)} style={styles.input} placeholder="Warm-up" />
                </label>
              </div>
              <label style={{ ...styles.field, marginTop: 6 }}>
                <span style={styles.label}>Activity</span>
                <textarea rows={2} value={p.activity_text} onChange={(e) => updatePhase(i, 'activity_text', e.target.value)} style={styles.textarea} placeholder="What students do…" />
              </label>
              <label style={{ ...styles.field, marginTop: 6 }}>
                <span style={styles.label}>Purpose (optional)</span>
                <input type="text" value={p.purpose_text} onChange={(e) => updatePhase(i, 'purpose_text', e.target.value)} style={styles.input} placeholder="Why this phase matters…" />
              </label>
            </div>
          ))}
          <button type="button" onClick={addPhase} style={styles.addBtn}>+ Add phase</button>
        </div>
      ),
    },
    {
      key: 'what_if_items',
      label: 'What to Do If…',
      count: draft.what_if_items.length,
      content: (
        <div style={{ display: 'grid', gap: 10 }}>
          {draft.what_if_items.map((w, i) => (
            <div key={i} style={styles.itemCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={styles.itemNum}>Scenario {i + 1}</span>
                <button type="button" onClick={() => removeWhatIf(i)} style={styles.removeBtn}>✕ Remove</button>
              </div>
              <div style={styles.fieldGrid2}>
                <label style={styles.field}>
                  <span style={styles.label}>If…</span>
                  <input type="text" value={w.scenario_text} onChange={(e) => updateWhatIf(i, 'scenario_text', e.target.value)} style={styles.input} placeholder="A student misbehaves" />
                </label>
                <label style={styles.field}>
                  <span style={styles.label}>Then…</span>
                  <input type="text" value={w.response_text} onChange={(e) => updateWhatIf(i, 'response_text', e.target.value)} style={styles.input} placeholder="Send them to the office" />
                </label>
              </div>
            </div>
          ))}
          <button type="button" onClick={addWhatIf} style={styles.addBtn}>+ Add scenario</button>
        </div>
      ),
    },
    {
      key: 'roles',
      label: 'Division of Roles',
      count: draft.roles.length,
      content: (
        <div style={{ display: 'grid', gap: 6 }}>
          {draft.roles.map((r, i) => (
            <div key={i} style={styles.rowInline}>
              <input type="text" value={r.who} onChange={(e) => updateRole(i, 'who', e.target.value)} style={{ ...styles.input, width: 140 }} placeholder="Who" />
              <input type="text" value={r.responsibility} onChange={(e) => updateRole(i, 'responsibility', e.target.value)} style={{ ...styles.input, flex: 1 }} placeholder="Responsibility" />
              <button type="button" onClick={() => removeRole(i)} style={styles.removeBtn}>✕</button>
            </div>
          ))}
          <button type="button" onClick={addRole} style={styles.addBtn}>+ Add role</button>
        </div>
      ),
    },
    {
      key: 'activity_options',
      label: 'Activity Options',
      count: draft.activity_options.length,
      content: (
        <div style={{ display: 'grid', gap: 12 }}>
          {draft.activity_options.map((o, ai) => (
            <div key={ai} style={styles.itemCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={styles.itemNum}>Option {ai + 1}</span>
                <button type="button" onClick={() => removeActivity(ai)} style={styles.removeBtn}>✕ Remove</button>
              </div>
              <div style={styles.fieldGrid2}>
                <label style={styles.field}>
                  <span style={styles.label}>Title</span>
                  <input type="text" value={o.title} onChange={(e) => updateActivity(ai, 'title', e.target.value)} style={styles.input} placeholder="Option name" />
                </label>
                <label style={styles.field}>
                  <span style={styles.label}>TOC Role (optional)</span>
                  <input type="text" value={o.toc_role_text} onChange={(e) => updateActivity(ai, 'toc_role_text', e.target.value)} style={styles.input} placeholder="What the TOC does" />
                </label>
              </div>
              <label style={{ ...styles.field, marginTop: 6 }}>
                <span style={styles.label}>Description</span>
                <input type="text" value={o.description} onChange={(e) => updateActivity(ai, 'description', e.target.value)} style={styles.input} placeholder="One-line summary" />
              </label>
              <label style={{ ...styles.field, marginTop: 6 }}>
                <span style={styles.label}>Details</span>
                <textarea rows={2} value={o.details_text} onChange={(e) => updateActivity(ai, 'details_text', e.target.value)} style={styles.textarea} placeholder="Full instructions…" />
              </label>
              {/* Steps */}
              <div style={{ marginTop: 8 }}>
                <div style={{ ...styles.label, marginBottom: 4 }}>Steps</div>
                <div style={{ display: 'grid', gap: 4 }}>
                  {o.steps.map((s, si) => (
                    <div key={si} style={styles.rowInline}>
                      <span style={styles.rowNum}>{si + 1}</span>
                      <input type="text" value={s.step_text} onChange={(e) => updateActivityStep(ai, si, e.target.value)} style={{ ...styles.input, flex: 1 }} placeholder="Step…" />
                      <button type="button" onClick={() => removeActivityStep(ai, si)} style={styles.removeBtn}>✕</button>
                    </div>
                  ))}
                  <button type="button" onClick={() => addActivityStep(ai)} style={{ ...styles.addBtn, fontSize: 11 }}>+ Add step</button>
                </div>
              </div>
            </div>
          ))}
          <button type="button" onClick={addActivity} style={styles.addBtn}>+ Add option</button>
        </div>
      ),
    },
  ];

  return (
    <main style={styles.page}>
      <h1 style={styles.h1}>TOC Snippets</h1>
      <p style={styles.muted}>Edit the Snippet Library used by "Insert from Library…" in the TOC Plan editor.</p>

      <div style={{ marginTop: -8, marginBottom: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <a href="/admin/policies" style={styles.secondaryBtn}>← To Learning Standards</a>
        <a href="/admin/policies/core-competencies" style={styles.secondaryBtn}>Core Competencies</a>
      </div>

      {status === 'error' && error ? <div style={styles.errorBox}>{error}</div> : null}

      <div style={styles.grid}>
        {/* ── Library panel ── */}
        <section style={styles.card}>
          <div style={styles.sectionHeader}>Library</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <button type="button" onClick={load} style={styles.secondaryBtn} disabled={status === 'loading'}>Refresh</button>
            <button type="button" onClick={newSnippet} style={styles.primaryBtn} disabled={isDemo || status === 'saving'}>+ New snippet</button>
          </div>
          <div style={{ marginTop: 12 }}>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              style={{ ...styles.input, width: '100%' }}
              disabled={status === 'loading'}
            >
              <option value="">(New / unsaved)</option>
              {snippets.map((s) => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
            </select>
          </div>
          {selected ? (
            <div style={{ marginTop: 12, fontSize: 12, opacity: 0.85 }}>
              Tags: {(selected.tags ?? []).map((t) => `#${t}`).join(' ') || '—'}
            </div>
          ) : null}
        </section>

        {/* ── Edit panel ── */}
        <section style={styles.card}>
          <div style={styles.sectionHeader}>Edit</div>

          <div style={{ display: 'grid', gap: 10 }}>
            <label style={styles.field}>
              <span style={styles.label}>Title</span>
              <input type="text" value={draft.title} onChange={(e) => set('title', e.target.value)} style={styles.input} />
            </label>
            <label style={styles.field}>
              <span style={styles.label}>Description</span>
              <input type="text" value={draft.description} onChange={(e) => set('description', e.target.value)} style={styles.input} placeholder="(optional)" />
            </label>
            <label style={styles.field}>
              <span style={styles.label}>Tags (comma-separated)</span>
              <input type="text" value={draft.tags} onChange={(e) => set('tags', e.target.value)} style={styles.input} placeholder="ADST, band, Bible, workflow" />
            </label>
          </div>

          {/* Payload sections */}
          <div style={{ marginTop: 16, display: 'grid', gap: 12 }}>
            {sections.map((sec) => (
              <details key={sec.key} style={styles.details} open={sec.count > 0}>
                <summary style={styles.summary}>
                  <span>{sec.label}</span>
                  {sec.count > 0 ? <span style={styles.badge}>{sec.count}</span> : null}
                </summary>
                <div style={{ padding: '10px 0 4px' }}>
                  {sec.content}
                </div>
              </details>
            ))}
          </div>

          <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button type="button" onClick={save} style={styles.primaryBtn} disabled={isDemo || status === 'saving'}>
              {status === 'saving' ? 'Saving…' : draft.id ? 'Save changes' : 'Create snippet'}
            </button>
            <button type="button" onClick={del} style={styles.dangerBtn} disabled={isDemo || status === 'saving' || !draft.id}>
              Delete
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

const RCS = {
  deepNavy: '#1F4E79',
  midBlue: '#2E75B6',
  lightBlue: '#D6E4F0',
  gold: '#C9A84C',
  white: '#FFFFFF',
  offWhite: '#F7F9FC',
  textDark: '#1A1A1A',
} as const;

const styles: Record<string, React.CSSProperties> = {
  page: { padding: 24, maxWidth: 1200, margin: '0 auto', fontFamily: 'system-ui', background: RCS.white, color: RCS.textDark },
  h1: { margin: 0, color: RCS.deepNavy },
  muted: { opacity: 0.85, marginTop: 6, marginBottom: 16 },
  grid: { display: 'grid', gridTemplateColumns: '340px 1fr', gap: 14, alignItems: 'start' },
  card: { border: `1px solid ${RCS.deepNavy}`, borderRadius: 12, padding: 16, background: RCS.white },
  sectionHeader: {
    background: RCS.deepNavy,
    color: RCS.white,
    padding: '8px 10px',
    borderRadius: 10,
    borderBottom: `3px solid ${RCS.gold}`,
    fontWeight: 900,
    marginBottom: 12,
  },
  label: { color: RCS.midBlue, fontWeight: 900, fontSize: 12 },
  field: { display: 'grid', gap: 4 },
  fieldGrid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  input: { padding: '8px 10px', borderRadius: 8, border: `1px solid ${RCS.deepNavy}`, background: RCS.white, color: RCS.textDark, fontSize: 14 },
  textarea: { padding: '8px 10px', borderRadius: 8, border: `1px solid ${RCS.deepNavy}`, background: RCS.white, color: RCS.textDark, fontFamily: 'inherit', fontSize: 13, resize: 'vertical' },
  primaryBtn: { padding: '10px 12px', borderRadius: 10, border: `1px solid ${RCS.gold}`, background: RCS.deepNavy, color: RCS.white, cursor: 'pointer', fontWeight: 900 },
  secondaryBtn: { padding: '10px 12px', borderRadius: 10, border: `1px solid ${RCS.gold}`, background: 'transparent', color: RCS.deepNavy, cursor: 'pointer', fontWeight: 900, textDecoration: 'none', display: 'inline-block' },
  dangerBtn: { padding: '10px 12px', borderRadius: 10, border: '1px solid #991b1b', background: '#FEE2E2', color: '#7F1D1D', cursor: 'pointer', fontWeight: 900 },
  errorBox: { marginBottom: 12, padding: 12, borderRadius: 10, border: '1px solid #991b1b', background: '#FEE2E2', color: '#7F1D1D', whiteSpace: 'pre-wrap' },
  addBtn: { padding: '6px 12px', borderRadius: 8, border: `1px dashed ${RCS.midBlue}`, background: RCS.offWhite, color: RCS.midBlue, cursor: 'pointer', fontWeight: 700, fontSize: 13 },
  removeBtn: { padding: '4px 8px', borderRadius: 6, border: '1px solid #ccc', background: '#fff', color: '#991b1b', cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap' },
  rowInline: { display: 'flex', gap: 6, alignItems: 'center' },
  rowNum: { minWidth: 20, textAlign: 'center', fontWeight: 900, fontSize: 12, color: RCS.midBlue },
  itemCard: { border: `1px solid #ddd`, borderRadius: 8, padding: 12, background: RCS.offWhite },
  itemNum: { fontWeight: 900, fontSize: 13, color: RCS.deepNavy },
  details: { border: `1px solid #ddd`, borderRadius: 8, padding: '0 12px' },
  summary: { padding: '10px 0', cursor: 'pointer', fontWeight: 900, fontSize: 14, color: RCS.deepNavy, display: 'flex', alignItems: 'center', gap: 8, userSelect: 'none' },
  badge: { background: RCS.midBlue, color: '#fff', borderRadius: 12, padding: '1px 8px', fontSize: 11, fontWeight: 700 },
};
