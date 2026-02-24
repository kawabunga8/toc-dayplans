'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabaseClient';

type DayPlanRow = {
  id: string;
  plan_date: string;
  slot: string;
  friday_type: string | null;
  title: string;
  notes: string | null;
  visibility: 'private' | 'link';
  share_expires_at: string | null;
};

type Status = 'loading' | 'idle' | 'publishing' | 'revoking' | 'error';

export default function DayPlanDetailClient({ id }: { id: string }) {
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<DayPlanRow | null>(null);

  const publicUrl = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return new URL(`/p/${id}`, window.location.origin).toString();
  }, [id]);

  async function load() {
    setStatus('loading');
    setError(null);

    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('day_plans')
        .select('id,plan_date,slot,friday_type,title,notes,visibility,share_expires_at')
        .eq('id', id)
        .single();
      if (error) throw error;
      setPlan(data as DayPlanRow);
      setStatus('idle');
    } catch (e: any) {
      setStatus('error');
      setError(e?.message ?? 'Failed to load dayplan');
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function publish() {
    setStatus('publishing');
    setError(null);

    try {
      const res = await fetch(`/api/admin/dayplans/${id}/publish`, { method: 'POST' });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error ?? 'Failed to publish');
      await load();
      setStatus('idle');
    } catch (e: any) {
      setStatus('error');
      setError(e?.message ?? 'Failed to publish');
    }
  }

  async function revoke() {
    setStatus('revoking');
    setError(null);

    try {
      const ok = window.confirm('Revoke this public TOC link?');
      if (!ok) {
        setStatus('idle');
        return;
      }

      const res = await fetch(`/api/admin/dayplans/${id}/revoke`, { method: 'POST' });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error ?? 'Failed to revoke');
      await load();
      setStatus('idle');
    } catch (e: any) {
      setStatus('error');
      setError(e?.message ?? 'Failed to revoke');
    }
  }

  async function copyLink() {
    if (!publicUrl) return;
    await navigator.clipboard.writeText(publicUrl);
  }

  const published = plan?.visibility === 'link';

  return (
    <main style={styles.page}>
      <div style={styles.rowBetween}>
        <div>
          <h1 style={styles.h1}>Dayplan</h1>
          {plan && (
            <div style={styles.meta}>
              {plan.plan_date} • {plan.slot}
              {plan.friday_type ? ` • ${plan.friday_type === 'day1' ? 'Fri Day 1' : 'Fri Day 2'}` : ''}
              {' • '}
              <b>{plan.title}</b>
            </div>
          )}
        </div>
        <Link href="/admin/dayplans" style={styles.secondaryLink}>
          ← Back
        </Link>
      </div>

      <section style={styles.card}>
        <div style={styles.sectionHeader}>Publishing (TOC link)</div>

        {!plan && status === 'loading' && <div>Loading…</div>}

        {plan && (
          <>
            <div style={{ display: 'grid', gap: 8 }}>
              <div>
                <b>Status:</b>{' '}
                {published ? (
                  <span>
                    Published (expires {plan.share_expires_at ? 'tonight' : '—'})
                  </span>
                ) : (
                  <span>Not published</span>
                )}
              </div>

              {published && (
                <div style={{ opacity: 0.85, fontSize: 12 }}>
                  Expires at: {plan.share_expires_at ?? '—'}
                </div>
              )}

              {published && publicUrl && (
                <div style={styles.callout}>
                  <div style={{ fontWeight: 900, color: RCS.deepNavy, marginBottom: 6 }}>Public URL</div>
                  <div style={{ wordBreak: 'break-all' }}>{publicUrl}</div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
                    <button onClick={copyLink} style={styles.secondaryBtn}>Copy link</button>
                    <a href={publicUrl} target="_blank" rel="noreferrer" style={styles.primaryLink}>Open</a>
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
              <button onClick={publish} disabled={status === 'publishing' || status === 'revoking'} style={styles.primaryBtn}>
                {published ? 'Update expiry' : 'Publish'}
              </button>
              <button onClick={revoke} disabled={!published || status === 'publishing' || status === 'revoking'} style={styles.dangerBtn}>
                Revoke
              </button>
            </div>

            {error && <div style={styles.errorBox}>{error}</div>}
          </>
        )}
      </section>

      <section style={styles.card}>
        <div style={styles.sectionHeader}>Details</div>
        <div style={{ opacity: 0.85 }}>
          This page currently focuses on publishing controls. Full dayplan editing (title/notes/blocks) can be added next.
        </div>
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
  page: { padding: 24, maxWidth: 1000, margin: '0 auto', fontFamily: 'system-ui', background: RCS.white, color: RCS.textDark },
  h1: { margin: 0, color: RCS.deepNavy },
  meta: { marginTop: 6, opacity: 0.9 },
  rowBetween: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' },
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
  primaryBtn: {
    padding: '10px 12px',
    borderRadius: 10,
    border: `1px solid ${RCS.gold}`,
    background: RCS.deepNavy,
    color: RCS.white,
    cursor: 'pointer',
    fontWeight: 900,
  },
  secondaryBtn: {
    padding: '8px 10px',
    borderRadius: 10,
    border: `1px solid ${RCS.gold}`,
    background: RCS.white,
    color: RCS.deepNavy,
    cursor: 'pointer',
    fontWeight: 900,
    textDecoration: 'none',
  },
  primaryLink: {
    padding: '8px 10px',
    borderRadius: 10,
    border: `1px solid ${RCS.gold}`,
    background: RCS.deepNavy,
    color: RCS.white,
    fontWeight: 900,
    textDecoration: 'none',
  },
  dangerBtn: {
    padding: '10px 12px',
    borderRadius: 10,
    border: '1px solid #991b1b',
    background: '#FEE2E2',
    color: '#7F1D1D',
    cursor: 'pointer',
    fontWeight: 900,
  },
  secondaryLink: {
    padding: '8px 10px',
    borderRadius: 10,
    border: `1px solid ${RCS.gold}`,
    background: RCS.white,
    color: RCS.deepNavy,
    textDecoration: 'none',
    fontWeight: 900,
    height: 'fit-content',
  },
  callout: { marginTop: 12, padding: 12, borderRadius: 12, background: RCS.lightBlue, border: `1px solid ${RCS.deepNavy}` },
  errorBox: { marginTop: 12, padding: 12, borderRadius: 10, background: '#FEE2E2', border: '1px solid #991b1b', color: '#7F1D1D' },
};
