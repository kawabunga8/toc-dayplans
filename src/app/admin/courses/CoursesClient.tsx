'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabaseClient';

type CourseRow = {
  id: string;
  name: string;
  room: string | null;
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
      const { data, error } = await supabase.from('classes').select('id,name,room').order('name', { ascending: true });
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
      <p style={styles.muted}>Classes from the <code>classes</code> table. Use these to navigate to the TOC template editor.</p>

      <section style={styles.card}>
        <div style={styles.rowBetween}>
          <div>
            <div style={styles.sectionTitle}>Classes</div>
            <div style={styles.mutedSmall}>Showing name + room, with a link to its TOC template.</div>
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

        <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
          {items.map((c) => (
            <div key={c.id} style={styles.item}>
              <div>
                <div style={{ fontWeight: 800, color: 'white' }}>{c.name}</div>
                <div style={{ opacity: 0.9 }}>Room: {c.room || '—'}</div>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <Link href={`/admin/courses/${c.id}/toc-template`} style={styles.primaryLink}>
                  TOC Template
                </Link>
              </div>
            </div>
          ))}
        </div>
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

const styles: Record<string, React.CSSProperties> = {
  page: { padding: 24, maxWidth: 1000, margin: '0 auto', fontFamily: 'system-ui', color: '#e2e8f0' },
  h1: { margin: 0, color: 'white' },
  muted: { opacity: 0.85, marginTop: 6, marginBottom: 16 },
  mutedSmall: { opacity: 0.8, fontSize: 12 },
  card: { border: '1px solid #334155', borderRadius: 12, padding: 16, background: 'rgba(2,6,23,0.35)' },
  rowBetween: { display: 'flex', gap: 16, justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap' },
  sectionTitle: { fontWeight: 900, color: 'white' },
  primaryLink: {
    padding: '10px 12px',
    borderRadius: 10,
    border: '1px solid #c9a84c',
    background: '#0b1f33',
    color: 'white',
    textDecoration: 'none',
    fontWeight: 800,
  },
  secondaryBtn: {
    padding: '10px 12px',
    borderRadius: 10,
    border: '1px solid #94a3b8',
    background: 'transparent',
    color: '#e2e8f0',
    cursor: 'pointer',
  },
  item: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    border: '1px solid #334155',
    background: 'rgba(2,6,23,0.4)',
  },
  errorBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    border: '1px solid #fecaca',
    background: '#7f1d1d',
    color: 'white',
  },
};
