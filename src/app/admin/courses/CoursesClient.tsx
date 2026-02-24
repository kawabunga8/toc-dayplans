'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabaseClient';

type CourseRow = {
  id: string;
  name: string;
  room: string | null;
  sort_order: number | null;
  block_label: string | null;
};

type Status = 'loading' | 'idle' | 'error';

export default function CoursesClient() {
  const [items, setItems] = useState<CourseRow[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setStatus('loading');
    setError(null);

    try {
      const supabase = getSupabaseClient();
          const { data, error } = await supabase
        .from('classes')
        .select('id,name,room,sort_order,block_label')
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('name', { ascending: true });
      if (error) throw error;
      setItems((data ?? []) as CourseRow[]);
      setStatus('idle');
    } catch (e: any) {
      setStatus('error');
      setError(humanizeError(e));
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main style={styles.page}>
      <h1 style={styles.h1}>Courses / Rooms</h1>
      <p style={styles.muted}>Classes from the <code>classes</code> table, ordered by <code>sort_order</code>.</p>

      <section style={styles.card}>
        <div style={styles.rowBetween}>
          <div>
            <div style={styles.sectionTitle}>Classes</div>
            <div style={styles.mutedSmall}>Name + room, with a link to its TOC template.</div>
          </div>
          <button onClick={load} disabled={status === 'loading'} style={styles.secondaryBtn}>
            {status === 'loading' ? 'Loading…' : 'Refresh'}
          </button>
        </div>

        {status === 'error' && error && (
          <div style={styles.errorBox}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Couldn’t load classes</div>
            <div>{error}</div>
          </div>
        )}

        {status !== 'loading' && items.length === 0 && (
          <div style={{ opacity: 0.85, marginTop: 12 }}>No classes found. (Seed the <code>classes</code> table.)</div>
        )}

        {items.length > 0 && (
          <div style={{ overflowX: 'auto', marginTop: 12 }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Block</th>
                  <th style={styles.th}>Class</th>
                  <th style={styles.th}>Room</th>
                  <th style={styles.th}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((c, i) => (
                  <tr key={c.id} style={i % 2 === 0 ? styles.trEven : styles.trOdd}>
                    <td style={styles.tdLabel}>{c.block_label ?? '—'}</td>
                    <td style={styles.td}>{c.name}</td>
                    <td style={styles.td}>{c.room || '—'}</td>
                    <td style={styles.tdRight}>
                      <Link href={`/admin/courses/${c.id}/toc-template`} style={styles.primaryLink}>
                        TOC Template
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

function humanizeError(e: any): string {
  const code = e?.code as string | undefined;
  const message = (e?.message as string | undefined) ?? '';

  if (code === '42P01' || /relation .* does not exist/i.test(message)) {
    return 'Database is missing the classes table.';
  }
  if (code === '42501' || /row level security|permission denied/i.test(message)) {
    return 'Permission denied. Make sure you are logged in as staff (staff_profiles) and RLS policies exist.';
  }

  return message || 'Unknown error.';
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

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: 24,
    maxWidth: 1000,
    margin: '0 auto',
    fontFamily: 'system-ui',
    color: RCS.textDark,
    background: RCS.white,
  },
  h1: { margin: 0, color: RCS.deepNavy },
  muted: { opacity: 0.85, marginTop: 6, marginBottom: 16 },
  mutedSmall: { opacity: 0.85, fontSize: 12 },
  card: {
    border: `1px solid ${RCS.deepNavy}`,
    borderRadius: 12,
    padding: 16,
    background: RCS.white,
  },
  rowBetween: { display: 'flex', gap: 16, justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap' },
  sectionTitle: { fontWeight: 900, color: RCS.deepNavy },
  primaryLink: {
    padding: '8px 10px',
    borderRadius: 10,
    border: `1px solid ${RCS.gold}`,
    background: RCS.deepNavy,
    color: RCS.white,
    textDecoration: 'none',
    fontWeight: 800,
    whiteSpace: 'nowrap',
  },
  secondaryBtn: {
    padding: '8px 10px',
    borderRadius: 10,
    border: `1px solid ${RCS.gold}`,
    background: RCS.white,
    color: RCS.deepNavy,
    cursor: 'pointer',
    fontWeight: 800,
  },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: 6 },
  th: {
    textAlign: 'left',
    padding: 10,
    background: RCS.deepNavy,
    color: RCS.white,
    borderBottom: `3px solid ${RCS.gold}`,
    fontSize: 12,
    letterSpacing: 0.4,
  },
  trEven: { background: RCS.white },
  trOdd: { background: RCS.lightGray },
  td: {
    padding: 10,
    borderBottom: `1px solid ${RCS.deepNavy}`,
    verticalAlign: 'top',
  },
  tdRight: {
    padding: 10,
    borderBottom: `1px solid ${RCS.deepNavy}`,
    textAlign: 'right',
    verticalAlign: 'top',
  },
  tdLabel: {
    padding: 10,
    borderBottom: `1px solid ${RCS.deepNavy}`,
    color: RCS.midBlue,
    fontWeight: 800,
    width: 70,
  },
  errorBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    border: '1px solid #991b1b',
    background: '#FEE2E2',
    color: '#7F1D1D',
  },
};
