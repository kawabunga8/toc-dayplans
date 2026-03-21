'use client';

import { useEffect, useState } from 'react';
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
  green: '#1B5E20',
  lightGreen: '#E8F5E9',
} as const;

type SectionKey =
  | 'class_overview'
  | 'division_of_roles'
  | 'opening_routine'
  | 'lesson_flow'
  | 'activity_options'
  | 'what_to_do_if'
  | 'end_of_class'
  | 'lesson_overview'
  | 'materials_needed'
  | 'assessment_touch_points'
  | 'pd_goal_connections'
  | 'first_peoples_principles';

type SectionRow = { key: SectionKey; title: string; enabled: boolean };

const DEFAULT_SECTIONS: SectionRow[] = [
  { key: 'class_overview', title: 'Class Overview', enabled: true },
  { key: 'division_of_roles', title: 'Division of Roles', enabled: true },
  { key: 'opening_routine', title: 'Opening Routine', enabled: true },
  { key: 'lesson_flow', title: 'Lesson Flow', enabled: true },
  { key: 'activity_options', title: 'Activity Options', enabled: true },
  { key: 'what_to_do_if', title: 'What to Do If…', enabled: true },
  { key: 'end_of_class', title: 'End of Class — Room Cleanup', enabled: true },
  { key: 'lesson_overview', title: 'Lesson Overview', enabled: true },
  { key: 'materials_needed', title: 'Materials Needed', enabled: true },
  { key: 'assessment_touch_points', title: '★ Assessment Touch Points', enabled: true },
  { key: 'pd_goal_connections', title: 'PD Goal Connections', enabled: true },
  { key: 'first_peoples_principles', title: 'First Peoples Principles of Learning', enabled: true },
];

type Status = 'loading' | 'idle' | 'saving' | 'saved' | 'error';

export default function PublicLayoutAdminPage() {
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const [sections, setSections] = useState<SectionRow[]>(DEFAULT_SECTIONS);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

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
        const raw = (data as any)?.layout;
        if (raw?.sections?.length) {
          setSections(
            (raw.sections as any[]).map((s: any) => ({
              key: s.key as SectionKey,
              title: typeof s.title === 'string' ? s.title : s.key,
              enabled: s.enabled !== false,
            }))
          );
        }
        if (!cancelled) {
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
    return () => { cancelled = true; };
  }, []);

  async function save() {
    setStatus('saving');
    setError(null);
    try {
      const layout = { sections };
      const supabase = getSupabaseClient();
      const { data, error: err } = await supabase
        .from('public_page_layouts')
        .upsert({ layout_id: 'public_plan', layout, updated_at: new Date().toISOString() }, { onConflict: 'layout_id' })
        .select('updated_at')
        .single();
      if (err) throw err;
      setSavedAt((data as any)?.updated_at ?? null);
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (e: any) {
      setStatus('error');
      setError(e?.message ?? 'Failed to save layout');
    }
  }

  function toggleEnabled(idx: number) {
    setSections((prev) => prev.map((s, i) => i === idx ? { ...s, enabled: !s.enabled } : s));
  }

  function updateTitle(idx: number, title: string) {
    setSections((prev) => prev.map((s, i) => i === idx ? { ...s, title } : s));
  }

  function moveUp(idx: number) {
    if (idx === 0) return;
    setSections((prev) => {
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  }

  function moveDown(idx: number) {
    setSections((prev) => {
      if (idx === prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  }

  // Drag-and-drop handlers
  function onDragStart(idx: number) { setDragIdx(idx); }
  function onDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    setDragOverIdx(idx);
  }
  function onDrop(idx: number) {
    if (dragIdx === null || dragIdx === idx) { setDragIdx(null); setDragOverIdx(null); return; }
    setSections((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIdx, 1);
      next.splice(idx, 0, moved);
      return next;
    });
    setDragIdx(null);
    setDragOverIdx(null);
  }
  function onDragEnd() { setDragIdx(null); setDragOverIdx(null); }

  const enabledCount = sections.filter((s) => s.enabled).length;

  return (
    <main style={styles.page}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div>
          <h1 style={styles.h1}>Public Page Layout</h1>
          <div style={styles.muted}>
            Controls which sections appear on <code>/p</code> and in what order. Drag rows to reorder.
          </div>
        </div>
        <Link href="/admin" style={styles.secondaryLink}>← Back to Admin</Link>
      </div>

      {status === 'error' && error ? <div style={styles.errorBox}>{error}</div> : null}

      <section style={styles.card}>
        <div style={styles.sectionHeader}>
          <span>Sections</span>
          <span style={{ fontWeight: 400, fontSize: 13, opacity: 0.85 }}>
            {enabledCount} of {sections.length} enabled
          </span>
        </div>

        {status === 'loading' ? (
          <div style={{ padding: 24, textAlign: 'center', opacity: 0.6 }}>Loading…</div>
        ) : (
          <div style={{ display: 'grid', gap: 6 }}>
            {sections.map((s, idx) => {
              const isDragging = dragIdx === idx;
              const isDragOver = dragOverIdx === idx && dragIdx !== idx;
              return (
                <div
                  key={s.key}
                  draggable
                  onDragStart={() => onDragStart(idx)}
                  onDragOver={(e) => onDragOver(e, idx)}
                  onDrop={() => onDrop(idx)}
                  onDragEnd={onDragEnd}
                  style={{
                    ...styles.row,
                    opacity: isDragging ? 0.4 : 1,
                    outline: isDragOver ? `2px solid ${RCS.gold}` : 'none',
                    background: s.enabled ? RCS.white : '#fafafa',
                  }}
                >
                  {/* Drag handle */}
                  <span style={styles.dragHandle} title="Drag to reorder">⠿</span>

                  {/* Enable toggle */}
                  <button
                    type="button"
                    onClick={() => toggleEnabled(idx)}
                    style={{ ...styles.toggleBtn, ...(s.enabled ? styles.toggleOn : styles.toggleOff) }}
                    title={s.enabled ? 'Click to hide' : 'Click to show'}
                  >
                    {s.enabled ? 'On' : 'Off'}
                  </button>

                  {/* Section key label */}
                  <code style={{ ...styles.keyLabel, opacity: s.enabled ? 0.7 : 0.4 }}>{s.key}</code>

                  {/* Title input */}
                  <input
                    type="text"
                    value={s.title}
                    onChange={(e) => updateTitle(idx, e.target.value)}
                    style={{ ...styles.titleInput, opacity: s.enabled ? 1 : 0.5 }}
                    placeholder="Section title"
                  />

                  {/* Up / Down */}
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      type="button"
                      onClick={() => moveUp(idx)}
                      disabled={idx === 0}
                      style={{ ...styles.arrowBtn, opacity: idx === 0 ? 0.25 : 1 }}
                      title="Move up"
                    >↑</button>
                    <button
                      type="button"
                      onClick={() => moveDown(idx)}
                      disabled={idx === sections.length - 1}
                      style={{ ...styles.arrowBtn, opacity: idx === sections.length - 1 ? 0.25 : 1 }}
                      title="Move down"
                    >↓</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ marginTop: 16, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={save}
            disabled={status === 'saving' || status === 'loading'}
            style={status === 'saved' ? styles.savedBtn : styles.primaryBtn}
          >
            {status === 'saving' ? 'Saving…' : status === 'saved' ? '✓ Saved' : 'Save layout'}
          </button>
          {savedAt ? (
            <div style={{ fontSize: 12, opacity: 0.7 }}>
              Last saved: {new Date(savedAt).toLocaleString()}
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: 24, maxWidth: 900, margin: '0 auto', fontFamily: 'system-ui', background: RCS.white, color: RCS.textDark },
  h1: { margin: 0, color: RCS.deepNavy },
  muted: { opacity: 0.75, marginTop: 6, fontSize: 14 },
  card: { border: `1px solid ${RCS.deepNavy}`, borderRadius: 12, padding: 16, background: RCS.white, marginTop: 16 },
  sectionHeader: {
    background: RCS.deepNavy,
    color: RCS.white,
    padding: '8px 12px',
    borderRadius: 8,
    borderBottom: `3px solid ${RCS.gold}`,
    fontWeight: 900,
    marginBottom: 12,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 10px',
    border: `1px solid #e0e0e0`,
    borderRadius: 8,
    cursor: 'default',
    transition: 'opacity 0.15s',
  },
  dragHandle: {
    cursor: 'grab',
    fontSize: 18,
    opacity: 0.4,
    userSelect: 'none',
    lineHeight: 1,
  },
  toggleBtn: {
    minWidth: 42,
    padding: '4px 8px',
    borderRadius: 6,
    border: 'none',
    fontWeight: 900,
    fontSize: 12,
    cursor: 'pointer',
  },
  toggleOn: { background: RCS.deepNavy, color: RCS.white },
  toggleOff: { background: '#ddd', color: '#666' },
  keyLabel: {
    fontSize: 11,
    color: '#666',
    minWidth: 180,
    flexShrink: 0,
  },
  titleInput: {
    flex: 1,
    padding: '5px 8px',
    borderRadius: 6,
    border: `1px solid #ccc`,
    fontSize: 13,
    fontFamily: 'inherit',
    minWidth: 0,
  },
  arrowBtn: {
    padding: '4px 8px',
    borderRadius: 6,
    border: `1px solid #ccc`,
    background: 'transparent',
    cursor: 'pointer',
    fontSize: 14,
    lineHeight: 1,
  },
  primaryBtn: {
    padding: '10px 18px',
    borderRadius: 10,
    border: `1px solid ${RCS.gold}`,
    background: RCS.deepNavy,
    color: RCS.white,
    fontWeight: 900,
    cursor: 'pointer',
    fontSize: 14,
  },
  savedBtn: {
    padding: '10px 18px',
    borderRadius: 10,
    border: `1px solid ${RCS.green}`,
    background: RCS.lightGreen,
    color: RCS.green,
    fontWeight: 900,
    cursor: 'default',
    fontSize: 14,
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
