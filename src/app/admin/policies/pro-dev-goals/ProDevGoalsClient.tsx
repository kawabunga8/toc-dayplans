'use client';

import { useEffect, useMemo, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { useDemo } from '@/app/admin/DemoContext';

type GoalRow = {
  id: string;
  goal_id: string;
  goal_description: string;
  research_focus: string | null;
  action_taken: string | null;
  evidence_date: string | null;
  reflection_notes: string | null;
  sort_order: number | null;
};

type GoalDraft = {
  goal_id: string;
  goal_description: string;
  research_focus: string;
  action_taken: string;
  evidence_date: string;
  reflection_notes: string;
};

type Status = 'loading' | 'idle' | 'error';

const RCS = {
  deepNavy: '#1F4E79',
  midBlue: '#2E75B6',
  lightBlue: '#D6E4F0',
  gold: '#C9A84C',
  paleGold: '#FDF3DC',
  white: '#FFFFFF',
  offWhite: '#F7F9FC',
  textDark: '#1A1A1A',
} as const;

function rowToDraft(r: GoalRow): GoalDraft {
  return {
    goal_id: r.goal_id ?? '',
    goal_description: r.goal_description ?? '',
    research_focus: r.research_focus ?? '',
    action_taken: r.action_taken ?? '',
    evidence_date: r.evidence_date ?? '',
    reflection_notes: r.reflection_notes ?? '',
  };
}

const EMPTY_DRAFT: GoalDraft = {
  goal_id: '',
  goal_description: '',
  research_focus: '',
  action_taken: '',
  evidence_date: '',
  reflection_notes: '',
};

export default function ProDevGoalsClient() {
  const { isDemo } = useDemo();

  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<GoalRow[]>([]);
  const [q, setQ] = useState('');

  // editing state: null = not editing, 'new' = new goal form, or goal id
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<GoalDraft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => { void load(); }, []);

  async function load() {
    setStatus('loading');
    setError(null);
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('professional_development_goals')
        .select('id,goal_id,goal_description,research_focus,action_taken,evidence_date,reflection_notes,sort_order')
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('goal_id', { ascending: true });
      if (error) throw error;
      setRows((data ?? []) as GoalRow[]);
      setStatus('idle');
    } catch (e: any) {
      setStatus('error');
      setError(e?.message ?? 'Failed to load goals');
      setRows([]);
    }
  }

  function startEdit(r: GoalRow) {
    setEditingId(r.id);
    setDraft(rowToDraft(r));
    setSaveError(null);
  }

  function startNew() {
    setEditingId('new');
    setDraft(EMPTY_DRAFT);
    setSaveError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setSaveError(null);
  }

  async function saveGoal() {
    if (isDemo) return;
    setSaving(true);
    setSaveError(null);
    try {
      const supabase = getSupabaseClient();
      const patch = {
        goal_id: draft.goal_id.trim(),
        goal_description: draft.goal_description.trim(),
        research_focus: draft.research_focus.trim() || null,
        action_taken: draft.action_taken.trim() || null,
        evidence_date: draft.evidence_date.trim() || null,
        reflection_notes: draft.reflection_notes.trim() || null,
      };
      if (!patch.goal_id) throw new Error('Goal ID is required');

      if (editingId === 'new') {
        const { error } = await supabase.from('professional_development_goals').insert(patch);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('professional_development_goals').update(patch).eq('id', editingId!);
        if (error) throw error;
      }

      setEditingId(null);
      await load();
    } catch (e: any) {
      setSaveError(e?.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function deleteGoal(id: string) {
    if (isDemo) return;
    if (!window.confirm('Delete this goal?')) return;
    setSaving(true);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.from('professional_development_goals').delete().eq('id', id);
      if (error) throw error;
      setEditingId(null);
      await load();
    } catch (e: any) {
      setSaveError(e?.message ?? 'Failed to delete');
    } finally {
      setSaving(false);
    }
  }

  function setField<K extends keyof GoalDraft>(key: K, val: string) {
    setDraft((p) => ({ ...p, [key]: val }));
  }

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    const hit = (s: string | null) => String(s ?? '').toLowerCase().includes(needle);
    return rows.filter((r) => hit(r.goal_id) || hit(r.goal_description) || hit(r.research_focus) || hit(r.action_taken) || hit(r.evidence_date) || hit(r.reflection_notes));
  }, [rows, q]);

  return (
    <main style={styles.page}>
      <h1 style={styles.h1}>Professional Development Goals</h1>
      <p style={styles.muted}>View and edit your PD goals inline.</p>

      <div style={{ marginTop: -8, marginBottom: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <a href="/admin/policies" style={styles.secondaryBtn}>← Back to Policies</a>
      </div>

      {status === 'error' && error ? <div style={styles.errorBox}>{error}</div> : null}

      <section style={styles.card}>
        <div style={styles.sectionHeader}>Goals</div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 12 }}>
          <label style={{ display: 'grid', gap: 6, minWidth: 260, flex: 1 }}>
            <div style={styles.label}>Search</div>
            <input value={q} onChange={(e) => setQ(e.target.value)} style={styles.input} placeholder="Search goals…" />
          </label>
          <button type="button" style={styles.secondaryBtn} onClick={() => void load()} disabled={status === 'loading'}>Reload</button>
          <button type="button" style={styles.primaryBtn} onClick={startNew} disabled={isDemo || editingId !== null}>+ New goal</button>
        </div>

        <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 10 }}>{filtered.length} goal{filtered.length !== 1 ? 's' : ''}</div>

        {/* New goal form */}
        {editingId === 'new' && (
          <div style={{ ...styles.goalCard, background: '#EFF6FF', border: `2px solid ${RCS.midBlue}`, marginBottom: 12 }}>
            <div style={{ fontWeight: 900, color: RCS.deepNavy, marginBottom: 10 }}>New Goal</div>
            <GoalForm draft={draft} setField={setField} saving={saving} saveError={saveError} onSave={saveGoal} onCancel={cancelEdit} isNew />
          </div>
        )}

        <div style={{ display: 'grid', gap: 10 }}>
          {filtered.map((r) => {
            const isEditing = editingId === r.id;
            return (
              <div key={r.id} style={{ ...styles.goalCard, ...(isEditing ? { border: `2px solid ${RCS.midBlue}`, background: '#EFF6FF' } : {}) }}>
                {isEditing ? (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span style={{ fontWeight: 900, color: RCS.deepNavy }}>Editing: {r.goal_id}</span>
                      <button type="button" onClick={() => deleteGoal(r.id)} style={styles.dangerBtn} disabled={saving}>Delete</button>
                    </div>
                    <GoalForm draft={draft} setField={setField} saving={saving} saveError={saveError} onSave={saveGoal} onCancel={cancelEdit} />
                  </>
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                      <div style={{ fontWeight: 900, color: RCS.deepNavy }}>{r.goal_id}</div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        {r.evidence_date ? <div style={styles.pill}>Evidence: {r.evidence_date}</div> : null}
                        <button
                          type="button"
                          onClick={() => startEdit(r)}
                          disabled={editingId !== null}
                          style={{ ...styles.editBtn, opacity: editingId !== null ? 0.4 : 1 }}
                        >
                          Edit
                        </button>
                      </div>
                    </div>

                    <div style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>{r.goal_description}</div>

                    {(r.research_focus || r.action_taken || r.reflection_notes) ? (
                      <div style={{ marginTop: 10, display: 'grid', gap: 6 }}>
                        {r.research_focus ? (
                          <div>
                            <div style={styles.smallLabel}>Research Focus</div>
                            <div style={{ whiteSpace: 'pre-wrap' }}>{r.research_focus}</div>
                          </div>
                        ) : null}
                        {r.action_taken ? (
                          <div>
                            <div style={styles.smallLabel}>Action Taken</div>
                            <div style={{ whiteSpace: 'pre-wrap' }}>{r.action_taken}</div>
                          </div>
                        ) : null}
                        {r.reflection_notes ? (
                          <div>
                            <div style={styles.smallLabel}>Reflection Notes</div>
                            <div style={{ whiteSpace: 'pre-wrap' }}>{r.reflection_notes}</div>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            );
          })}

          {status !== 'loading' && filtered.length === 0 && editingId !== 'new' ? (
            <div style={{ opacity: 0.7 }}>No goals found.</div>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function GoalForm({
  draft,
  setField,
  saving,
  saveError,
  onSave,
  onCancel,
  isNew,
}: {
  draft: GoalDraft;
  setField: <K extends keyof GoalDraft>(key: K, val: string) => void;
  saving: boolean;
  saveError: string | null;
  onSave: () => void;
  onCancel: () => void;
  isNew?: boolean;
}) {
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 10 }}>
        <label style={formStyles.field}>
          <span style={formStyles.label}>Goal ID</span>
          <input type="text" value={draft.goal_id} onChange={(e) => setField('goal_id', e.target.value)} style={formStyles.input} placeholder="e.g. Goal 1" />
        </label>
        <label style={formStyles.field}>
          <span style={formStyles.label}>Evidence Date (optional)</span>
          <input type="text" value={draft.evidence_date} onChange={(e) => setField('evidence_date', e.target.value)} style={formStyles.input} placeholder="e.g. June 2025" />
        </label>
      </div>

      <label style={formStyles.field}>
        <span style={formStyles.label}>Goal Description</span>
        <textarea rows={3} value={draft.goal_description} onChange={(e) => setField('goal_description', e.target.value)} style={formStyles.textarea} placeholder="Describe the goal…" />
      </label>

      <label style={formStyles.field}>
        <span style={formStyles.label}>Research Focus (optional)</span>
        <textarea rows={2} value={draft.research_focus} onChange={(e) => setField('research_focus', e.target.value)} style={formStyles.textarea} placeholder="What research or reading supports this goal…" />
      </label>

      <label style={formStyles.field}>
        <span style={formStyles.label}>Action Taken (optional)</span>
        <textarea rows={2} value={draft.action_taken} onChange={(e) => setField('action_taken', e.target.value)} style={formStyles.textarea} placeholder="What steps have been taken…" />
      </label>

      <label style={formStyles.field}>
        <span style={formStyles.label}>Reflection Notes (optional)</span>
        <textarea rows={2} value={draft.reflection_notes} onChange={(e) => setField('reflection_notes', e.target.value)} style={formStyles.textarea} placeholder="Reflections on progress…" />
      </label>

      {saveError ? <div style={formStyles.errorBox}>{saveError}</div> : null}

      <div style={{ display: 'flex', gap: 10 }}>
        <button type="button" onClick={onSave} style={formStyles.primaryBtn} disabled={saving}>
          {saving ? 'Saving…' : isNew ? 'Create goal' : 'Save changes'}
        </button>
        <button type="button" onClick={onCancel} style={formStyles.secondaryBtn} disabled={saving}>Cancel</button>
      </div>
    </div>
  );
}

const RCS2 = { deepNavy: '#1F4E79', midBlue: '#2E75B6', gold: '#C9A84C', white: '#FFFFFF', textDark: '#1A1A1A' } as const;

const formStyles: Record<string, React.CSSProperties> = {
  field: { display: 'grid', gap: 4 },
  label: { color: RCS2.midBlue, fontWeight: 900, fontSize: 12 },
  input: { padding: '8px 10px', borderRadius: 8, border: `1px solid ${RCS2.deepNavy}`, background: '#fff', color: RCS2.textDark, fontSize: 14 },
  textarea: { padding: '8px 10px', borderRadius: 8, border: `1px solid ${RCS2.deepNavy}`, background: '#fff', color: RCS2.textDark, fontSize: 13, fontFamily: 'inherit', resize: 'vertical' },
  primaryBtn: { padding: '10px 14px', borderRadius: 10, border: `1px solid ${RCS2.gold}`, background: RCS2.deepNavy, color: '#fff', cursor: 'pointer', fontWeight: 900 },
  secondaryBtn: { padding: '10px 14px', borderRadius: 10, border: `1px solid ${RCS2.gold}`, background: 'transparent', color: RCS2.deepNavy, cursor: 'pointer', fontWeight: 900 },
  errorBox: { padding: 10, borderRadius: 8, border: '1px solid #991b1b', background: '#FEE2E2', color: '#7F1D1D', fontSize: 13 },
};

const styles: Record<string, React.CSSProperties> = {
  page: { padding: 24, maxWidth: 1100, margin: '0 auto', fontFamily: 'system-ui', background: RCS.white, color: RCS.textDark },
  h1: { margin: 0, color: RCS.deepNavy },
  muted: { opacity: 0.85, marginTop: 6, marginBottom: 16 },
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
  label: { color: RCS.deepNavy, fontWeight: 900, fontSize: 12, marginBottom: 6 },
  smallLabel: { color: RCS.deepNavy, fontSize: 11, fontWeight: 900, opacity: 0.85, marginBottom: 2 },
  input: { padding: '10px 12px', borderRadius: 10, border: `1px solid ${RCS.deepNavy}`, background: RCS.white, color: RCS.textDark },
  primaryBtn: { padding: '10px 12px', borderRadius: 10, border: `1px solid ${RCS.gold}`, background: RCS.deepNavy, color: RCS.white, cursor: 'pointer', fontWeight: 900 },
  secondaryBtn: { padding: '10px 12px', borderRadius: 10, border: `1px solid ${RCS.gold}`, background: 'transparent', color: RCS.deepNavy, cursor: 'pointer', fontWeight: 900, textDecoration: 'none', display: 'inline-block' },
  dangerBtn: { padding: '6px 12px', borderRadius: 8, border: '1px solid #991b1b', background: '#FEE2E2', color: '#7F1D1D', cursor: 'pointer', fontWeight: 900, fontSize: 13 },
  editBtn: { padding: '6px 14px', borderRadius: 8, border: `1px solid ${RCS.gold}`, background: RCS.paleGold, color: RCS.deepNavy, cursor: 'pointer', fontWeight: 900, fontSize: 13 },
  goalCard: { border: `1px solid ${RCS.deepNavy}`, borderRadius: 12, padding: 12, background: RCS.lightBlue },
  pill: { padding: '4px 10px', borderRadius: 999, border: `1px solid ${RCS.gold}`, background: RCS.paleGold, color: RCS.deepNavy, fontWeight: 900, fontSize: 12 },
  errorBox: { marginTop: 10, padding: 12, borderRadius: 10, border: '1px solid #991b1b', background: '#FEE2E2', color: '#7F1D1D', whiteSpace: 'pre-wrap' },
};
