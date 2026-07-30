'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { useDemo } from '@/app/admin/DemoContext';

// ── Types ────────────────────────────────────────────────────────────────────

type StudentRow = {
  id: string;
  first_name: string;
  last_name: string;
  photo_url: string | null;
  grade_year: number | null;
  gender: string | null;
  student_number: string | null;
};

type ClassRow = { id: string; name: string; block_label: string | null };

type NoteRow = {
  id: string;
  student_id: string;
  note: string;
  created_at: string;
  updated_at: string;
};

type MarkRow = {
  id: string;
  student_id: string;
  class_id: string | null;
  subject: string;
  mark: string;
  quarter: number | null;
  note: string | null;
  created_at: string;
};

type Status = 'loading' | 'idle' | 'working' | 'error';
type Panel = 'info' | 'notes' | 'marks';

const GRADE_YEARS = [9, 10, 11, 12];
const GENDERS = ['male', 'female', 'non-binary'];
const QUARTERS = [1, 2, 3, 4];

// ── Main component ────────────────────────────────────────────────────────────

export default function StudentsClient() {
  const { isDemo } = useDemo();

  // Student list state
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [search, setSearch] = useState('');
  const [filterGrade, setFilterGrade] = useState<number | 'all'>('all');

  // Selected student + panel
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<Panel>('info');

  // Add new student form
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<Omit<StudentRow, 'id' | 'photo_url'>>({
    first_name: '', last_name: '', grade_year: null, gender: null, student_number: null,
  });
  const [addStatus, setAddStatus] = useState<'idle' | 'working' | 'error'>('idle');
  const [addError, setAddError] = useState<string | null>(null);

  // Edit student form
  const [editForm, setEditForm] = useState<Omit<StudentRow, 'id' | 'photo_url'> | null>(null);
  const [editStatus, setEditStatus] = useState<'idle' | 'working' | 'error'>('idle');
  const [editError, setEditError] = useState<string | null>(null);

  // Notes
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [notesStatus, setNotesStatus] = useState<'idle' | 'loading' | 'working' | 'error'>('idle');
  const [notesError, setNotesError] = useState<string | null>(null);
  const [newNote, setNewNote] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState('');

  // Marks
  const [marks, setMarks] = useState<MarkRow[]>([]);
  const [marksStatus, setMarksStatus] = useState<'idle' | 'loading' | 'working' | 'error'>('idle');
  const [marksError, setMarksError] = useState<string | null>(null);
  const [showAddMark, setShowAddMark] = useState(false);
  const [markForm, setMarkForm] = useState({ subject: '', mark: '', quarter: '' as string, class_id: '', note: '' });

  const detailRef = useRef<HTMLDivElement>(null);

  // ── Data loading ──────────────────────────────────────────────────────────

  async function loadAll() {
    setStatus('loading');
    setError(null);
    try {
      const supabase = getSupabaseClient();
      const [studRes, clsRes] = await Promise.all([
        supabase
          .from('students')
          .select('id,first_name,last_name,photo_url,grade_year,gender,student_number')
          .order('last_name', { ascending: true })
          .order('first_name', { ascending: true }),
        supabase
          .from('classes')
          .select('id,name,block_label')
          .order('sort_order', { ascending: true, nullsFirst: false }),
      ]);
      if (studRes.error) throw studRes.error;
      if (clsRes.error) throw clsRes.error;
      setStudents((studRes.data ?? []) as StudentRow[]);
      setClasses((clsRes.data ?? []) as ClassRow[]);
      setStatus('idle');
    } catch (e: any) {
      setStatus('error');
      setError(humanizeError(e));
    }
  }

  async function loadNotes(studentId: string) {
    setNotesStatus('loading');
    setNotesError(null);
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('student_notes')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setNotes((data ?? []) as NoteRow[]);
      setNotesStatus('idle');
    } catch (e: any) {
      setNotesStatus('error');
      setNotesError(humanizeError(e));
    }
  }

  async function loadMarks(studentId: string) {
    setMarksStatus('loading');
    setMarksError(null);
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('student_marks')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setMarks((data ?? []) as MarkRow[]);
      setMarksStatus('idle');
    } catch (e: any) {
      setMarksStatus('error');
      setMarksError(humanizeError(e));
    }
  }

  useEffect(() => { void loadAll(); }, []);

  // When a student is selected, load their notes + marks and prime the edit form
  useEffect(() => {
    if (!selectedId) return;
    const s = students.find((s) => s.id === selectedId);
    if (!s) return;
    setEditForm({ first_name: s.first_name, last_name: s.last_name, grade_year: s.grade_year, gender: s.gender, student_number: s.student_number });
    setEditStatus('idle');
    setEditError(null);
    void loadNotes(selectedId);
    void loadMarks(selectedId);
    detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // ── Filtered students ─────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      const matchGrade = filterGrade === 'all' || s.grade_year === filterGrade;
      if (!matchGrade) return false;
      if (!q) return true;
      return (
        s.first_name.toLowerCase().includes(q) ||
        s.last_name.toLowerCase().includes(q) ||
        (s.student_number ?? '').toLowerCase().includes(q)
      );
    });
  }, [students, search, filterGrade]);

  const selectedStudent = useMemo(() => students.find((s) => s.id === selectedId) ?? null, [students, selectedId]);

  // ── Mutations ─────────────────────────────────────────────────────────────

  async function addStudent() {
    if (!addForm.first_name.trim() || !addForm.last_name.trim()) {
      setAddError('First and last name are required.');
      return;
    }
    setAddStatus('working');
    setAddError(null);
    try {
      const supabase = getSupabaseClient();
      const payload: any = {
        first_name: addForm.first_name.trim(),
        last_name: addForm.last_name.trim(),
        grade_year: addForm.grade_year ?? null,
        gender: addForm.gender ?? null,
        student_number: addForm.student_number?.trim() || null,
      };
      const { data, error } = await supabase.from('students').insert(payload).select().single();
      if (error) throw error;
      setStudents((prev) => {
        const next = [...prev, data as StudentRow];
        next.sort((a, b) => a.last_name.localeCompare(b.last_name) || a.first_name.localeCompare(b.first_name));
        return next;
      });
      setAddForm({ first_name: '', last_name: '', grade_year: null, gender: null, student_number: null });
      setShowAddForm(false);
      setAddStatus('idle');
      setSelectedId((data as StudentRow).id);
      setActivePanel('info');
    } catch (e: any) {
      setAddStatus('error');
      setAddError(humanizeError(e));
    }
  }

  async function saveEdit() {
    if (!selectedId || !editForm) return;
    if (!editForm.first_name.trim() || !editForm.last_name.trim()) {
      setEditError('First and last name are required.');
      return;
    }
    setEditStatus('working');
    setEditError(null);
    try {
      const supabase = getSupabaseClient();
      const payload: any = {
        first_name: editForm.first_name.trim(),
        last_name: editForm.last_name.trim(),
        grade_year: editForm.grade_year ?? null,
        gender: editForm.gender ?? null,
        student_number: editForm.student_number?.trim() || null,
      };
      const { error } = await supabase.from('students').update(payload).eq('id', selectedId);
      if (error) throw error;
      setStudents((prev) => prev.map((s) =>
        s.id === selectedId ? { ...s, ...payload } : s
      ));
      setEditStatus('idle');
    } catch (e: any) {
      setEditStatus('error');
      setEditError(humanizeError(e));
    }
  }

  async function deleteStudent(id: string, name: string) {
    if (!window.confirm(`Delete ${name}? This will remove them from all class lists and cannot be undone.`)) return;
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.from('students').delete().eq('id', id);
      if (error) throw error;
      setStudents((prev) => prev.filter((s) => s.id !== id));
      if (selectedId === id) setSelectedId(null);
    } catch (e: any) {
      setError(humanizeError(e));
    }
  }

  // Notes mutations

  async function addNote() {
    if (!selectedId || !newNote.trim()) return;
    setNotesStatus('working');
    setNotesError(null);
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('student_notes')
        .insert({ student_id: selectedId, note: newNote.trim() })
        .select()
        .single();
      if (error) throw error;
      setNotes((prev) => [data as NoteRow, ...prev]);
      setNewNote('');
      setNotesStatus('idle');
    } catch (e: any) {
      setNotesStatus('error');
      setNotesError(humanizeError(e));
    }
  }

  async function saveNote(noteId: string) {
    if (!editingNoteText.trim()) return;
    setNotesStatus('working');
    setNotesError(null);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('student_notes')
        .update({ note: editingNoteText.trim(), updated_at: new Date().toISOString() })
        .eq('id', noteId);
      if (error) throw error;
      setNotes((prev) => prev.map((n) => n.id === noteId ? { ...n, note: editingNoteText.trim() } : n));
      setEditingNoteId(null);
      setEditingNoteText('');
      setNotesStatus('idle');
    } catch (e: any) {
      setNotesStatus('error');
      setNotesError(humanizeError(e));
    }
  }

  async function deleteNote(noteId: string) {
    if (!window.confirm('Delete this note?')) return;
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.from('student_notes').delete().eq('id', noteId);
      if (error) throw error;
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    } catch (e: any) {
      setNotesError(humanizeError(e));
    }
  }

  // Marks mutations

  async function addMark() {
    if (!selectedId || !markForm.subject.trim() || !markForm.mark.trim()) return;
    setMarksStatus('working');
    setMarksError(null);
    try {
      const supabase = getSupabaseClient();
      const payload: any = {
        student_id: selectedId,
        subject: markForm.subject.trim(),
        mark: markForm.mark.trim(),
        quarter: markForm.quarter ? parseInt(markForm.quarter) : null,
        class_id: markForm.class_id || null,
        note: markForm.note.trim() || null,
      };
      const { data, error } = await supabase.from('student_marks').insert(payload).select().single();
      if (error) throw error;
      setMarks((prev) => [data as MarkRow, ...prev]);
      setMarkForm({ subject: '', mark: '', quarter: '', class_id: '', note: '' });
      setShowAddMark(false);
      setMarksStatus('idle');
    } catch (e: any) {
      setMarksStatus('error');
      setMarksError(humanizeError(e));
    }
  }

  async function deleteMark(markId: string) {
    if (!window.confirm('Delete this mark?')) return;
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.from('student_marks').delete().eq('id', markId);
      if (error) throw error;
      setMarks((prev) => prev.filter((m) => m.id !== markId));
    } catch (e: any) {
      setMarksError(humanizeError(e));
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <main style={styles.page}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={styles.h1}>Students</h1>
          <p style={styles.muted}>
            Central student directory — shared across all apps. Changes here are reflected everywhere.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={loadAll} disabled={status === 'loading'} style={styles.secondaryBtn}>
            Refresh
          </button>
          {!isDemo && (
            <button onClick={() => { setShowAddForm(!showAddForm); setAddError(null); }} style={styles.primaryBtn}>
              {showAddForm ? 'Cancel' : '+ New Student'}
            </button>
          )}
        </div>
      </div>

      {error && <div style={styles.errorBox}>{error}</div>}

      {/* ── Add student form ── */}
      {showAddForm && (
        <section style={{ ...styles.card, borderColor: RCS.gold, background: RCS.paleGold }}>
          <div style={styles.sectionHeader}>New Student</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
            <label style={styles.fieldWrap}>
              <span style={styles.label}>First name *</span>
              <input value={addForm.first_name} onChange={(e) => setAddForm((p) => ({ ...p, first_name: e.target.value }))} style={styles.input} placeholder="First name" />
            </label>
            <label style={styles.fieldWrap}>
              <span style={styles.label}>Last name *</span>
              <input value={addForm.last_name} onChange={(e) => setAddForm((p) => ({ ...p, last_name: e.target.value }))} style={styles.input} placeholder="Last name" />
            </label>
            <label style={styles.fieldWrap}>
              <span style={styles.label}>Student #</span>
              <input value={addForm.student_number ?? ''} onChange={(e) => setAddForm((p) => ({ ...p, student_number: e.target.value }))} style={styles.input} placeholder="e.g. 10234" />
            </label>
            <label style={styles.fieldWrap}>
              <span style={styles.label}>Grade year</span>
              <select value={addForm.grade_year ?? ''} onChange={(e) => setAddForm((p) => ({ ...p, grade_year: e.target.value ? parseInt(e.target.value) : null }))} style={styles.input}>
                <option value="">— select —</option>
                {GRADE_YEARS.map((g) => <option key={g} value={g}>Grade {g}</option>)}
              </select>
            </label>
            <label style={styles.fieldWrap}>
              <span style={styles.label}>Gender</span>
              <select value={addForm.gender ?? ''} onChange={(e) => setAddForm((p) => ({ ...p, gender: e.target.value || null }))} style={styles.input}>
                <option value="">— not set —</option>
                {GENDERS.map((g) => <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>)}
              </select>
            </label>
          </div>
          {addError && <div style={{ ...styles.errorBox, marginTop: 10 }}>{addError}</div>}
          <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
            <button onClick={addStudent} disabled={addStatus === 'working'} style={styles.primaryBtn}>
              {addStatus === 'working' ? 'Saving…' : 'Add Student'}
            </button>
            <button onClick={() => { setShowAddForm(false); setAddError(null); }} style={styles.secondaryBtn}>Cancel</button>
          </div>
        </section>
      )}

      {/* ── Search + filter ── */}
      <section style={styles.card}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or student #…"
            style={{ ...styles.input, flex: 1, minWidth: 200 }}
          />
          <select value={filterGrade === 'all' ? 'all' : String(filterGrade)} onChange={(e) => setFilterGrade(e.target.value === 'all' ? 'all' : parseInt(e.target.value))} style={{ ...styles.input, minWidth: 130 }}>
            <option value="all">All grades</option>
            {GRADE_YEARS.map((g) => <option key={g} value={g}>Grade {g}</option>)}
          </select>
          <span style={{ fontSize: 13, opacity: 0.75, whiteSpace: 'nowrap' }}>
            {status === 'loading' ? 'Loading…' : `${filtered.length} of ${students.length} students`}
          </span>
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: selectedId ? '1fr 1fr' : '1fr', gap: 16, alignItems: 'start' }}>

        {/* ── Student list ── */}
        <section style={styles.card}>
          <div style={styles.sectionHeader}>Student Directory</div>
          {status === 'loading' && <div style={{ padding: 12, opacity: 0.7 }}>Loading…</div>}
          {status !== 'loading' && filtered.length === 0 && (
            <div style={{ padding: 12, opacity: 0.7 }}>
              {students.length === 0 ? 'No students yet. Add one above.' : 'No students match your search.'}
            </div>
          )}
          <div style={{ display: 'grid', gap: 6 }}>
            {filtered.map((s, i) => {
              const isSelected = s.id === selectedId;
              return (
                <div
                  key={s.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: isSelected ? `2px solid ${RCS.gold}` : `1px solid ${i % 2 === 0 ? RCS.deepNavy : '#c8d8e8'}`,
                    background: isSelected ? RCS.paleGold : (i % 2 === 0 ? RCS.white : '#f5f8fb'),
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    setSelectedId(s.id === selectedId ? null : s.id);
                    setActivePanel('info');
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 900, color: RCS.deepNavy }}>
                      {s.last_name}, {s.first_name}
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>
                      {[s.student_number ? `#${s.student_number}` : null, s.grade_year ? `Grade ${s.grade_year}` : null, s.gender ?? null].filter(Boolean).join(' · ')}
                      {!s.student_number && !s.grade_year && !s.gender ? 'No additional info' : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    {!isDemo && (
                      <button
                        onClick={(e) => { e.stopPropagation(); void deleteStudent(s.id, `${s.first_name} ${s.last_name}`); }}
                        style={styles.dangerBtnSm}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Student detail panel ── */}
        {selectedStudent && (
          <section ref={detailRef} style={styles.card}>
            <div style={{ ...styles.sectionHeader, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{selectedStudent.last_name}, {selectedStudent.first_name}</span>
              <button onClick={() => setSelectedId(null)} style={{ background: 'none', border: 'none', color: RCS.white, cursor: 'pointer', fontWeight: 900, fontSize: 16 }}>✕</button>
            </div>

            {/* Panel tabs */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 14, borderBottom: `2px solid ${RCS.lightBlue}`, paddingBottom: 8 }}>
              {(['info', 'notes', 'marks'] as Panel[]).map((p) => (
                <button key={p} onClick={() => setActivePanel(p)} style={{
                  padding: '6px 14px', borderRadius: 8,
                  border: activePanel === p ? `1px solid ${RCS.gold}` : `1px solid transparent`,
                  background: activePanel === p ? RCS.paleGold : 'transparent',
                  color: activePanel === p ? RCS.deepNavy : RCS.midBlue,
                  fontWeight: 900, cursor: 'pointer', textTransform: 'capitalize',
                }}>
                  {p}{p === 'notes' ? ` (${notes.length})` : ''}{p === 'marks' ? ` (${marks.length})` : ''}
                </button>
              ))}
            </div>

            {/* ── Info panel ── */}
            {activePanel === 'info' && editForm && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12 }}>
                  <label style={styles.fieldWrap}>
                    <span style={styles.label}>First name</span>
                    <input value={editForm.first_name} onChange={(e) => setEditForm((p) => p ? { ...p, first_name: e.target.value } : p)} style={styles.input} disabled={isDemo} />
                  </label>
                  <label style={styles.fieldWrap}>
                    <span style={styles.label}>Last name</span>
                    <input value={editForm.last_name} onChange={(e) => setEditForm((p) => p ? { ...p, last_name: e.target.value } : p)} style={styles.input} disabled={isDemo} />
                  </label>
                  <label style={styles.fieldWrap}>
                    <span style={styles.label}>Student #</span>
                    <input value={editForm.student_number ?? ''} onChange={(e) => setEditForm((p) => p ? { ...p, student_number: e.target.value } : p)} style={styles.input} placeholder="Optional" disabled={isDemo} />
                  </label>
                  <label style={styles.fieldWrap}>
                    <span style={styles.label}>Grade year</span>
                    <select value={editForm.grade_year ?? ''} onChange={(e) => setEditForm((p) => p ? { ...p, grade_year: e.target.value ? parseInt(e.target.value) : null } : p)} style={styles.input} disabled={isDemo}>
                      <option value="">— not set —</option>
                      {GRADE_YEARS.map((g) => <option key={g} value={g}>Grade {g}</option>)}
                    </select>
                  </label>
                  <label style={styles.fieldWrap}>
                    <span style={styles.label}>Gender</span>
                    <select value={editForm.gender ?? ''} onChange={(e) => setEditForm((p) => p ? { ...p, gender: e.target.value || null } : p)} style={styles.input} disabled={isDemo}>
                      <option value="">— not set —</option>
                      {GENDERS.map((g) => <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>)}
                    </select>
                  </label>
                </div>
                {editError && <div style={{ ...styles.errorBox, marginTop: 10 }}>{editError}</div>}
                {!isDemo && (
                  <button onClick={saveEdit} disabled={editStatus === 'working'} style={{ ...styles.primaryBtn, marginTop: 14 }}>
                    {editStatus === 'working' ? 'Saving…' : 'Save Changes'}
                  </button>
                )}
                {editStatus === 'idle' && !editError && (
                  <div style={{ marginTop: 8, fontSize: 12, color: RCS.midBlue, opacity: 0.8 }}>
                    Changes are shared with all connected apps.
                  </div>
                )}
              </div>
            )}

            {/* ── Notes panel ── */}
            {activePanel === 'notes' && (
              <div>
                {!isDemo && (
                  <div style={{ marginBottom: 14 }}>
                    <textarea
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Add a note about this student…"
                      rows={3}
                      style={{ ...styles.input, width: '100%', resize: 'vertical', boxSizing: 'border-box' }}
                    />
                    <button
                      onClick={addNote}
                      disabled={!newNote.trim() || notesStatus === 'working'}
                      style={{ ...styles.primaryBtn, marginTop: 8 }}
                    >
                      {notesStatus === 'working' ? 'Saving…' : 'Add Note'}
                    </button>
                  </div>
                )}
                {notesError && <div style={styles.errorBox}>{notesError}</div>}
                {notesStatus === 'loading' && <div style={{ opacity: 0.7 }}>Loading notes…</div>}
                {notes.length === 0 && notesStatus !== 'loading' && (
                  <div style={{ opacity: 0.7, fontSize: 13 }}>No notes yet.</div>
                )}
                <div style={{ display: 'grid', gap: 8 }}>
                  {notes.map((n) => (
                    <div key={n.id} style={styles.noteCard}>
                      {editingNoteId === n.id ? (
                        <div>
                          <textarea
                            value={editingNoteText}
                            onChange={(e) => setEditingNoteText(e.target.value)}
                            rows={3}
                            style={{ ...styles.input, width: '100%', resize: 'vertical', boxSizing: 'border-box' }}
                          />
                          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                            <button onClick={() => saveNote(n.id)} disabled={notesStatus === 'working'} style={styles.primaryBtn}>Save</button>
                            <button onClick={() => { setEditingNoteId(null); setEditingNoteText(''); }} style={styles.secondaryBtn}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                          <div>
                            <div style={{ whiteSpace: 'pre-wrap', fontSize: 14 }}>{n.note}</div>
                            <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>
                              {new Date(n.created_at).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' })}
                              {n.updated_at !== n.created_at ? ' (edited)' : ''}
                            </div>
                          </div>
                          {!isDemo && (
                            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                              <button onClick={() => { setEditingNoteId(n.id); setEditingNoteText(n.note); }} style={styles.editBtnSm}>Edit</button>
                              <button onClick={() => deleteNote(n.id)} style={styles.dangerBtnSm}>Del</button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Marks panel ── */}
            {activePanel === 'marks' && (
              <div>
                {!isDemo && !showAddMark && (
                  <button onClick={() => setShowAddMark(true)} style={{ ...styles.primaryBtn, marginBottom: 14 }}>
                    + Add Mark
                  </button>
                )}
                {showAddMark && !isDemo && (
                  <div style={{ ...styles.noteCard, marginBottom: 14 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10, marginBottom: 10 }}>
                      <label style={styles.fieldWrap}>
                        <span style={styles.label}>Subject *</span>
                        <input value={markForm.subject} onChange={(e) => setMarkForm((p) => ({ ...p, subject: e.target.value }))} style={styles.input} placeholder="e.g. Math 9" />
                      </label>
                      <label style={styles.fieldWrap}>
                        <span style={styles.label}>Mark *</span>
                        <input value={markForm.mark} onChange={(e) => setMarkForm((p) => ({ ...p, mark: e.target.value }))} style={styles.input} placeholder="e.g. 87% or A" />
                      </label>
                      <label style={styles.fieldWrap}>
                        <span style={styles.label}>Quarter</span>
                        <select value={markForm.quarter} onChange={(e) => setMarkForm((p) => ({ ...p, quarter: e.target.value }))} style={styles.input}>
                          <option value="">—</option>
                          {QUARTERS.map((q) => <option key={q} value={q}>Q{q}</option>)}
                        </select>
                      </label>
                      <label style={styles.fieldWrap}>
                        <span style={styles.label}>Class (optional)</span>
                        <select value={markForm.class_id} onChange={(e) => setMarkForm((p) => ({ ...p, class_id: e.target.value }))} style={styles.input}>
                          <option value="">— none —</option>
                          {classes.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.block_label ? `Block ${c.block_label} – ` : ''}{c.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label style={{ ...styles.fieldWrap, gridColumn: '1 / -1' }}>
                        <span style={styles.label}>Note (optional)</span>
                        <input value={markForm.note} onChange={(e) => setMarkForm((p) => ({ ...p, note: e.target.value }))} style={styles.input} placeholder="Any extra context…" />
                      </label>
                    </div>
                    {marksError && <div style={styles.errorBox}>{marksError}</div>}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={addMark} disabled={!markForm.subject.trim() || !markForm.mark.trim() || marksStatus === 'working'} style={styles.primaryBtn}>
                        {marksStatus === 'working' ? 'Saving…' : 'Save Mark'}
                      </button>
                      <button onClick={() => { setShowAddMark(false); setMarkForm({ subject: '', mark: '', quarter: '', class_id: '', note: '' }); }} style={styles.secondaryBtn}>Cancel</button>
                    </div>
                  </div>
                )}
                {marksStatus === 'loading' && <div style={{ opacity: 0.7 }}>Loading marks…</div>}
                {marks.length === 0 && marksStatus !== 'loading' && (
                  <div style={{ opacity: 0.7, fontSize: 13 }}>No marks recorded yet.</div>
                )}
                <div style={{ display: 'grid', gap: 8 }}>
                  {marks.map((m) => {
                    const cls = m.class_id ? classes.find((c) => c.id === m.class_id) : null;
                    return (
                      <div key={m.id} style={{ ...styles.noteCard, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                        <div>
                          <div style={{ fontWeight: 900, color: RCS.deepNavy }}>
                            {m.subject} — <span style={{ color: RCS.midBlue }}>{m.mark}</span>
                            {m.quarter ? <span style={{ marginLeft: 8, fontSize: 12, opacity: 0.7 }}>Q{m.quarter}</span> : ''}
                          </div>
                          {cls && <div style={{ fontSize: 12, opacity: 0.75 }}>{cls.block_label ? `Block ${cls.block_label} – ` : ''}{cls.name}</div>}
                          {m.note && <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>{m.note}</div>}
                          <div style={{ fontSize: 11, opacity: 0.5, marginTop: 4 }}>
                            {new Date(m.created_at).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </div>
                        </div>
                        {!isDemo && (
                          <button onClick={() => deleteMark(m.id)} style={styles.dangerBtnSm}>Del</button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function humanizeError(e: any): string {
  const code = e?.code as string | undefined;
  const message = (e?.message as string | undefined) ?? '';
  if (code === '42501' || /row level security|permission denied/i.test(message)) {
    return 'Permission denied. Make sure you are signed in as staff.';
  }
  if (code === '23505' || /duplicate key value/i.test(message)) {
    return 'A record with that value already exists.';
  }
  if (code === '42P01' || /relation .* does not exist/i.test(message)) {
    return 'A required database table is missing. Run the migration SQL in Supabase first (supabase/migrations/20260411000000_student_data_tool.sql).';
  }
  return message || 'Unknown error.';
}

// ── Design system ─────────────────────────────────────────────────────────────

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
  page: { padding: 24, maxWidth: 1300, margin: '0 auto', fontFamily: 'system-ui', background: RCS.white, color: RCS.textDark },
  h1: { margin: 0, color: RCS.deepNavy },
  muted: { opacity: 0.85, marginTop: 6, marginBottom: 4, fontSize: 14 },
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
  fieldWrap: { display: 'grid', gap: 4 },
  label: { color: RCS.midBlue, fontWeight: 800, fontSize: 12 },
  input: { padding: '9px 11px', borderRadius: 10, border: `1px solid ${RCS.deepNavy}`, background: RCS.white, color: RCS.textDark, fontSize: 14, fontFamily: 'system-ui' },
  primaryBtn: { padding: '10px 16px', borderRadius: 10, background: RCS.deepNavy, border: `1px solid ${RCS.gold}`, color: RCS.white, cursor: 'pointer', fontWeight: 900 },
  secondaryBtn: { padding: '10px 14px', borderRadius: 10, border: `1px solid ${RCS.gold}`, background: 'transparent', color: RCS.deepNavy, cursor: 'pointer', fontWeight: 900 },
  dangerBtnSm: { padding: '6px 10px', borderRadius: 8, border: '1px solid #991b1b', background: '#FEE2E2', color: '#7F1D1D', cursor: 'pointer', fontWeight: 900, fontSize: 12 },
  editBtnSm: { padding: '6px 10px', borderRadius: 8, border: `1px solid ${RCS.gold}`, background: RCS.paleGold, color: RCS.deepNavy, cursor: 'pointer', fontWeight: 900, fontSize: 12 },
  errorBox: { padding: 12, borderRadius: 10, background: '#FEE2E2', border: '1px solid #991b1b', color: '#7F1D1D', whiteSpace: 'pre-wrap' },
  noteCard: { padding: 12, borderRadius: 10, border: `1px solid ${RCS.lightBlue}`, background: '#f8fbff' },
};
