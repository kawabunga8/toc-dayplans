'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { useDemo } from '@/app/admin/DemoContext';

type CourseRow = {
  id: string;
  name: string;
  room: string | null;
  sort_order: number | null;
  block_label: string | null;
  active_quarters: number[] | null;
};

type Status = 'loading' | 'idle' | 'saving' | 'error';

type QuarterFilter = 'all' | 1 | 2 | 3 | 4;

export default function CoursesClient() {
  const { isDemo } = useDemo();
  const [items, setItems] = useState<CourseRow[]>([]);
  const [tagsByClassId, setTagsByClassId] = useState<Record<string, string[]>>({});
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const [quarterFilter, setQuarterFilter] = useState<QuarterFilter>('all');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState<string>('');
  const [draftRoom, setDraftRoom] = useState<string>('');
  const [draftBlock, setDraftBlock] = useState<string>('');
  const [draftQuarters, setDraftQuarters] = useState<number[] | null>(null);

  // Add new class form
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRoom, setNewRoom] = useState('');
  const [newBlock, setNewBlock] = useState('');
  const [newQuarters, setNewQuarters] = useState<number[] | null>(null);

  async function load() {
    setStatus('loading');
    setError(null);

    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('classes')
        .select('id,name,room,sort_order,block_label,active_quarters')
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('name', { ascending: true });
      if (error) throw error;

      const rows = (data ?? []) as CourseRow[];
      setItems(rows);

      const classIds = rows.map((r) => r.id);
      if (classIds.length > 0) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredItems = useMemo(() => {
    if (quarterFilter === 'all') return items;
    return items.filter((c) => {
      if (c.active_quarters === null) return true; // all year
      return c.active_quarters.includes(quarterFilter as number);
    });
  }, [items, quarterFilter]);

  async function startEdit(row: CourseRow) {
    setEditingId(row.id);
    setDraftName(row.name ?? '');
    setDraftRoom(row.room ?? '');
    setDraftBlock(row.block_label ?? '');
    setDraftQuarters(row.active_quarters ?? null);
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setDraftName('');
    setDraftRoom('');
    setDraftBlock('');
    setDraftQuarters(null);
  }

  function toggleDraftQuarter(q: number) {
    setDraftQuarters((prev) => {
      if (prev === null) return [q];
      if (prev.includes(q)) {
        const next = prev.filter((x) => x !== q);
        return next.length === 0 ? null : next;
      }
      return [...prev, q].sort();
    });
  }

  function toggleNewQuarter(q: number) {
    setNewQuarters((prev) => {
      if (prev === null) return [q];
      if (prev.includes(q)) {
        const next = prev.filter((x) => x !== q);
        return next.length === 0 ? null : next;
      }
      return [...prev, q].sort();
    });
  }

  async function saveEdit() {
    if (!editingId) return;
    if (isDemo) return;

    setStatus('saving');
    setError(null);

    try {
      const supabase = getSupabaseClient();
      const patch: any = {
        name: draftName.trim() || '—',
        room: draftRoom.trim() ? draftRoom.trim() : null,
        block_label: draftBlock.trim() ? draftBlock.trim().toUpperCase() : null,
        active_quarters: draftQuarters,
        updated_at: new Date().toISOString(),
      };

      let { error } = await supabase.from('classes').update(patch).eq('id', editingId);
      const msg = String((error as any)?.message ?? '');
      const code = String((error as any)?.code ?? '');
      const isMissingCol = code === '42703' || /column .* does not exist/i.test(msg) || /Could not find the '.*' column/i.test(msg);
      if (error && isMissingCol) {
        delete patch.updated_at;
        const retry = await supabase.from('classes').update(patch).eq('id', editingId);
        error = retry.error;
      }

      if (error) throw error;

      setItems((prev) => prev.map((r) => (r.id === editingId ? { ...r, name: patch.name, room: patch.room, block_label: patch.block_label, active_quarters: patch.active_quarters } : r)));
      setEditingId(null);
      setStatus('idle');
    } catch (e: any) {
      setStatus('error');
      setError(humanizeError(e));
    }
  }

  async function saveNew() {
    if (isDemo) return;
    if (!newName.trim()) return;

    setStatus('saving');
    setError(null);

    try {
      const supabase = getSupabaseClient();
      const maxOrder = items.reduce((m, r) => Math.max(m, r.sort_order ?? 0), 0);
      const insert: any = {
        name: newName.trim(),
        room: newRoom.trim() ? newRoom.trim() : null,
        block_label: newBlock.trim() ? newBlock.trim().toUpperCase() : null,
        active_quarters: newQuarters,
        sort_order: maxOrder + 1,
      };

      const { data, error } = await supabase.from('classes').insert(insert).select('id,name,room,sort_order,block_label,active_quarters').single();
      if (error) throw error;

      setItems((prev) => [...prev, data as CourseRow]);
      setAdding(false);
      setNewName('');
      setNewRoom('');
      setNewBlock('');
      setNewQuarters(null);
      setStatus('idle');
    } catch (e: any) {
      setStatus('error');
      setError(humanizeError(e));
    }
  }

  function cancelNew() {
    setAdding(false);
    setNewName('');
    setNewRoom('');
    setNewBlock('');
    setNewQuarters(null);
  }

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
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button onClick={load} disabled={status === 'loading'} style={styles.secondaryBtn}>
              {status === 'loading' ? 'Loading…' : 'Refresh'}
            </button>
            <button onClick={() => { setAdding(true); setEditingId(null); }} disabled={isDemo || adding} style={styles.primaryBtnSmall}>
              + Add class
            </button>
          </div>
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

        {status !== 'loading' && items.length === 0 && !adding && (
          <div style={{ opacity: 0.85, marginTop: 12 }}>No classes found. (Seed the <code>classes</code> table.)</div>
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
                <th style={styles.th}></th>
                <th style={styles.th}></th>
              </tr>
            </thead>
            <tbody>
              {/* Add new class row */}
              {adding && (
                <tr style={{ background: RCS.paleGold }}>
                  <td style={styles.td}>
                    <input value={newBlock} onChange={(e) => setNewBlock(e.target.value)} style={styles.inputInline} placeholder="e.g. A" />
                  </td>
                  <td style={styles.td}>
                    <input value={newName} onChange={(e) => setNewName(e.target.value)} style={styles.inputInline} placeholder="Class name" autoFocus />
                  </td>
                  <td style={styles.td}>
                    <input value={newRoom} onChange={(e) => setNewRoom(e.target.value)} style={styles.inputInline} placeholder="(blank)" />
                  </td>
                  <td style={styles.td}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      <button type="button" onClick={() => setNewQuarters(null)} style={{ ...styles.quarterPill, ...(newQuarters === null ? styles.quarterPillActive : {}) }}>All year</button>
                      {[1, 2, 3, 4].map((q) => (
                        <button key={q} type="button" onClick={() => toggleNewQuarter(q)} style={{ ...styles.quarterPill, ...((newQuarters ?? []).includes(q) ? styles.quarterPillActive : {}) }}>Q{q}</button>
                      ))}
                    </div>
                  </td>
                  <td style={styles.td}></td>
                  <td style={styles.td}></td>
                  <td style={styles.tdRight}>
                    <div style={{ display: 'inline-flex', gap: 8, flexWrap: 'wrap' }}>
                      <button onClick={saveNew} style={styles.primaryBtnSmall} disabled={isDemo || status === 'saving' || !newName.trim()}>
                        {status === 'saving' ? 'Saving…' : 'Save'}
                      </button>
                      <button onClick={cancelNew} style={styles.secondaryBtn} disabled={status === 'saving'}>Cancel</button>
                    </div>
                  </td>
                </tr>
              )}

              {filteredItems.map((c, i) => (
                <tr key={c.id} style={i % 2 === 0 ? styles.trEven : styles.trOdd}>
                  <td style={styles.tdLabel}>
                    {editingId === c.id ? (
                      <input value={draftBlock} onChange={(e) => setDraftBlock(e.target.value)} style={{ ...styles.inputInline, width: 50 }} />
                    ) : (
                      c.block_label ?? '—'
                    )}
                  </td>
                  <td style={styles.td}>
                    {editingId === c.id ? (
                      <input value={draftName} onChange={(e) => setDraftName(e.target.value)} style={styles.inputInline} />
                    ) : (
                      c.name
                    )}
                  </td>
                  <td style={styles.td}>
                    {editingId === c.id ? (
                      <input value={draftRoom} onChange={(e) => setDraftRoom(e.target.value)} style={styles.inputInline} placeholder="(blank)" />
                    ) : (
                      c.room || '—'
                    )}
                  </td>
                  <td style={styles.td}>
                    {editingId === c.id ? (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        <button type="button" onClick={() => setDraftQuarters(null)} style={{ ...styles.quarterPill, ...(draftQuarters === null ? styles.quarterPillActive : {}) }}>All year</button>
                        {[1, 2, 3, 4].map((q) => (
                          <button key={q} type="button" onClick={() => toggleDraftQuarter(q)} style={{ ...styles.quarterPill, ...((draftQuarters ?? []).includes(q) ? styles.quarterPillActive : {}) }}>Q{q}</button>
                        ))}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {c.active_quarters === null
                          ? <span style={styles.quarterBadge}>All year</span>
                          : c.active_quarters.map((q) => <span key={q} style={styles.quarterBadge}>Q{q}</span>)}
                      </div>
                    )}
                  </td>
                  <td style={styles.td}>{(tagsByClassId[c.id] ?? []).map((t) => `#${t}`).join(' ')}</td>
                  <td style={styles.tdRight}>
                    <Link href={`/admin/courses/${c.id}/toc-template`} style={styles.primaryLink}>
                      TOC Template
                    </Link>
                  </td>
                  <td style={styles.tdRight}>
                    {editingId === c.id ? (
                      <div style={{ display: 'inline-flex', gap: 8, flexWrap: 'wrap' }}>
                        <button onClick={saveEdit} style={styles.primaryBtnSmall} disabled={isDemo || status === 'saving'}>
                          {status === 'saving' ? 'Saving…' : 'Save'}
                        </button>
                        <button onClick={cancelEdit} style={styles.secondaryBtn} disabled={status === 'saving'}>Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => startEdit(c)} style={styles.secondaryBtn} disabled={isDemo || status === 'saving'}>Edit</button>
                    )}
                  </td>
                </tr>
              ))}
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
  primaryBtnSmall: { padding: '8px 10px', borderRadius: 10, border: `1px solid ${RCS.gold}`, background: RCS.deepNavy, color: RCS.white, cursor: 'pointer', fontWeight: 900 },
  inputInline: { width: '100%', padding: '8px 10px', borderRadius: 10, border: `1px solid ${RCS.deepNavy}`, background: RCS.white, color: RCS.textDark, fontFamily: 'inherit' },
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
  errorBox: { marginTop: 12, padding: 12, borderRadius: 10, border: '1px solid #991b1b', background: '#FEE2E2', color: '#7F1D1D' },
};
