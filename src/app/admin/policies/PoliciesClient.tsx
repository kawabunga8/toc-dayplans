'use client';

import { useEffect, useMemo, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { useDemo } from '@/app/admin/DemoContext';

type Level = 'emerging' | 'developing' | 'proficient' | 'extending';

type StandardRow = {
  id: string;
  subject: string;
  grade: number;
  standard_key: string;
  standard_title: string;
};

type LevelRow = {
  id: string;
  learning_standard_id: string;
  level: Level;
  original_text: string;
  edited_text: string | null;
};

type Status = 'loading' | 'idle' | 'saving' | 'error';

const LEVELS: Array<{ level: Level; label: string }> = [
  { level: 'emerging', label: 'Emerging' },
  { level: 'developing', label: 'Developing' },
  { level: 'proficient', label: 'Proficient' },
  { level: 'extending', label: 'Extending' },
];

export default function PoliciesClient() {
  const { isDemo } = useDemo();

  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);

  const [subjects, setSubjects] = useState<string[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('');

  const [grades, setGrades] = useState<number[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null);

  const [standards, setStandards] = useState<StandardRow[]>([]);
  const [selectedStandardId, setSelectedStandardId] = useState<string>('');

  const [levels, setLevels] = useState<Record<Level, LevelRow | null>>({
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
    void loadGrades(selectedSubject);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSubject]);

  useEffect(() => {
    if (!selectedSubject || !selectedGrade) return;
    void loadStandards(selectedSubject, selectedGrade);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSubject, selectedGrade]);

  useEffect(() => {
    if (!selectedStandardId) {
      setLevels({ emerging: null, developing: null, proficient: null, extending: null });
      return;
    }
    void loadLevels(selectedStandardId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStandardId]);

  async function loadSubjects() {
    setStatus('loading');
    setError(null);

    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('learning_standards')
        .select('subject')
        .order('subject', { ascending: true });
      if (error) throw error;

      const distinct = Array.from(new Set((data ?? []).map((r: any) => String(r.subject ?? '').trim()).filter(Boolean)));
      setSubjects(distinct);

      // Auto-select first subject
      if (distinct.length > 0) setSelectedSubject((prev) => prev || distinct[0]);
      else setSelectedSubject('');

      setStatus('idle');
    } catch (e: any) {
      setStatus('error');
      setError(e?.message ?? 'Failed to load subjects');
    }
  }

  async function loadGrades(subject: string) {
    setStatus('loading');
    setError(null);

    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('learning_standards')
        .select('grade')
        .eq('subject', subject)
        .order('grade', { ascending: true });
      if (error) throw error;

      const distinct = Array.from(new Set((data ?? []).map((r: any) => Number(r.grade)).filter((n) => Number.isFinite(n))));
      setGrades(distinct);

      if (distinct.length > 0) setSelectedGrade((prev) => (prev && distinct.includes(prev) ? prev : distinct[0]));
      else setSelectedGrade(null);

      setSelectedStandardId('');
      setStandards([]);
      setLevels({ emerging: null, developing: null, proficient: null, extending: null });

      setStatus('idle');
    } catch (e: any) {
      setStatus('error');
      setError(e?.message ?? 'Failed to load grades');
    }
  }

  async function loadStandards(subject: string, grade: number) {
    setStatus('loading');
    setError(null);

    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('learning_standards')
        .select('id,subject,grade,standard_key,standard_title')
        .eq('subject', subject)
        .eq('grade', grade)
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

  async function loadLevels(learningStandardId: string) {
    setStatus('loading');
    setError(null);

    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('learning_standard_levels')
        .select('id,learning_standard_id,level,original_text,edited_text')
        .eq('learning_standard_id', learningStandardId);
      if (error) throw error;

      const map: Record<Level, LevelRow | null> = { emerging: null, developing: null, proficient: null, extending: null };
      for (const r of data ?? []) {
        const lvl = String((r as any).level) as Level;
        if (lvl in map) map[lvl] = r as any;
      }
      setLevels(map);
      setStatus('idle');
    } catch (e: any) {
      setStatus('error');
      setError(e?.message ?? 'Failed to load level text');
    }
  }

  function displayedText(lvl: Level): string {
    const r = levels[lvl];
    return (r?.edited_text ?? r?.original_text ?? '').toString();
  }

  function setDisplayedText(lvl: Level, next: string) {
    setLevels((prev) => {
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
        const row = levels[level];
        if (!row) continue;
        const edited = (row.edited_text ?? '').toString();
        // If edited matches original, store null to keep the DB clean
        const patch = {
          edited_text: edited.trim() && edited !== row.original_text ? edited : null,
          updated_at: new Date().toISOString(),
        };
        const { error } = await supabase.from('learning_standard_levels').update(patch).eq('id', row.id);
        if (error) throw error;
      }
      await loadLevels(selectedStandardId);
      setStatus('idle');
    } catch (e: any) {
      setStatus('error');
      setError(e?.message ?? 'Failed to save');
    }
  }

  async function resetToOriginal() {
    if (!selectedStandardId) return;
    const ok = window.confirm('Reset all levels (Emerging/Developing/Proficient/Extending) to the original text?');
    if (!ok) return;

    setStatus('saving');
    setError(null);

    try {
      const supabase = getSupabaseClient();
      const ids = LEVELS.map(({ level }) => levels[level]?.id).filter(Boolean) as string[];
      if (ids.length > 0) {
        const { error } = await supabase
          .from('learning_standard_levels')
          .update({ edited_text: null, updated_at: new Date().toISOString() })
          .in('id', ids);
        if (error) throw error;
      }
      await loadLevels(selectedStandardId);
      setStatus('idle');
    } catch (e: any) {
      setStatus('error');
      setError(e?.message ?? 'Failed to reset');
    }
  }

  return (
    <main style={styles.page}>
      <h1 style={styles.h1}>Policies</h1>
      <p style={styles.muted}>
        Learning standards lookup (filter by Subject → Grade → Standard). Editable overrides with a Reset to original button.
      </p>

      <section style={styles.card}>
        <div style={styles.sectionHeader}>Learning Standards</div>

        {status === 'error' && error ? <div style={styles.errorBox}>{error}</div> : null}

        {subjects.length === 0 ? (
          <div style={{ opacity: 0.85 }}>No learning standards found yet. Import the PDFs into the learning standards tables.</div>
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

              <label style={styles.fieldInline}>
                <div style={styles.label}>Grade</div>
                <select
                  value={selectedGrade ?? ''}
                  onChange={(e) => setSelectedGrade(e.target.value ? Number(e.target.value) : null)}
                  style={styles.input}
                >
                  {grades.map((g) => (
                    <option key={g} value={g}>
                      {g}
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
                  {selectedStandard.subject} Grade {selectedStandard.grade} — {selectedStandard.standard_title}
                </div>
                <div style={{ fontSize: 12, opacity: 0.85 }}>Key: {selectedStandard.standard_key}</div>
              </div>
            ) : null}

            <div style={{ display: 'grid', gap: 12 }}>
              {LEVELS.map(({ level, label }) => (
                <div key={level} style={styles.levelCard}>
                  <div style={styles.levelHeader}>{label}</div>
                  {levels[level] ? (
                    <textarea
                      value={displayedText(level)}
                      onChange={(e) => setDisplayedText(level, e.target.value)}
                      rows={6}
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
  lightGray: '#F5F5F5',
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
  secondaryBtn: { padding: '10px 12px', borderRadius: 10, border: `1px solid ${RCS.gold}`, background: 'transparent', color: RCS.deepNavy, cursor: 'pointer', fontWeight: 900 },
  errorBox: { marginTop: 10, padding: 12, borderRadius: 10, border: '1px solid #991b1b', background: '#FEE2E2', color: '#7F1D1D' },
  callout: { border: `1px solid ${RCS.gold}`, borderRadius: 12, padding: 12, background: RCS.paleGold },
  levelCard: { border: `1px solid ${RCS.deepNavy}`, borderRadius: 12, padding: 12, background: RCS.lightBlue },
  levelHeader: { fontWeight: 900, color: RCS.deepNavy, marginBottom: 8 },
};
