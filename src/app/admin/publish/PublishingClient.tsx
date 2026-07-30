'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabaseClient';
import type { DayPlan } from '@/lib/types';

type Status = 'idle' | 'loading' | 'error';

export default function PublishingClient() {
  const [items, setItems] = useState<DayPlan[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const [filterVisibility, setFilterVisibility] = useState<'all' | 'public' | 'private'>('all');

  async function load() {
    setStatus('loading');
    setError(null);

    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('day_plans')
        .select('*')
        .is('trashed_at', null)
        .order('plan_date', { ascending: false });

      if (error) throw error;
      setItems((data ?? []) as DayPlan[]);
      setStatus('idle');
    } catch (e: any) {
      setStatus('error');
      setError(e?.message ?? 'Failed to load plans');
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggleVisibility(planId: string, currentVis: string) {
    const newVis = currentVis === 'private' ? 'link' : 'private';
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.from('day_plans').update({ visibility: newVis }).eq('id', planId);

      if (error) throw error;

      setItems(items.map((p) => (p.id === planId ? { ...p, visibility: newVis } : p)));
    } catch (e: any) {
      setError(e?.message ?? 'Failed to update visibility');
    }
  }

  async function deletePlan(planId: string) {
    if (!confirm('Delete this plan? (This will soft-delete it)')) return;

    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.from('day_plans').update({ trashed_at: new Date().toISOString() }).eq('id', planId);

      if (error) throw error;

      setItems(items.filter((p) => p.id !== planId));
    } catch (e: any) {
      setError(e?.message ?? 'Failed to delete plan');
    }
  }

  const filtered = items.filter((p) => {
    if (filterVisibility === 'all') return true;
    return p.visibility === filterVisibility;
  });

  return (
    <main style={{ padding: 24, maxWidth: 1000, margin: '0 auto', fontFamily: 'system-ui' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0 }}>Publishing</h1>
        <Link href="/admin/dayplans" style={{ ...btn(), textDecoration: 'none' }}>
          + Create New Plan
        </Link>
      </div>

      <p style={{ opacity: 0.8 }}>
        Manage which dayplans are visible to TOCs. Toggle visibility to publish/unpublish.
      </p>

      {error && (
        <div style={{ padding: 12, borderRadius: 10, border: '1px solid #fecaca', background: '#fee2e2', marginBottom: 16 }}>
          {error}
        </div>
      )}

      <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
        <button
          onClick={() => setFilterVisibility('all')}
          style={{
            ...filterButton(filterVisibility === 'all'),
          }}
        >
          All ({items.length})
        </button>
        <button
          onClick={() => setFilterVisibility('public')}
          style={{
            ...filterButton(filterVisibility === 'public'),
          }}
        >
          Public ({items.filter((p) => p.visibility === 'link').length})
        </button>
        <button
          onClick={() => setFilterVisibility('private')}
          style={{
            ...filterButton(filterVisibility === 'private'),
          }}
        >
          Private ({items.filter((p) => p.visibility === 'private').length})
        </button>
      </div>

      {status === 'loading' && <div>Loading…</div>}

      {status !== 'loading' && filtered.length === 0 && (
        <div style={{ opacity: 0.8 }}>
          {items.length === 0 ? 'No plans created yet.' : 'No plans match this filter.'}
        </div>
      )}

      <div style={{ display: 'grid', gap: 12 }}>
        {filtered.map((p) => (
          <div key={p.id} style={{ border: '1px solid #cbd5e1', borderRadius: 12, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'start' }}>
              <div style={{ flex: 1, minWidth: 300 }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>
                  {p.plan_date} • {p.slot}
                  {p.friday_type ? ` • ${p.friday_type === 'day1' ? 'Fri Day 1' : 'Fri Day 2'}` : ''}
                </div>
                <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>{p.title}</div>
                {p.notes && <div style={{ opacity: 0.75, fontSize: 14, marginBottom: 8 }}>{p.notes}</div>}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      padding: '4px 8px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      background: p.visibility === 'link' ? '#dcfce7' : '#f3f4f6',
                      color: p.visibility === 'link' ? '#166534' : '#374151',
                    }}
                  >
                    {p.visibility === 'link' ? '✓ Public' : 'Private'}
                  </span>
                  {p.share_expires_at && (
                    <span style={{ fontSize: 12, opacity: 0.7 }}>
                      Expires: {new Date(p.share_expires_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, flexDirection: 'column', alignItems: 'flex-end' }}>
                <button
                  onClick={() => toggleVisibility(p.id, p.visibility)}
                  style={{
                    ...btnSmall(p.visibility === 'link' ? '#dc2626' : '#16a34a'),
                  }}
                >
                  {p.visibility === 'link' ? 'Unpublish' : 'Publish'}
                </button>
                <Link href={`/admin/dayplans/${p.id}`} style={{ ...btnSmallOutline(), textDecoration: 'none' }}>
                  Edit
                </Link>
                <button onClick={() => deletePlan(p.id)} style={btnSmallOutline()}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

function btn(): React.CSSProperties {
  return {
    padding: '10px 14px',
    borderRadius: 10,
    background: '#2563eb',
    color: 'white',
    border: 0,
    cursor: 'pointer',
    fontWeight: 500,
  };
}

function btnSmall(bgColor: string): React.CSSProperties {
  return {
    padding: '8px 12px',
    borderRadius: 8,
    background: bgColor,
    color: 'white',
    border: 0,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
    whiteSpace: 'nowrap',
  };
}

function btnSmallOutline(): React.CSSProperties {
  return {
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid #cbd5e1',
    color: '#0f172a',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: 13,
    whiteSpace: 'nowrap',
  };
}

function filterButton(isActive: boolean): React.CSSProperties {
  return {
    padding: '8px 12px',
    borderRadius: 8,
    border: isActive ? '2px solid #2563eb' : '1px solid #cbd5e1',
    background: isActive ? '#eff6ff' : 'transparent',
    color: isActive ? '#2563eb' : '#0f172a',
    cursor: 'pointer',
    fontWeight: isActive ? 600 : 500,
    fontSize: 14,
  };
}
