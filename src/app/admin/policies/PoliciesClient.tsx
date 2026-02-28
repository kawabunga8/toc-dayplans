'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { useDemo } from '@/app/admin/DemoContext';

type Level = 'emerging' | 'developing' | 'proficient' | 'extending';

type StandardRow = {
  id: string;
  subject: string;
  standard_key: string;
  standard_title: string;
  sort_order: number | null;
};

type RubricRow = {
  id: string;
  learning_standard_id: string;
  grade: number;
  level: Level;
  original_text: string;
  edited_text: string | null;
};

type Status = 'loading' | 'idle' | 'saving' | 'error';

const SUBJECTS = ['ADST', 'FA', 'Bible'] as const;

const LEVELS: Array<{ level: Level; label: string }> = [
  { level: 'emerging', label: 'Emerging' },
  { level: 'developing', label: 'Developing' },
  { level: 'proficient', label: 'Proficient' },
  { level: 'extending', label: 'Extending' },
];

export default function PoliciesClient() {
  const { isDemo } = useDemo();
  const searchParams = useSearchParams();

  const returnHref = useMemo(() => {
    const r = searchParams.get('return');
    return r && r.startsWith('/') ? r : null;
  }, [searchParams]);

  const initialSubject = useMemo(() => {
    const s = (searchParams.get('subject') ?? '').trim();
    return s;
  }, [searchParams]);

  const initialGrade = useMemo(() => {
    const g = Number(searchParams.get('grade'));
    return [9, 10, 11, 12].includes(g) ? g : 9;
  }, [searchParams]);

  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);

  const [subjects, setSubjects] = useState<string[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('');

  const [selectedGrade, setSelectedGrade] = useState<number>(initialGrade);

  const [standards, setStandards] = useState<StandardRow[]>([]);
  const [selectedStandardId, setSelectedStandardId] = useState<string>('');

  const [rubrics, setRubrics] = useState<Record<Level, RubricRow | null>>({
    emerging: null,
    developing: null,
    proficient: null,
    extending: null,
  });

  const selectedStandard = useMemo(
    () => standards.find((s) => s.id === selectedStandardId) ?? null,
    [standards, selectedStandardId]
  );

  useEffect(() => {
    void loadSubjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedSubject) return;
    void loadStandards(selectedSubject);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSubject]);

  useEffect(() => {
    if (!selectedStandardId) {
      setRubrics({ emerging: null, developing: null, proficient: null, extending: null });
      return;
    }
    void loadRubrics(selectedStandardId, selectedGrade);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStandardId, selectedGrade]);

  async function loadSubjects() {
    // Subjects are canonical + fixed (must always show all 3 options)
    setStatus('loading');
    setError(null);

    try {
      const fixed = [...SUBJECTS];
      setSubjects(fixed);

      const wanted = initialSubject && fixed.includes(initialSubject as any) ? initialSubject : fixed[0];
      setSelectedSubject((prev) => prev || wanted);

      setStatus('idle');
    } catch (e: any) {
      setStatus('error');
      setError(e?.message ?? 'Failed to load subjects');
    }
  }

  async function loadStandards(subject: string) {
    setStatus('loading');
    setError(null);

    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('learning_standards')
        .select('id,subject,standard_key,standard_title,sort_order')
        .eq('subject', subject)
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('standard_title', { ascending: true });
      if (error) throw error;

      const rows = (data ?? []) as StandardRow[];
      setStandards(rows);
      if (rows.length > 0) setSelectedStandardId((prev) => (prev && rows.some((s) => s.id === prev) ? prev : rows[0].id));
      else setSelectedStandardId('');

      setStatus('idle');
    } catch (e: any) {
      setStatus('error');
      setError(e?.message ?? 'Failed to load standards');
    }
  }

  async function loadRubrics(learningStandardId: string, grade: number) {
    setStatus('loading');
    setError(null);

    try {
      const res = await fetch(
        `/api/admin/learning-standards/rubric?learning_standard_id=${encodeURIComponent(learningStandardId)}&grade=${encodeURIComponent(String(grade))}`
      );
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error ?? 'Failed to load rubric');

      const map: Record<Level, RubricRow | null> = { emerging: null, developing: null, proficient: null, extending: null };
      for (const r of (j?.rows ?? []) as any[]) {
        const lvl = String(r.level) as Level;
        if (lvl in map) map[lvl] = r as RubricRow;
      }
      setRubrics(map);
      setStatus('idle');
    } catch (e: any) {
      setStatus('error');
      setError(e?.message ?? 'Failed to load rubric');
    }
  }

  function displayedText(lvl: Level): string {
    const r = rubrics[lvl];
    return (r?.edited_text ?? r?.original_text ?? '').toString();
  }

  function setDisplayedText(lvl: Level, next: string) {
    setRubrics((prev) => {
      const cur = prev[lvl];
      if (!cur) return prev;
      return { ...prev, [lvl]: { ...cur, edited_text: next } };
    });
  }

  async function saveEdits() {
    if (!selectedStandardId) return;

    setStatus('saving');
    setError(null);

    try {
      const supabase = getSupabaseClient();
      for (const { level } of LEVELS) {
        const row = rubrics[level];
        if (!row) continue;
        const edited = (row.edited_text ?? '').toString();
        const patch = {
          edited_text: edited.trim() && edited !== row.original_text ? edited : null,
          updated_at: new Date().toISOString(),
        };
        const { error } = await supabase.from('learning_standard_rubrics').update(patch).eq('id', row.id);
        if (error) throw error;
      }

      await loadRubrics(selectedStandardId, selectedGrade);
      setStatus('idle');
    } catch (e: any) {
      setStatus('error');
      setError(e?.message ?? 'Failed to save');
    }
  }

  async function resetToOriginal() {
    if (!selectedStandardId) return;
    const ok = window.confirm('Reset all 4 levels for this grade to the original text?');
    if (!ok) return;

    setStatus('saving');
    setError(null);

    try {
      const supabase = getSupabaseClient();
      const ids = LEVELS.map(({ level }) => rubrics[level]?.id).filter(Boolean) as string[];
      if (ids.length > 0) {
        const { error } = await supabase
          .from('learning_standard_rubrics')
          .update({ edited_text: null, updated_at: new Date().toISOString() })
          .in('id', ids);
        if (error) throw error;
      }

      await loadRubrics(selectedStandardId, selectedGrade);
      setStatus('idle');
    } catch (e: any) {
      setStatus('error');
      setError(e?.message ?? 'Failed to reset');
    }
  }

  return (
    <main style={styles.page}>
      <h1 style={styles.h1}>Policies</h1>
      <p style={styles.muted}>Learning standards lookup (Subject → Standard → Grade). Editable overrides with Reset to original.</p>

      <section style={styles.card}>
        <div style={styles.sectionHeader}>Learning Standards</div>

        {returnHref ? (
          <div style={{ marginBottom: 12 }}>
            <a href={returnHref} style={styles.secondaryBtn}>
              ← Back
            </a>
          </div>
        ) : null}

        {status === 'error' && error ? <div style={styles.errorBox}>{error}</div> : null}

        {subjects.length === 0 ? (
          <div style={{ opacity: 0.85 }}>No learning standards found yet. Seed learning_standards + learning_standard_rubrics.</div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <label style={styles.fieldInline}>
                <div style={styles.label}>Subject</div>
                <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} style={styles.input}>
                  {subjects.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ ...styles.fieldInline, minWidth: 320, flex: 1 }}>
                <div style={styles.label}>Learning Standard</div>
                <select value={selectedStandardId} onChange={(e) => setSelectedStandardId(e.target.value)} style={styles.input}>
                  {standards.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.standard_title}
                    </option>
                  ))}
                </select>
              </label>

              <label style={styles.fieldInline}>
                <div style={styles.label}>Grade</div>
                <select value={selectedGrade} onChange={(e) => setSelectedGrade(Number(e.target.value))} style={styles.input}>
                  {[9, 10, 11, 12].map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </label>

              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                <button onClick={saveEdits} style={styles.primaryBtn} disabled={isDemo || status !== 'idle' || !selectedStandardId}>
                  {status === 'saving' ? 'Saving…' : 'Save'}
                </button>
                <button onClick={resetToOriginal} style={styles.secondaryBtn} disabled={isDemo || status !== 'idle' || !selectedStandardId}>
                  Reset to original
                </button>
              </div>
            </div>

            {selectedStandard ? (
              <div style={styles.callout}>
                <div style={{ fontWeight: 900, color: RCS.deepNavy }}>
                  {selectedStandard.subject} Grade {selectedGrade} — {selectedStandard.standard_title}
                </div>
                <div style={{ fontSize: 12, opacity: 0.85 }}>Key: {selectedStandard.standard_key}</div>
              </div>
            ) : null}

            <div style={{ display: 'grid', gap: 12 }}>
              {LEVELS.map(({ level, label }) => (
                <div key={level} style={styles.levelCard}>
                  <div style={styles.levelHeader}>{label}</div>
                  {rubrics[level] ? (
                    <textarea
                      value={displayedText(level)}
                      onChange={(e) => setDisplayedText(level, e.target.value)}
                      rows={7}
                      style={styles.textarea}
                      disabled={isDemo || status !== 'idle'}
                    />
                  ) : (
                    <div style={{ opacity: 0.75 }}>—</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
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
  textarea: { width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${RCS.deepNavy}`, background: RCS.white, color: RCS.textDark, fontFamily: 'inherit' },
  primaryBtn: { padding: '10px 12px', borderRadius: 10, border: `1px solid ${RCS.gold}`, background: RCS.deepNavy, color: RCS.white, cursor: 'pointer', fontWeight: 900 },
  secondaryBtn: { padding: '10px 12px', borderRadius: 10, border: `1px solid ${RCS.gold}`, background: 'transparent', color: RCS.deepNavy, cursor: 'pointer', fontWeight: 900, textDecoration: 'none', display: 'inline-block' },
  errorBox: { marginTop: 10, padding: 12, borderRadius: 10, border: '1px solid #991b1b', background: '#FEE2E2', color: '#7F1D1D' },
  callout: { border: `1px solid ${RCS.gold}`, borderRadius: 12, padding: 12, background: RCS.paleGold },
  levelCard: { border: `1px solid ${RCS.deepNavy}`, borderRadius: 12, padding: 12, background: RCS.lightBlue },
  levelHeader: { fontWeight: 900, color: RCS.deepNavy, marginBottom: 8 },
};
