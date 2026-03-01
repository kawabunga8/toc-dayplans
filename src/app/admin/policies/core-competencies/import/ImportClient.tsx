'use client';

import { useState } from 'react';
import { useDemo } from '@/app/admin/DemoContext';

type Status = 'idle' | 'running' | 'done' | 'error';

export default function ImportClient() {
  const { isDemo } = useDemo();
  const [status, setStatus] = useState<Status>('idle');
  const [out, setOut] = useState<string>('');

  async function run() {
    setStatus('running');
    setOut('');
    try {
      const res = await fetch('/api/admin/core-competencies/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'replace' }),
      });
      const j = await res.json();
      setOut(JSON.stringify(j, null, 2));
      if (!res.ok) throw new Error(j?.error ?? j?.message ?? 'Import failed');
      setStatus('done');
    } catch (e: any) {
      setOut((prev) => prev || String(e?.message ?? e));
      setStatus('error');
    }
  }

  return (
    <main style={styles.page}>
      <h1 style={styles.h1}>Core Competencies Import</h1>
      <p style={styles.muted}>Replace (wipe all) core competency taxonomy from CSV in core-competencies-data bucket.</p>

      <section style={styles.card}>
        <div style={styles.sectionHeader}>Import from CSV (Replace)</div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <button onClick={run} style={styles.primaryBtn} disabled={isDemo || status === 'running'}>
            {status === 'running' ? 'Importing…' : 'Run import'}
          </button>
          <a href="/admin/policies/core-competencies" style={styles.secondaryBtn}>
            ← Back
          </a>
        </div>

        <div style={{ marginTop: 12, fontSize: 12, opacity: 0.85 }}>
          Bucket: <b>core-competencies-data</b>. CSV columns required: <b>Core Competency</b>, <b>Sub-Competency</b>, <b>Facet Name</b>.
        </div>

        {out ? <pre style={styles.pre}>{out}</pre> : null}
      </section>
    </main>
  );
}

const RCS = {
  deepNavy: '#1F4E79',
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
  primaryBtn: { padding: '10px 12px', borderRadius: 10, border: `1px solid ${RCS.gold}`, background: RCS.deepNavy, color: RCS.white, cursor: 'pointer', fontWeight: 900 },
  secondaryBtn: { padding: '10px 12px', borderRadius: 10, border: `1px solid ${RCS.gold}`, background: 'transparent', color: RCS.deepNavy, cursor: 'pointer', fontWeight: 900, textDecoration: 'none', display: 'inline-block' },
  pre: { marginTop: 12, padding: 12, borderRadius: 10, background: RCS.paleGold, border: `1px solid ${RCS.gold}`, overflowX: 'auto', whiteSpace: 'pre-wrap' },
};
