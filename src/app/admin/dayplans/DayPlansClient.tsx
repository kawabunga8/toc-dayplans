'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabaseClient';
import type { DayPlan } from '@/lib/types';

type Status = 'idle' | 'loading' | 'saving' | 'error';

export default function DayPlansClient() {
  const [items, setItems] = useState<DayPlan[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [planDate, setPlanDate] = useState(today);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');

  async function load() {
    setStatus('loading');
    setError(null);

    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('day_plans')
        .select('*')
        .order('plan_date', { ascending: false });

      if (error) throw error;
      setItems((data ?? []) as DayPlan[]);
      setStatus('idle');
    } catch (e: any) {
      setStatus('error');
      setError(e?.message ?? 'Failed to load dayplans');
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createDayPlan() {
    setStatus('saving');
    setError(null);

    try {
      if (!planDate) throw new Error('Date is required');
      if (!title.trim()) throw new Error('Title is required');

      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('day_plans')
        .insert({
          plan_date: planDate,
          title: title.trim(),
          notes: notes.trim() ? notes.trim() : null,
        })
        .select('*')
        .single();

      if (error) throw error;

      setTitle('');
      setNotes('');
      setItems((prev) => [data as DayPlan, ...prev]);
      setStatus('idle');
    } catch (e: any) {
      setStatus('error');
      // helpful message for unique constraint
      const msg = e?.message ?? 'Failed to create dayplan';
      setError(msg);
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 900, margin: '0 auto', fontFamily: 'system-ui' }}>
      <h1>Dayplans</h1>
      <p style={{ opacity: 0.8 }}>
        Create a dayplan for a date. (Unique per day.)
      </p>

      <section style={{ border: '1px solid #cbd5e1', borderRadius: 12, padding: 16 }}>
        <h2 style={{ marginTop: 0 }}>New dayplan</h2>
        <div style={{ display: 'grid', gap: 10 }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span>Date</span>
            <input
              type="date"
              value={planDate}
              onChange={(e) => setPlanDate(e.target.value)}
              style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1' }}
            />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span>Title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Mr. Kawamura Dayplan"
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

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button onClick={createDayPlan} disabled={status === 'saving' || status === 'loading'} style={btn()}>
              {status === 'saving' ? 'Creating…' : 'Create'}
            </button>
            <button onClick={load} disabled={status === 'saving' || status === 'loading'} style={btnOutline()}>
              Refresh
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

      <hr style={{ margin: '18px 0', opacity: 0.25 }} />

      <section>
        <h2>Existing</h2>

        {status === 'loading' && <div>Loading…</div>}

        {status !== 'loading' && items.length === 0 && (
          <div style={{ opacity: 0.8 }}>No dayplans yet.</div>
        )}

        <div style={{ display: 'grid', gap: 10 }}>
          {items.map((p) => (
            <div key={p.id} style={{ border: '1px solid #cbd5e1', borderRadius: 12, padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{p.plan_date}</div>
                  <div>{p.title}</div>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <Link href={`/admin/dayplans/${p.id}`} style={btnOutline()}>
                    Open
                  </Link>
                </div>
              </div>
            </div>
          ))}
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

function btnOutline(): React.CSSProperties {
  return {
    padding: '10px 12px',
    borderRadius: 10,
    border: '1px solid #94a3b8',
    color: '#0f172a',
    background: 'transparent',
    textDecoration: 'none',
    cursor: 'pointer',
  };
}
