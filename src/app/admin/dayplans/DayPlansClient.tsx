'use client';

import { useMemo, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabaseClient';

type Status = 'idle' | 'saving' | 'error';

export default function DayPlansClient() {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [planDate, setPlanDate] = useState(today);
  const [slot, setSlot] = useState('A');
  const [fridayType, setFridayType] = useState<'day1' | 'day2' | ''>('');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [visibility, setVisibility] = useState<'private' | 'link'>('private');

  const isFriday = useMemo(() => isFridayLocal(planDate), [planDate]);

  async function createDayPlan() {
    setStatus('saving');
    setError(null);

    try {
      if (!planDate) throw new Error('Date is required');
      if (!slot.trim()) throw new Error('Slot is required');
      if (isFriday && !fridayType) throw new Error('Friday Type is required');
      if (!title.trim()) throw new Error('Title is required');

      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('day_plans')
        .insert({
          plan_date: planDate,
          slot: slot.trim(),
          friday_type: isFriday ? (fridayType as 'day1' | 'day2') : null,
          title: title.trim(),
          notes: notes.trim() ? notes.trim() : null,
          visibility: visibility,
        })
        .select('*')
        .single();

      if (error) throw error;

      setTitle('');
      setNotes('');
      setStatus('idle');
      setError(null);
    } catch (e: any) {
      setStatus('error');
      // helpful message for unique constraint
      const msg = e?.message ?? 'Failed to create dayplan';
      setError(msg);
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 900, margin: '0 auto', fontFamily: 'system-ui' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0 }}>Create Dayplan</h1>
      </div>
      <p style={{ opacity: 0.8 }}>
        Create a dayplan for a date + slot (e.g., A, Flex Block, Lunch). Fridays require Day 1/Day 2.
      </p>

      <section style={{ border: '1px solid #cbd5e1', borderRadius: 12, padding: 16 }}>
        <h2 style={{ marginTop: 0 }}>New dayplan</h2>
        <div style={{ display: 'grid', gap: 10 }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span>Date</span>
            <input
              type="date"
              value={planDate}
              onChange={(e) => {
                setPlanDate(e.target.value);
                // reset friday type when changing dates
                setFridayType('');
              }}
              style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1' }}
            />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span>Slot</span>
            <select
              value={slot}
              onChange={(e) => setSlot(e.target.value)}
              style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1' }}
            >
              {SLOTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          {isFriday && (
            <label style={{ display: 'grid', gap: 6 }}>
              <span>Friday Type</span>
              <select
                value={fridayType}
                onChange={(e) => setFridayType(e.target.value as any)}
                style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1' }}
              >
                <option value="">Select…</option>
                <option value="day1">Day 1</option>
                <option value="day2">Day 2</option>
              </select>
            </label>
          )}

          <label style={{ display: 'grid', gap: 6 }}>
            <span>Title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Block A — Math 9"
              style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1' }}
            />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span>Notes (optional)</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Anything important for the office / TOC (general notes for now)"
              style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1' }}
            />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span>Visibility</span>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as 'private' | 'link')}
              style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1' }}
            >
              <option value="private">Private (staff only)</option>
              <option value="link">Public (TOC can see)</option>
            </select>
          </label>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button onClick={createDayPlan} disabled={status === 'saving'} style={btn()}>
              {status === 'saving' ? 'Creating…' : 'Create'}
            </button>
          </div>

          {error && (
            <div style={{ padding: 12, borderRadius: 10, border: '1px solid #fecaca', background: '#fee2e2' }}>
              {error}
              <div style={{ marginTop: 6, opacity: 0.8, fontSize: 12 }}>
                If this says the date already exists, pick a different date or we’ll add “edit existing” next.
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function btn(): React.CSSProperties {
  return {
    padding: '10px 12px',
    borderRadius: 10,
    background: '#2563eb',
    color: 'white',
    textDecoration: 'none',
    border: 0,
    cursor: 'pointer',
  };
}

const SLOTS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'Flex Block', 'Career Life', 'Chapel', 'Lunch'];

function isFridayLocal(yyyyMmDd: string): boolean {
  // Date("YYYY-MM-DD") is treated as UTC; we want local weekday.
  const [y, m, d] = yyyyMmDd.split('-').map((x) => Number(x));
  if (!y || !m || !d) return false;
  const dt = new Date(y, m - 1, d);
  return dt.getDay() === 5;
}
