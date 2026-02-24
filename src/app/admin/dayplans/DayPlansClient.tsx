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
  const [slot, setSlot] = useState('A');
  const [fridayType, setFridayType] = useState<'day1' | 'day2' | ''>('');
  const [title, setTitle] = useState('');
  const [titleAuto, setTitleAuto] = useState(true);

  const [blocks, setBlocks] = useState<Array<{ block_label: string; name: string }>>([]);
  const [notes, setNotes] = useState('');

  const [showTrashed, setShowTrashed] = useState(false);

  async function load() {
    setStatus('loading');
    setError(null);

    try {
      const supabase = getSupabaseClient();
      let q = supabase.from('day_plans').select('*').order('plan_date', { ascending: false });
      q = showTrashed ? q : q.is('trashed_at', null);

      const { data, error } = await q;
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
    void loadBlocks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showTrashed]);

  async function loadBlocks() {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('classes')
        .select('block_label,name,sort_order')
        .not('block_label', 'is', null)
        .order('sort_order', { ascending: true, nullsFirst: false });

      if (error) throw error;
      const rows = (data ?? []) as any[];
      const list = rows
        .map((r) => ({ block_label: String(r.block_label), name: String(r.name) }))
        .filter((r) => r.block_label);
      setBlocks(list);

      // If the current selected slot doesn't exist in seeded blocks, fall back to first.
      if (list.length > 0 && !list.some((b) => b.block_label === slot)) {
        setSlot(list[0]!.block_label);
      }

      // Pre-populate title if still auto.
      const current = list.find((b) => b.block_label === slot);
      if (current && titleAuto && !title.trim()) {
        setTitle(current.name);
      }
    } catch {
      // If classes aren't available yet, keep the legacy defaults.
    }
  }

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
      setError(humanizeCreateError(e));
    }
  }

  return (
    <main style={styles.page}>
      <h1 style={styles.h1}>Dayplans</h1>
      <p style={styles.muted}>
        Create a dayplan for a date + block. Fridays require Day 1/Day 2.
      </p>

      <section style={styles.card}>
        <div style={styles.sectionHeader}>New dayplan</div>
        <div style={{ display: 'grid', gap: 10 }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={styles.label}>Date</span>
            <input
              type="date"
              value={planDate}
              onChange={(e) => {
                setPlanDate(e.target.value);
                // reset friday type when changing dates
                setFridayType('');
              }}
              style={styles.input}
            />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span style={styles.label}>Block</span>
            <select
              value={slot}
              onChange={(e) => {
                const next = e.target.value;
                setSlot(next);

                // Pre-populate title from the class name for this block.
                const hit = blocks.find((b) => b.block_label === next);
                if (hit && titleAuto) {
                  setTitle(hit.name);
                }
              }}
              style={styles.input}
            >
              {(blocks.length ? blocks.map((b) => b.block_label) : SLOTS).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          {isFriday && (
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={styles.label}>Friday Type</span>
              <select
                value={fridayType}
                onChange={(e) => setFridayType(e.target.value as any)}
                style={styles.input}
              >
                <option value="">Select…</option>
                <option value="day1">Day 1</option>
                <option value="day2">Day 2</option>
              </select>
            </label>
          )}

          <label style={{ display: 'grid', gap: 6 }}>
            <span style={styles.label}>Title</span>
            <input
              value={title}
              onChange={(e) => {
                setTitleAuto(false);
                setTitle(e.target.value);
              }}
              placeholder="e.g., Computer Programming 11/12"
              style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1' }}
            />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span style={styles.label}>Notes (optional)</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Anything important for the office / TOC (general notes for now)"
              style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1' }}
            />
          </label>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button onClick={createDayPlan} disabled={status === 'saving' || status === 'loading'} style={styles.primaryBtn}>
              {status === 'saving' ? 'Creating…' : 'Create'}
            </button>
            <button onClick={load} disabled={status === 'saving' || status === 'loading'} style={styles.secondaryBtn}>
              Refresh
            </button>
          </div>

          {error && (
            <div style={styles.errorBox}>
              <div style={{ fontWeight: 900, marginBottom: 6 }}>Couldn’t create dayplan</div>
              <div>{error}</div>
            </div>
          )}
        </div>
      </section>

      <hr style={{ margin: '18px 0', opacity: 0.25 }} />

      <section style={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={styles.sectionHeader}>Existing</div>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 800, color: RCS.midBlue }}>
            <input type="checkbox" checked={showTrashed} onChange={(e) => setShowTrashed(e.target.checked)} />
            Show trashed
          </label>
        </div>

        {status === 'loading' && <div>Loading…</div>}

        {status !== 'loading' && items.length === 0 && (
          <div style={{ opacity: 0.8 }}>No dayplans yet.</div>
        )}

        <div style={{ display: 'grid', gap: 10 }}>
          {items.map((p, idx) => (
            <div key={p.id} style={idx % 2 === 0 ? styles.itemEven : styles.itemOdd}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontWeight: 900, color: RCS.deepNavy }}>
                    {p.plan_date} • {p.slot}
                    {p.friday_type ? ` • ${p.friday_type === 'day1' ? 'Fri Day 1' : 'Fri Day 2'}` : ''}
                  </div>
                  <div style={{ fontWeight: 900 }}>{p.title}</div>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <Link href={`/admin/dayplans/${p.id}`} style={styles.secondaryLink}>
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

const RCS = {
  deepNavy: '#1F4E79',
  midBlue: '#2E75B6',
  gold: '#C9A84C',
  white: '#FFFFFF',
  lightGray: '#F5F5F5',
  textDark: '#1A1A1A',
} as const;

const styles: Record<string, React.CSSProperties> = {
  page: { padding: 24, maxWidth: 1000, margin: '0 auto', fontFamily: 'system-ui', background: RCS.white, color: RCS.textDark },
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
  label: { color: RCS.midBlue, fontWeight: 800, fontSize: 12 },
  input: { padding: '10px 12px', borderRadius: 10, border: `1px solid ${RCS.deepNavy}`, background: RCS.white, color: RCS.textDark },
  textarea: { padding: '10px 12px', borderRadius: 10, border: `1px solid ${RCS.deepNavy}`, background: RCS.white, color: RCS.textDark, fontFamily: 'inherit' },
  primaryBtn: { padding: '10px 12px', borderRadius: 10, border: `1px solid ${RCS.gold}`, background: RCS.deepNavy, color: RCS.white, cursor: 'pointer', fontWeight: 900 },
  secondaryBtn: { padding: '10px 12px', borderRadius: 10, border: `1px solid ${RCS.gold}`, background: 'transparent', color: RCS.deepNavy, cursor: 'pointer', fontWeight: 900 },
  secondaryLink: { padding: '10px 12px', borderRadius: 10, border: `1px solid ${RCS.gold}`, background: 'transparent', color: RCS.deepNavy, textDecoration: 'none', cursor: 'pointer', fontWeight: 900 },
  errorBox: { marginTop: 12, padding: 12, borderRadius: 10, background: '#FEE2E2', border: '1px solid #991b1b', color: '#7F1D1D' },
  itemEven: { border: `1px solid ${RCS.deepNavy}`, borderRadius: 12, padding: 12, background: RCS.white },
  itemOdd: { border: `1px solid ${RCS.deepNavy}`, borderRadius: 12, padding: 12, background: RCS.lightGray },
};

const SLOTS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'Flex Block', 'Career Life', 'Chapel', 'Lunch'];

function humanizeCreateError(e: any): string {
  // supabase-js / PostgREST errors often look like:
  // { code, message, details, hint }
  const code = e?.code as string | undefined;
  const message = (e?.message as string | undefined) ?? '';
  const details = (e?.details as string | undefined) ?? '';

  // Common DB uniqueness violation
  if (code === '23505' || /duplicate key value/i.test(message)) {
    return 'A plan already exists for that Date + Block (and Friday Type, if Friday). Pick a different block/date, or open the existing plan.';
  }

  // Missing column / schema mismatch
  if (code === '42703' || /column .* does not exist/i.test(message)) {
    return 'Database schema is out of date (missing columns). Run the latest schema/migration SQL in Supabase, then refresh.';
  }

  // RLS / permissions
  if (code === '42501' || /row level security|permission denied/i.test(message)) {
    return 'Permission denied by Supabase security policy. Make sure you are signed in as an admin and your user is in staff_profiles.';
  }

  // Invalid API key / env
  if (/Invalid API key/i.test(message)) {
    return 'Supabase API key is invalid. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local / Vercel env vars.';
  }

  // Fallback: keep it short but useful
  const extra = details ? ` (${details})` : '';
  return (message || 'Failed to create dayplan.') + extra;
}

function isFridayLocal(yyyyMmDd: string): boolean {
  // Date("YYYY-MM-DD") is treated as UTC; we want local weekday.
  const [y, m, d] = yyyyMmDd.split('-').map((x) => Number(x));
  if (!y || !m || !d) return false;
  const dt = new Date(y, m - 1, d);
  return dt.getDay() === 5;
}

// legacy helpers removed; styles are centralized above.
