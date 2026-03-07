'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabaseClient';

const RCS = {
  deepNavy: '#1F4E79',
  navy: '#1F4E79',
  midBlue: '#2E75B6',
  lightBlue: '#D6E4F0',
  gold: '#C9A84C',
  white: '#FFFFFF',
  lightGray: '#F5F5F5',
  textDark: '#1A1A1A',
  red: '#B00020',
} as const;

type Status = 'loading' | 'idle' | 'saving' | 'error';

export default function PublicLayoutAdminPage() {
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const [jsonText, setJsonText] = useState('');
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const pretty = useMemo(() => {
    try {
      const parsed = JSON.parse(jsonText);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return null;
    }
  }, [jsonText]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setStatus('loading');
      setError(null);
      try {
        const supabase = getSupabaseClient();
        const { data, error: err } = await supabase
          .from('public_page_layouts')
          .select('layout,updated_at')
          .eq('layout_id', 'public_plan')
          .maybeSingle();
        if (err) throw err;
        const layout = (data as any)?.layout ?? {};
        const txt = JSON.stringify(layout, null, 2);
        if (!cancelled) {
          setJsonText(txt);
          setSavedAt((data as any)?.updated_at ?? null);
          setStatus('idle');
        }
      } catch (e: any) {
        if (!cancelled) {
          setStatus('error');
          setError(e?.message ?? 'Failed to load layout');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function save() {
    setStatus('saving');
    setError(null);

    try {
      const parsed = JSON.parse(jsonText);
      const supabase = getSupabaseClient();
      const { data, error: err } = await supabase
        .from('public_page_layouts')
        .upsert({ layout_id: 'public_plan', layout: parsed, updated_at: new Date().toISOString() }, { onConflict: 'layout_id' })
        .select('updated_at')
        .single();
      if (err) throw err;
      setSavedAt((data as any)?.updated_at ?? null);
      setStatus('idle');
    } catch (e: any) {
      setStatus('error');
      setError(e?.message ?? 'Failed to save layout (invalid JSON?)');
    }
  }

  return (
    <main style={styles.page}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div>
          <h1 style={styles.h1}>Public Page Layout</h1>
          <div style={styles.muted}>
            Global layout template for <code>/p</code>. Controls section order, titles, and visibility.
          </div>
        </div>
        <Link href="/admin" style={styles.secondaryLink}>
          ← Back to Admin
        </Link>
      </div>

      {status === 'error' && error ? <div style={styles.errorBox}>{error}</div> : null}

      <section style={styles.card}>
        <div style={styles.sectionHeader}>Layout JSON</div>
        <div style={{ display: 'grid', gap: 10 }}>
          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            rows={22}
            spellCheck={false}
            style={styles.textarea}
          />

          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <button onClick={save} disabled={status === 'saving'} style={styles.primaryBtn}>
              {status === 'saving' ? 'Saving…' : 'Save layout'}
            </button>
            <div style={{ fontSize: 12, opacity: 0.85 }}>
              {savedAt ? <>Last saved: <code>{savedAt}</code></> : null}
            </div>
            {pretty && pretty !== jsonText ? (
              <button onClick={() => setJsonText(pretty)} type="button" style={styles.secondaryBtn}>
                Format JSON
              </button>
            ) : null}
          </div>

          <div style={{ fontSize: 12, opacity: 0.85 }}>
            Expected shape: <code>{'{"sections":[{"key":"class_overview","title":"Class Overview","enabled":true}, ...]}'}</code>
          </div>
        </div>
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: 24, maxWidth: 1000, margin: '0 auto', fontFamily: 'system-ui', background: RCS.white, color: RCS.textDark },
  h1: { margin: 0, color: RCS.deepNavy },
  muted: { opacity: 0.85, marginTop: 6 },
  card: { border: `1px solid ${RCS.deepNavy}`, borderRadius: 12, padding: 16, background: RCS.white, marginTop: 16 },
  sectionHeader: {
    background: RCS.deepNavy,
    color: RCS.white,
    padding: '8px 10px',
    borderRadius: 10,
    borderBottom: `3px solid ${RCS.gold}`,
    fontWeight: 900,
    marginBottom: 12,
  },
  textarea: {
    width: '100%',
    padding: 12,
    borderRadius: 12,
    border: `1px solid ${RCS.deepNavy}`,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    fontSize: 12,
    background: RCS.lightGray,
  },
  primaryBtn: {
    padding: '10px 12px',
    borderRadius: 10,
    border: `1px solid ${RCS.gold}`,
    background: RCS.deepNavy,
    color: RCS.white,
    fontWeight: 900,
    cursor: 'pointer',
  },
  secondaryBtn: {
    padding: '10px 12px',
    borderRadius: 10,
    border: `1px solid ${RCS.gold}`,
    background: 'transparent',
    color: RCS.deepNavy,
    fontWeight: 900,
    cursor: 'pointer',
  },
  secondaryLink: {
    padding: '10px 12px',
    borderRadius: 10,
    border: `1px solid ${RCS.gold}`,
    background: 'transparent',
    color: RCS.deepNavy,
    textDecoration: 'none',
    fontWeight: 900,
    display: 'inline-block',
  },
  errorBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    border: `1px solid ${RCS.red}`,
    background: '#ffecec',
    color: RCS.red,
    fontWeight: 700,
  },
};
