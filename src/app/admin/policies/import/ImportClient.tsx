'use client';

import { useState } from 'react';
import { useDemo } from '@/app/admin/DemoContext';

type Subject = 'ADST' | 'FA' | 'Bible' | 'all';

type Status = 'idle' | 'running' | 'done' | 'error';

export default function ImportClient() {
  const { isDemo } = useDemo();
  const [subject, setSubject] = useState<Subject>('all');
  const [status, setStatus] = useState<Status>('idle');
  const [out, setOut] = useState<string>('');

  async function run() {
    setStatus('running');
    setOut('');
    try {
      const res = await fetch('/api/admin/policies/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, mode: 'replace', wipeEdited: true }),
      });
      const j = await res.json();
      if (!res.ok) {
        setOut(JSON.stringify(j, null, 2));
        throw new Error(j?.error ?? j?.message ?? 'Import failed');
      }
      setOut(JSON.stringify(j, null, 2));
      setStatus('done');
    } catch (e: any) {
      setOut(String(e?.message ?? e));
      setStatus('error');
    }
  }

  return (
    <main style={styles.page}>
      <h1 style={styles.h1}>Policies Import</h1>
      <p style={styles.muted}>Replace learning standards + rubric text from CSVs in the learning-standards-data bucket.</p>

      <section style={styles.card}>
        <div style={styles.sectionHeader}>Import from CSV (Replace)</div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label style={styles.fieldInline}>
            <div style={styles.label}>Subject</div>
            <select value={subject} onChange={(e) => setSubject(e.target.value as any)} style={styles.input} disabled={isDemo || status === 'running'}>
              <option value="all">All (ADST + FA + Bible)</option>
              <option value="ADST">ADST</option>
              <option value="FA">FA</option>
              <option value="Bible">Bible</option>
            </select>
          </label>

          <button onClick={run} style={styles.primaryBtn} disabled={isDemo || status === 'running'}>
            {status === 'running' ? 'Importing…' : 'Run import'}
          </button>

          <a href="/admin/policies" style={styles.secondaryBtn}>
            ← Back to Policies
          </a>
        </div>

        <div style={{ marginTop: 12, fontSize: 12, opacity: 0.85 }}>
          Reads: <b>ADST.csv</b>, <b>FA.csv</b>, <b>Bible.csv</b> from bucket <b>learning-standards-data</b>.
          <br />
          This action deletes and re-inserts rows for the selected subject(s).
        </div>

        {out ? (
          <pre style={styles.pre}>{out}</pre>
        ) : null}
      </section>
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
  label: { color: RCS.midBlue, fontWeight: 900, fontSize: 12, marginBottom: 6 },
  fieldInline: { display: 'grid', gap: 6 },
  input: { padding: '10px 12px', borderRadius: 10, border: `1px solid ${RCS.deepNavy}`, background: RCS.white, color: RCS.textDark },
  primaryBtn: { padding: '10px 12px', borderRadius: 10, border: `1px solid ${RCS.gold}`, background: RCS.deepNavy, color: RCS.white, cursor: 'pointer', fontWeight: 900 },
  secondaryBtn: { padding: '10px 12px', borderRadius: 10, border: `1px solid ${RCS.gold}`, background: 'transparent', color: RCS.deepNavy, cursor: 'pointer', fontWeight: 900, textDecoration: 'none', display: 'inline-block' },
  pre: { marginTop: 12, padding: 12, borderRadius: 10, background: RCS.paleGold, border: `1px solid ${RCS.gold}`, overflowX: 'auto', whiteSpace: 'pre-wrap' },
};
