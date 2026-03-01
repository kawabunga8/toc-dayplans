'use client';

import { useState } from 'react';
import { useDemo } from '@/app/admin/DemoContext';

type Status = 'idle' | 'running' | 'ok' | 'error';

const RCS = {
  deepNavy: '#1F4E79',
  lightBlue: '#D6E4F0',
  gold: '#C9A84C',
  white: '#FFFFFF',
} as const;

export default function ImportClient() {
  const { isDemo } = useDemo();

  const [status, setStatus] = useState<Status>('idle');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function runImport() {
    setStatus('running');
    setResult(null);
    setError(null);

    try {
      const res = await fetch('/api/admin/pro-dev-goals/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'replace' }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error ?? j?.message ?? 'Import failed');
      setResult(j);
      setStatus('ok');
    } catch (e: any) {
      setStatus('error');
      setError(e?.message ?? 'Import failed');
    }
  }

  return (
    <main style={{ padding: 18 }}>
      <h1 style={{ margin: 0, fontSize: 34, letterSpacing: -0.5, color: RCS.deepNavy }}>Pro Dev Goals Import</h1>
      <p style={{ marginTop: 6, marginBottom: 0, opacity: 0.75 }}>
        Replace (wipe all) professional development goals from CSV in <b>professional-development</b> bucket.
      </p>

      <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button onClick={runImport} disabled={isDemo || status === 'running'} style={styles.primaryBtn}>
          {status === 'running' ? 'Importing…' : 'Run import'}
        </button>
        <a href="/admin/policies/pro-dev-goals" style={styles.secondaryBtn}>
          ← Back
        </a>
      </div>

      <div style={{ marginTop: 10, fontSize: 12, opacity: 0.85 }}>
        Bucket: <b>professional-development</b>. CSV columns required: <b>Goal_ID</b>, <b>Goal_Description</b>.
      </div>

      {status === 'error' && error ? <div style={styles.errorBox}>{error}</div> : null}
      {result ? (
        <pre style={styles.resultBox}>{JSON.stringify(result, null, 2)}</pre>
      ) : null}

      <div style={{ marginTop: 12, fontSize: 12, opacity: 0.85 }}>
        If you get a “relation does not exist” error, run <code>supabase/schema_professional_development.sql</code> in Supabase SQL Editor first.
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  primaryBtn: { padding: '10px 12px', borderRadius: 10, border: `1px solid ${RCS.gold}`, background: RCS.deepNavy, color: RCS.white, cursor: 'pointer', fontWeight: 900 },
  secondaryBtn: { padding: '10px 12px', borderRadius: 10, border: `1px solid ${RCS.gold}`, background: 'transparent', color: RCS.deepNavy, cursor: 'pointer', fontWeight: 900, textDecoration: 'none', display: 'inline-block' },
  resultBox: { marginTop: 12, background: RCS.lightBlue, border: `1px solid rgba(31,78,121,0.35)`, borderRadius: 12, padding: 12, overflowX: 'auto' },
  errorBox: { marginTop: 12, padding: 10, borderRadius: 10, background: '#FEE2E2', border: '1px solid #991b1b', color: '#7F1D1D', whiteSpace: 'pre-wrap' },
};
