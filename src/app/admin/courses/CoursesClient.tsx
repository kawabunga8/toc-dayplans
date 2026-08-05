'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { useSchoolYear } from '@/app/admin/SchoolYearContext';
import { STUDENT_HUB_URL } from '@/lib/studentHub';

type CourseRow = {
  id: string;
  name: string;
  room: string | null;
  sort_order: number | null;
  block_label: string | null;
  active_quarters: number[] | null;
  course_ids: string[];
};

type HubCourse = { id: string; name: string; block: string | null; school_year: string };

type Status = 'loading' | 'idle' | 'error';

type QuarterFilter = 'all' | 1 | 2 | 3 | 4;
type QuarterRow = { id: number; label?: string; start_date: string; end_date: string };

function quarterNumber(q: QuarterRow): number {
  const n = parseInt(String(q.label ?? '').replace(/[^0-9]/g, ''), 10);
  return Number.isNaN(n) ? q.id : n;
}


export default function CoursesClient() {
  const { schoolYear } = useSchoolYear();
  const [items, setItems] = useState<CourseRow[]>([]);
  const [tagsByClassId, setTagsByClassId] = useState<Record<string, string[]>>({});
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const [quarterFilter, setQuarterFilter] = useState<QuarterFilter>('all');
  const [hasAppliedDefaultQuarter, setHasAppliedDefaultQuarter] = useState(false);
  const [hubCourses, setHubCourses] = useState<HubCourse[]>([]);
  const [linkingId, setLinkingId] = useState<string | null>(null);

  // Default the filter to whichever quarter today falls in. If today isn't in any
  // quarter (summer break, between quarters), leave the default as 'all'.
  useEffect(() => {
    if (hasAppliedDefaultQuarter) return;
    fetch(`/api/admin/school-quarters?school_year=${encodeURIComponent(schoolYear)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((quarters: QuarterRow[] | null) => {
        if (!quarters) return;
        const today = new Date().toISOString().split('T')[0]!;
        const current = quarters.find((q) => today >= q.start_date && today <= q.end_date);
        // Use the quarter number from the label — row ids are per school year and are
        // not 1-4, whereas courses.active_quarters holds 1-4.
        if (current) setQuarterFilter(quarterNumber(current) as QuarterFilter);
        setHasAppliedDefaultQuarter(true);
      })
      .catch(() => setHasAppliedDefaultQuarter(true));
  }, [hasAppliedDefaultQuarter, schoolYear]);

  async function loadHubCourses() {
    try {
      const supabase = getSupabaseClient();
      const q = supabase
        .from('courses')
        .select('id,name,block,school_year')
        .is('superseded_by', null)
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('name', { ascending: true });
      if (schoolYear) q.eq('school_year', schoolYear);
      const { data } = await q;
      if (data) setHubCourses(data as HubCourse[]);
    } catch { /* non-critical */ }
  }

  async function linkCourse(classId: string, courseId: string) {
    setLinkingId(classId);
    try {
      await fetch('/api/admin/classes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: classId, link_course_id: courseId }),
      });
      setItems((prev) => prev.map((c) =>
        c.id === classId && !c.course_ids.includes(courseId)
          ? { ...c, course_ids: [...c.course_ids, courseId] }
          : c
      ));
    } finally {
      setLinkingId(null);
    }
  }

  async function unlinkCourse(classId: string, courseId: string) {
    setLinkingId(classId);
    try {
      await fetch('/api/admin/classes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: classId, unlink_course_id: courseId }),
      });
      setItems((prev) => prev.map((c) =>
        c.id === classId
          ? { ...c, course_ids: c.course_ids.filter((id) => id !== courseId) }
          : c
      ));
    } finally {
      setLinkingId(null);
    }
  }

  async function load() {
    setStatus('loading');
    setError(null);

    try {
      const res = await fetch('/api/admin/classes');
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? 'Failed to load classes');
      // Filter to the selected school year client-side (API returns all years)
      let rows = (json.rows ?? []) as CourseRow[];
      if (schoolYear) {
        // We need school_year on rows — fetch directly for filtering
        const supabase = getSupabaseClient();
        const { data: syData } = await supabase
          .from('classes')
          .select('id,school_year')
          .in('id', rows.map((r) => r.id));
        const syMap = Object.fromEntries((syData ?? []).map((r: any) => [r.id, r.school_year]));
        rows = rows.filter((r) => (syMap[r.id] ?? null) === schoolYear || (syMap[r.id] ?? null) === null);
      }
      setItems(rows);

      const classIds = rows.map((r) => r.id);
      if (classIds.length > 0) {
        const supabase = getSupabaseClient();
        const { data: tplRows, error: tplErr } = await supabase
          .from('class_toc_templates')
          .select('class_id,default_tags')
          .eq('is_active', true)
          .in('class_id', classIds);
        if (tplErr) throw tplErr;

        const map: Record<string, string[]> = {};
        for (const r of (tplRows ?? []) as any[]) {
          const cid = String(r.class_id);
          const tags = Array.isArray(r.default_tags) ? (r.default_tags as string[]).map((t) => String(t).trim()).filter(Boolean) : [];
          map[cid] = tags;
        }
        setTagsByClassId(map);
      } else {
        setTagsByClassId({});
      }

      setStatus('idle');
    } catch (e: any) {
      setStatus('error');
      setError(humanizeError(e));
    }
  }

  useEffect(() => {
    void load();
    void loadHubCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolYear]);

  const filteredItems = useMemo(() => {
    if (quarterFilter === 'all') return items;
    return items.filter((c) => {
      if (c.active_quarters === null) return true; // all year
      return c.active_quarters.includes(quarterFilter as number);
    });
  }, [items, quarterFilter]);

  return (
    <main style={styles.page}>
      <h1 style={styles.h1}>Courses / Rooms</h1>
      <p style={styles.muted}>
        Course name/grade/years are now owned by{' '}
        <a href={`${STUDENT_HUB_URL}/courses`} target="_blank" rel="noopener noreferrer" style={{ color: RCS.midBlue, fontWeight: 800 }}>
          Student Hub →
        </a>{' '}
        — this page is read-only and links out to each class's TOC template.
      </p>

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

        {/* Quarter filter */}
        <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: RCS.midBlue, marginRight: 2 }}>Show:</span>
          {(['all', 1, 2, 3, 4] as QuarterFilter[]).map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setQuarterFilter(q)}
              style={{ ...styles.quarterPill, ...(quarterFilter === q ? styles.quarterPillActive : {}) }}
            >
              {q === 'all' ? 'All' : `Q${q}`}
            </button>
          ))}
        </div>

        {status === 'error' && error && (
          <div style={styles.errorBox}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Error</div>
            <div>{error}</div>
          </div>
        )}

        {status !== 'loading' && items.length === 0 && (
          <div style={{ opacity: 0.85, marginTop: 12 }}>No classes found for this school year.</div>
        )}

        <div style={{ overflowX: 'auto', marginTop: 12 }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Block</th>
                <th style={styles.th}>Class</th>
                <th style={styles.th}>Room</th>
                <th style={styles.th}>Quarters</th>
                <th style={styles.th}>#Tags</th>
                <th style={styles.th}>Course Hub link</th>
                <th style={styles.th}></th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((c, i) => {
                const linkedCourses = c.course_ids
                  .map((cid) => hubCourses.find((hc) => hc.id === cid) ?? { id: cid, name: cid.slice(0, 8) + '…', block: null, school_year: schoolYear })
                const unlinkedHubCourses = hubCourses.filter((hc) => !c.course_ids.includes(hc.id));
                const isLinking = linkingId === c.id;
                return (
                <tr key={c.id} style={i % 2 === 0 ? styles.trEven : styles.trOdd}>
                  <td style={styles.tdLabel}>{c.block_label ?? '—'}</td>
                  <td style={styles.td}>{c.name}</td>
                  <td style={styles.td}>{c.room || '—'}</td>
                  <td style={styles.td}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {c.active_quarters === null
                        ? <span style={styles.quarterBadge}>All year</span>
                        : c.active_quarters.map((q) => <span key={q} style={styles.quarterBadge}>Q{q}</span>)}
                    </div>
                  </td>
                  <td style={styles.td}>{(tagsByClassId[c.id] ?? []).map((t) => `#${t}`).join(' ')}</td>
                  <td style={styles.td}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                      {linkedCourses.map((lc) => (
                        <span key={lc.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <span style={styles.linkedBadge}>🔗 {lc.name}</span>
                          <button
                            onClick={() => unlinkCourse(c.id, lc.id)}
                            disabled={isLinking}
                            title="Unlink"
                            style={styles.unlinkBtn}
                          >✕</button>
                        </span>
                      ))}
                      {unlinkedHubCourses.length > 0 && (
                        <select
                          value=""
                          disabled={isLinking}
                          onChange={(e) => { if (e.target.value) linkCourse(c.id, e.target.value); }}
                          style={styles.linkSelect}
                        >
                          <option value="">+ add link</option>
                          {unlinkedHubCourses.map((hc) => (
                            <option key={hc.id} value={hc.id}>
                              {hc.block ? `Block ${hc.block} — ` : ''}{hc.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </td>
                  <td style={styles.tdRight}>
                    <Link href={`/admin/courses/${c.id}/toc-template`} style={styles.primaryLink}>
                      TOC Template
                    </Link>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
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
  page: { padding: 24, maxWidth: 1000, margin: '0 auto', fontFamily: 'system-ui', color: RCS.textDark, background: RCS.white },
  h1: { margin: 0, color: RCS.deepNavy },
  muted: { opacity: 0.85, marginTop: 6, marginBottom: 16 },
  mutedSmall: { opacity: 0.85, fontSize: 12 },
  card: { border: `1px solid ${RCS.deepNavy}`, borderRadius: 12, padding: 16, background: RCS.white },
  rowBetween: { display: 'flex', gap: 16, justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap' },
  sectionTitle: { fontWeight: 900, color: RCS.deepNavy },
  primaryLink: { padding: '8px 10px', borderRadius: 10, border: `1px solid ${RCS.gold}`, background: RCS.deepNavy, color: RCS.white, textDecoration: 'none', fontWeight: 800, whiteSpace: 'nowrap' },
  secondaryBtn: { padding: '8px 10px', borderRadius: 10, border: `1px solid ${RCS.gold}`, background: RCS.white, color: RCS.deepNavy, cursor: 'pointer', fontWeight: 800 },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: 6 },
  th: { textAlign: 'left', padding: 10, background: RCS.deepNavy, color: RCS.white, borderBottom: `3px solid ${RCS.gold}`, fontSize: 12, letterSpacing: 0.4 },
  trEven: { background: RCS.white },
  trOdd: { background: RCS.lightGray },
  td: { padding: 10, borderBottom: `1px solid ${RCS.deepNavy}`, verticalAlign: 'top' },
  tdRight: { padding: 10, borderBottom: `1px solid ${RCS.deepNavy}`, textAlign: 'right', verticalAlign: 'top' },
  tdLabel: { padding: 10, borderBottom: `1px solid ${RCS.deepNavy}`, color: RCS.midBlue, fontWeight: 800, width: 70 },
  quarterPill: { padding: '3px 8px', borderRadius: 6, border: `1px solid ${RCS.deepNavy}`, background: RCS.white, color: RCS.deepNavy, cursor: 'pointer', fontSize: 11, fontWeight: 700 },
  quarterPillActive: { background: RCS.deepNavy, color: RCS.white },
  quarterBadge: { padding: '2px 7px', borderRadius: 6, background: RCS.lightBlue, color: RCS.deepNavy, fontSize: 11, fontWeight: 700 },
  linkedBadge: { padding: '2px 8px', borderRadius: 6, background: '#d1fae5', color: '#065f46', fontSize: 11, fontWeight: 700 },
  unlinkBtn: { padding: '1px 6px', borderRadius: 4, border: '1px solid #d1d5db', background: '#fff', color: '#6b7280', cursor: 'pointer', fontSize: 11 },
  linkSelect: { padding: '3px 6px', borderRadius: 6, border: `1px solid ${RCS.deepNavy}`, background: RCS.white, color: RCS.textDark, fontSize: 11 },
  errorBox: { marginTop: 12, padding: 12, borderRadius: 10, border: '1px solid #991b1b', background: '#FEE2E2', color: '#7F1D1D' },
};
