'use client';

import { useState } from 'react';
import { useDemo } from '@/app/admin/DemoContext';

type Status = 'idle' | 'running' | 'error';

type Counts = { domains: number; subcompetencies: number; facets: number; facetsWithDescription: number };
type Preview = {
  dryRun: true;
  filename: string;
  current: Counts;
  replacement: Counts;
  warning: string;
};

type Applied = {
  ok: true;
  dryRun: false;
  filename: string;
  counts: { domains: number; subcompetencies: number; facets: number };
};

export default function ImportClient() {
  const { isDemo } = useDemo();
  const [status, setStatus] = useState<Status>('idle');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [applied, setApplied] = useState<Applied | null>(null);
  const [error, setError] = useState<string>('');

  async function call(dryRun: boolean) {
    setStatus('running');
    setError('');
    try {
      const res = await fetch('/api/admin/core-competencies/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'replace', dryRun }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError([body?.error, ...(body?.details ?? [])].filter(Boolean).join('\n') || `${res.status} ${res.statusText}`);
        setStatus('idle');
        return;
      }
      if (dryRun) {
        setPreview(body as Preview);
      } else {
        setApplied(body as Applied);
        setPreview(null);
      }
      setStatus('idle');
    } catch (e: any) {
      setError(String(e?.message ?? e));
      setStatus('idle');
    }
  }

  return (
    <main style={styles.page}>
      <h1 style={styles.h1}>Core Competencies Import</h1>
      <p style={styles.muted}>
        Replaces the whole taxonomy — domains, sub-competencies, and facets — from the CSV in the
        core-competencies-data bucket. Preview shows what would change before anything is written.
      </p>

      <section style={styles.card}>
        <div style={styles.sectionHeader}>Import from CSV (Replace)</div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <button onClick={() => call(true)} style={styles.primaryBtn} disabled={isDemo || status === 'running'}>
            {status === 'running' ? 'Working…' : 'Preview changes'}
          </button>
          {preview ? (
            <button onClick={() => call(false)} style={styles.dangerBtn} disabled={isDemo || status === 'running'}>
              Apply — wipe and replace
            </button>
          ) : null}
          <a href="/admin/policies/core-competencies" style={styles.secondaryBtn}>
            ← Back
          </a>
        </div>

        <div style={{ marginTop: 12, fontSize: 12, opacity: 0.85 }}>
          Bucket: <b>core-competencies-data</b>. CSV columns required: <b>Core Competency</b>, <b>Sub-Competency</b>,{' '}
          <b>Facet Name</b>.
        </div>

        {error ? <pre style={styles.errorPre}>{error}</pre> : null}

        {preview ? (
          <div style={styles.pre}>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Preview — nothing written yet.</div>
            <div>File: {preview.filename}</div>
            <table style={{ marginTop: 8, borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={styles.th}></th>
                  <th style={styles.th}>Current</th>
                  <th style={styles.th}>After replace</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={styles.td}>Domains</td>
                  <td style={styles.td}>{preview.current.domains}</td>
                  <td style={styles.td}>{preview.replacement.domains}</td>
                </tr>
                <tr>
                  <td style={styles.td}>Sub-competencies</td>
                  <td style={styles.td}>{preview.current.subcompetencies}</td>
                  <td style={styles.td}>{preview.replacement.subcompetencies}</td>
                </tr>
                <tr>
                  <td style={styles.td}>Facets</td>
                  <td style={styles.td}>{preview.current.facets}</td>
                  <td style={styles.td}>{preview.replacement.facets}</td>
                </tr>
                <tr>
                  <td style={styles.td}>— with a description</td>
                  <td style={styles.td}>{preview.current.facetsWithDescription}</td>
                  <td style={styles.td}>{preview.replacement.facetsWithDescription}</td>
                </tr>
              </tbody>
            </table>
            {preview.replacement.facetsWithDescription === 0 ? (
              <div style={{ marginTop: 10, fontSize: 12, color: '#a05a00' }}>
                {preview.filename} has no Description column (or it's empty for every row) — facets will show a
                title only, same as now. Add a Description column to the CSV to fix that.
              </div>
            ) : null}
            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.85 }}>{preview.warning}</div>
          </div>
        ) : null}

        {applied ? (
          <pre style={styles.pre}>
            {`Applied — ${applied.filename}\nDomains: ${applied.counts.domains}\nSub-competencies: ${applied.counts.subcompetencies}\nFacets: ${applied.counts.facets}`}
          </pre>
        ) : null}
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
  dangerBtn: { padding: '10px 12px', borderRadius: 10, border: '1px solid #991b1b', background: '#DC2626', color: RCS.white, cursor: 'pointer', fontWeight: 900 },
  secondaryBtn: { padding: '10px 12px', borderRadius: 10, border: `1px solid ${RCS.gold}`, background: 'transparent', color: RCS.deepNavy, cursor: 'pointer', fontWeight: 900, textDecoration: 'none', display: 'inline-block' },
  pre: { marginTop: 12, padding: 12, borderRadius: 10, background: RCS.paleGold, border: `1px solid ${RCS.gold}`, overflowX: 'auto', whiteSpace: 'pre-wrap' },
  errorPre: { marginTop: 12, padding: 12, borderRadius: 10, background: '#FEE2E2', border: '1px solid #991b1b', color: '#7F1D1D', overflowX: 'auto', whiteSpace: 'pre-wrap' },
  th: { textAlign: 'left', padding: '4px 10px 4px 0', fontSize: 12, opacity: 0.8 },
  td: { padding: '2px 10px 2px 0', fontSize: 13 },
};
