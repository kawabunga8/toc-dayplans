'use client';

import { useEffect, useMemo, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { useDemo } from '@/app/admin/DemoContext';
import type { TocSnippetRow, TocSnippetPayload } from '@/lib/tocSnippetTypes';

type Status = 'loading' | 'idle' | 'saving' | 'error';

type Draft = {
  id: string | null;
  title: string;
  description: string;
  tags: string; // comma-separated
  payloadText: string;
};

const EMPTY_PAYLOAD: TocSnippetPayload = {
  opening_steps: [],
  lesson_flow_phases: [],
  what_if_items: [],
  roles: [],
  activity_options: [],
};

export default function TocSnippetsClient() {
  const { isDemo } = useDemo();
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);

  const [snippets, setSnippets] = useState<TocSnippetRow[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');

  const selected = useMemo(() => snippets.find((s) => s.id === selectedId) ?? null, [snippets, selectedId]);

  const [draft, setDraft] = useState<Draft>({
    id: null,
    title: '',
    description: '',
    tags: '',
    payloadText: JSON.stringify(EMPTY_PAYLOAD, null, 2),
  });

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!selected) return;
    setDraft({
      id: selected.id,
      title: selected.title ?? '',
      description: selected.description ?? '',
      tags: (selected.tags ?? []).join(', '),
      payloadText: JSON.stringify(selected.payload ?? {}, null, 2),
    });
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
    setDraft({
      id: null,
      title: '',
      description: '',
      tags: '',
      payloadText: JSON.stringify(EMPTY_PAYLOAD, null, 2),
    });
    setError(null);
    setStatus('idle');
  }

  function parseTags(csv: string): string[] {
    return String(csv)
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
  }

  async function save() {
    if (isDemo) return;
    setStatus('saving');
    setError(null);

    try {
      const title = draft.title.trim();
      if (!title) throw new Error('Title is required');

      let payload: any;
      try {
        payload = JSON.parse(draft.payloadText || '{}');
      } catch {
        throw new Error('Payload must be valid JSON');
      }

      const patch: any = {
        title,
        description: draft.description.trim() ? draft.description.trim() : null,
        tags: parseTags(draft.tags),
        payload,
        updated_at: new Date().toISOString(),
      };

      const supabase = getSupabaseClient();
      if (draft.id) {
        let { error } = await supabase.from('toc_snippets').update(patch).eq('id', draft.id);

        // Back-compat if schema doesn't have updated_at
        const msg = String((error as any)?.message ?? '');
        const code = String((error as any)?.code ?? '');
        const isMissingCol = code === '42703' || /column .* does not exist/i.test(msg) || /Could not find the '.*' column/i.test(msg);
        if (error && isMissingCol) {
          delete patch.updated_at;
          const retry = await supabase.from('toc_snippets').update(patch).eq('id', draft.id);
          error = retry.error;
        }

        if (error) throw error;
      } else {
        let { data, error } = await supabase.from('toc_snippets').insert(patch).select('id').single();
        const msg = String((error as any)?.message ?? '');
        const code = String((error as any)?.code ?? '');
        const isMissingCol = code === '42703' || /column .* does not exist/i.test(msg) || /Could not find the '.*' column/i.test(msg);
        if (error && isMissingCol) {
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
    if (!draft.id) return;
    if (isDemo) return;
    const ok = window.confirm('Delete this snippet?');
    if (!ok) return;

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

  return (
    <main style={styles.page}>
      <h1 style={styles.h1}>TOC Snippets</h1>
      <p style={styles.muted}>Edit the Snippet Library used by “Insert from Library…” in the TOC Plan editor.</p>

      <div style={{ marginTop: -8, marginBottom: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <a href="/admin/policies" style={styles.secondaryBtn}>
          ← To Learning Standards
        </a>
        <a href="/admin/policies/core-competencies" style={styles.secondaryBtn}>
          Core Competencies
        </a>
      </div>

      {status === 'error' && error ? <div style={styles.errorBox}>{error}</div> : null}

      <div style={styles.grid}>
        <section style={styles.card}>
          <div style={styles.sectionHeader}>Library</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <button onClick={load} style={styles.secondaryBtn} disabled={status === 'loading'}>
              Refresh
            </button>
            <button onClick={newSnippet} style={styles.primaryBtn} disabled={isDemo || status === 'saving'}>
              + New snippet
            </button>
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
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </div>

          {selected ? (
            <div style={{ marginTop: 12, fontSize: 12, opacity: 0.85 }}>
              Tags: {(selected.tags ?? []).map((t) => `#${t}`).join(' ') || '—'}
            </div>
          ) : null}
        </section>

        <section style={styles.card}>
          <div style={styles.sectionHeader}>Edit</div>

          <div style={{ display: 'grid', gap: 10 }}>
            <label style={styles.field}>
              <span style={styles.label}>Title</span>
              <input value={draft.title} onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))} style={styles.input} />
            </label>

            <label style={styles.field}>
              <span style={styles.label}>Description</span>
              <input
                value={draft.description}
                onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))}
                style={styles.input}
                placeholder="(optional)"
              />
            </label>

            <label style={styles.field}>
              <span style={styles.label}>Tags (comma-separated)</span>
              <input
                value={draft.tags}
                onChange={(e) => setDraft((p) => ({ ...p, tags: e.target.value }))}
                style={styles.input}
                placeholder="ADST, band, Bible, workflow"
              />
            </label>

            <label style={styles.field}>
              <span style={styles.label}>Payload (JSON)</span>
              <textarea
                value={draft.payloadText}
                onChange={(e) => setDraft((p) => ({ ...p, payloadText: e.target.value }))}
                rows={16}
                style={styles.textarea}
              />
            </label>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button onClick={save} style={styles.primaryBtn} disabled={isDemo || status === 'saving'}>
                {status === 'saving' ? 'Saving…' : draft.id ? 'Save changes' : 'Create snippet'}
              </button>
              <button onClick={del} style={styles.dangerBtn} disabled={isDemo || status === 'saving' || !draft.id}>
                Delete
              </button>
            </div>

            <div style={{ fontSize: 12, opacity: 0.85 }}>
              Supported keys: <code>opening_steps</code>, <code>lesson_flow_phases</code>, <code>what_if_items</code>, <code>roles</code>, <code>activity_options</code>.
            </div>
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
  paleGold: '#FDF3DC',
  white: '#FFFFFF',
  textDark: '#1A1A1A',
} as const;

const styles: Record<string, React.CSSProperties> = {
  page: { padding: 24, maxWidth: 1200, margin: '0 auto', fontFamily: 'system-ui', background: RCS.white, color: RCS.textDark },
  h1: { margin: 0, color: RCS.deepNavy },
  muted: { opacity: 0.85, marginTop: 6, marginBottom: 16 },
  grid: { display: 'grid', gridTemplateColumns: '380px 1fr', gap: 14, alignItems: 'start' },
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
  field: { display: 'grid', gap: 6 },
  input: { padding: '10px 12px', borderRadius: 10, border: `1px solid ${RCS.deepNavy}`, background: RCS.white, color: RCS.textDark, fontSize: 16 },
  textarea: { padding: '10px 12px', borderRadius: 10, border: `1px solid ${RCS.deepNavy}`, background: RCS.white, color: RCS.textDark, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace', fontSize: 13 },
  primaryBtn: { padding: '10px 12px', borderRadius: 10, border: `1px solid ${RCS.gold}`, background: RCS.deepNavy, color: RCS.white, cursor: 'pointer', fontWeight: 900 },
  secondaryBtn: { padding: '10px 12px', borderRadius: 10, border: `1px solid ${RCS.gold}`, background: 'transparent', color: RCS.deepNavy, cursor: 'pointer', fontWeight: 900, textDecoration: 'none', display: 'inline-block' },
  dangerBtn: { padding: '10px 12px', borderRadius: 10, border: '1px solid #991b1b', background: '#FEE2E2', color: '#7F1D1D', cursor: 'pointer', fontWeight: 900 },
  errorBox: { marginBottom: 12, padding: 12, borderRadius: 10, border: '1px solid #991b1b', background: '#FEE2E2', color: '#7F1D1D', whiteSpace: 'pre-wrap' },
};
