'use client';

import { useEffect, useMemo, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabaseClient';

type ClassRow = { id: string; name: string; room: string | null; block_label: string | null };

type StudentRow = { id: string; first_name: string; last_name: string };

type Status = 'loading' | 'idle' | 'working' | 'error';

export default function ClassListsClient() {
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);

  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');

  const [roster, setRoster] = useState<StudentRow[]>([]);

  const [allStudents, setAllStudents] = useState<StudentRow[]>([]);
  const [search, setSearch] = useState('');

  async function loadClassesAndStudents() {
    setStatus('loading');
    setError(null);

    try {
      const supabase = getSupabaseClient();

      const [{ data: classData, error: classErr }, { data: studentData, error: studentErr }] = await Promise.all([
        supabase
          .from('classes')
          .select('id,name,room,block_label,sort_order')
          .order('sort_order', { ascending: true, nullsFirst: false }),
        supabase.from('students').select('id,first_name,last_name').order('last_name', { ascending: true }).order('first_name', { ascending: true }),
      ]);

      if (classErr) throw classErr;
      if (studentErr) throw studentErr;

      const cls = (classData ?? []).map((c: any) => ({
        id: c.id,
        name: c.name,
        room: c.room ?? null,
        block_label: c.block_label ?? null,
      })) as ClassRow[];

      setClasses(cls);
      setAllStudents((studentData ?? []) as StudentRow[]);

      if (!selectedClassId && cls.length > 0) {
        setSelectedClassId(cls[0]!.id);
      }

      setStatus('idle');
    } catch (e: any) {
      setStatus('error');
      setError(humanizeError(e));
    }
  }

  async function loadRoster(classId: string) {
    setStatus('loading');
    setError(null);

    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('enrollments')
        .select('student:students(id,first_name,last_name)')
        .eq('class_id', classId);
      if (error) throw error;

      const list = (data ?? [])
        .map((r: any) => r.student)
        .filter(Boolean) as StudentRow[];

      list.sort((a, b) => {
        const ln = a.last_name.localeCompare(b.last_name);
        return ln !== 0 ? ln : a.first_name.localeCompare(b.first_name);
      });

      setRoster(list);
      setStatus('idle');
    } catch (e: any) {
      setStatus('error');
      setError(humanizeError(e));
    }
  }

  useEffect(() => {
    void loadClassesAndStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedClassId) return;
    void loadRoster(selectedClassId);
  }, [selectedClassId]);

  const selectedClass = useMemo(() => classes.find((c) => c.id === selectedClassId) ?? null, [classes, selectedClassId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];

    const already = new Set(roster.map((s) => s.id));
    const hits = allStudents
      .filter((s) => !already.has(s.id))
      .filter((s) => `${s.first_name} ${s.last_name}`.toLowerCase().includes(q) || `${s.last_name}, ${s.first_name}`.toLowerCase().includes(q))
      .slice(0, 10);

    return hits;
  }, [search, allStudents, roster]);

  async function addStudent(student: StudentRow) {
    if (!selectedClassId) return;
    setStatus('working');
    setError(null);

    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.from('enrollments').insert({ class_id: selectedClassId, student_id: student.id });
      if (error) throw error;

      setRoster((prev) => {
        const next = [...prev, student];
        next.sort((a, b) => {
          const ln = a.last_name.localeCompare(b.last_name);
          return ln !== 0 ? ln : a.first_name.localeCompare(b.first_name);
        });
        return next;
      });

      setSearch('');
      setStatus('idle');
    } catch (e: any) {
      setStatus('error');
      setError(humanizeError(e));
    }
  }

  async function removeStudent(student: StudentRow) {
    if (!selectedClassId) return;
    const ok = window.confirm(`Remove ${student.first_name} ${student.last_name} from this class?`);
    if (!ok) return;

    setStatus('working');
    setError(null);

    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('enrollments')
        .delete()
        .eq('class_id', selectedClassId)
        .eq('student_id', student.id);
      if (error) throw error;

      setRoster((prev) => prev.filter((s) => s.id !== student.id));
      setStatus('idle');
    } catch (e: any) {
      setStatus('error');
      setError(humanizeError(e));
    }
  }

  return (
    <main style={styles.page}>
      <h1 style={styles.h1}>Class lists</h1>
      <p style={styles.muted}>Select a course and edit its roster (adds/removes are saved immediately).</p>

      <section style={styles.card}>
        <div style={styles.sectionHeader}>Course</div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'end' }}>
          <label style={{ display: 'grid', gap: 6, minWidth: 320, flex: 1 }}>
            <span style={styles.label}>Course</span>
            <select value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)} style={styles.input}>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {(c.block_label ? `Block ${c.block_label} — ` : '') + c.name + (c.room ? ` (Room ${c.room})` : '')}
                </option>
              ))}
            </select>
          </label>

          <button onClick={loadClassesAndStudents} disabled={status === 'loading' || status === 'working'} style={styles.secondaryBtn}>
            Refresh
          </button>
        </div>

        {selectedClass && (
          <div style={{ marginTop: 10, opacity: 0.9 }}>
            <b>Selected:</b> {(selectedClass.block_label ? `Block ${selectedClass.block_label} — ` : '') + selectedClass.name}
          </div>
        )}

        {error && <div style={styles.errorBox}>{error}</div>}
      </section>

      <section style={styles.card}>
        <div style={styles.sectionHeader}>Roster</div>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ opacity: 0.9 }}>
            Students: <b>{roster.length}</b>
          </div>
          <div style={{ opacity: 0.85, fontSize: 12 }}>{status === 'working' ? 'Saving…' : status === 'loading' ? 'Loading…' : ''}</div>
        </div>

        <div style={{ marginTop: 12 }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={styles.label}>Add student</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Type a name…"
              style={styles.input}
            />
          </label>

          {filtered.length > 0 ? (
            <div style={styles.searchBox}>
              {filtered.map((s) => (
                <button key={s.id} onClick={() => addStudent(s)} style={styles.searchItem}>
                  {s.last_name}, {s.first_name}
                </button>
              ))}
            </div>
          ) : search.trim() ? (
            <div style={{ marginTop: 8, opacity: 0.85, fontSize: 12 }}>
              No matches. Try a last name (e.g. “Smith”), or that student may not be in the student list yet.
            </div>
          ) : null}
        </div>

        <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
          {roster.map((s, idx) => (
            <div key={s.id} style={idx % 2 === 0 ? styles.rowEven : styles.rowOdd}>
              <div style={{ fontWeight: 900 }}>{s.last_name}, {s.first_name}</div>
              <button onClick={() => removeStudent(s)} disabled={status === 'working' || status === 'loading'} style={styles.dangerBtn}>
                Remove
              </button>
            </div>
          ))}

          {status !== 'loading' && roster.length === 0 && <div style={{ opacity: 0.85 }}>No students in this class yet.</div>}
        </div>
      </section>
    </main>
  );
}

function humanizeError(e: any): string {
  const code = e?.code as string | undefined;
  const message = (e?.message as string | undefined) ?? '';

  if (code === '42501' || /row level security|permission denied/i.test(message)) {
    return 'Permission denied by Supabase security policy. Make sure you are signed in as staff.';
  }
  if (code === '23505' || /duplicate key value/i.test(message)) {
    return 'That student is already in this class.';
  }
  if (code === '42P01' || /relation .* does not exist/i.test(message)) {
    return 'Database is missing required tables (students/enrollments). Run the schema SQL in Supabase.';
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
  page: { padding: 24, maxWidth: 1100, margin: '0 auto', fontFamily: 'system-ui', background: RCS.white, color: RCS.textDark },
  h1: { margin: 0, color: RCS.deepNavy },
  muted: { opacity: 0.85, marginTop: 6, marginBottom: 16 },
  card: { border: `1px solid ${RCS.deepNavy}`, borderRadius: 12, padding: 16, background: RCS.white, marginTop: 14 },
  sectionHeader: {
    background: RCS.deepNavy,
    color: RCS.white,
    padding: '8px 10px',
    borderRadius: 10,
    borderBottom: `3px solid ${RCS.gold}`,
    fontWeight: 900,
    marginBottom: 12,
  },
  label: { color: RCS.midBlue, fontWeight: 800, fontSize: 12 },
  input: { padding: '10px 12px', borderRadius: 10, border: `1px solid ${RCS.deepNavy}`, background: RCS.white, color: RCS.textDark },
  secondaryBtn: { padding: '10px 12px', borderRadius: 10, border: `1px solid ${RCS.gold}`, background: 'transparent', color: RCS.deepNavy, cursor: 'pointer', fontWeight: 900 },
  dangerBtn: { padding: '8px 10px', borderRadius: 10, border: '1px solid #991b1b', background: '#FEE2E2', color: '#7F1D1D', cursor: 'pointer', fontWeight: 900 },
  rowEven: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: 10, border: `1px solid ${RCS.deepNavy}`, borderRadius: 12, background: RCS.white },
  rowOdd: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: 10, border: `1px solid ${RCS.deepNavy}`, borderRadius: 12, background: RCS.lightGray },
  errorBox: { marginTop: 12, padding: 12, borderRadius: 10, background: '#FEE2E2', border: '1px solid #991b1b', color: '#7F1D1D', whiteSpace: 'pre-wrap' },
  searchBox: {
    border: `2px solid ${RCS.deepNavy}`,
    borderRadius: 12,
    background: RCS.paleGold,
    marginTop: 8,
    overflow: 'hidden',
    boxShadow: '0 8px 22px rgba(0,0,0,0.18)',
  },
  searchItem: {
    display: 'block',
    width: '100%',
    textAlign: 'left',
    padding: 10,
    border: 0,
    borderBottom: `1px solid rgba(31,78,121,0.25)`,
    background: RCS.paleGold,
    color: RCS.deepNavy,
    cursor: 'pointer',
    fontWeight: 900,
    opacity: 1,
    WebkitTextFillColor: RCS.deepNavy as any,
  },
};
