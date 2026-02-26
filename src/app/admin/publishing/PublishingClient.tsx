'use client';

import { useEffect, useMemo, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { useDemo } from '@/app/admin/DemoContext';

type Row = {
  id: string;
  plan_date: string;
  slot?: string | null;
  title: string;
  share_expires_at: string | null;
  visibility: 'private' | 'link';
  trashed_at?: string | null;
};

type Status = 'loading' | 'idle' | 'working' | 'error';

export default function PublishingClient() {
  const { isDemo } = useDemo();
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Row[]>([]);

  async function load() {
    setStatus('loading');
    setError(null);

    try {
      const supabase = getSupabaseClient();

      // Back-compat: older DBs may not have day_plans.slot yet.
      let { data, error } = await supabase
        .from('day_plans')
        .select('id,plan_date,slot,title,share_expires_at,visibility,trashed_at')
        .is('trashed_at', null)
        .order('plan_date', { ascending: false })
        .order('slot', { ascending: true });

      if (error && /day_plans\.slot does not exist|column .*slot.* does not exist/i.test(String((error as any)?.message ?? ''))) {
        // Retry without slot
        const retry = await supabase
          .from('day_plans')
          .select('id,plan_date,title,share_expires_at,visibility,trashed_at')
          .is('trashed_at', null)
          .order('plan_date', { ascending: false });
        data = retry.data as any;
        error = retry.error as any;
      }

      if (error) throw error;
      setItems((data ?? []) as Row[]);
      setStatus('idle');
    } catch (e: any) {
      setStatus('error');
      setError(e?.message ?? 'Failed to load published plans');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const origin = useMemo(() => (typeof window === 'undefined' ? '' : window.location.origin), []);

  const [shareOpenPlanId, setShareOpenPlanId] = useState<string | null>(null);
  const [shareCopiedPlanId, setShareCopiedPlanId] = useState<string | null>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setShareOpenPlanId(null);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  function planShareUrl(planId: string) {
    return `${origin}/p/${planId}`;
  }

  async function copyLink(planId: string) {
    try {
      const url = planShareUrl(planId);
      await navigator.clipboard.writeText(url);
      setShareCopiedPlanId(planId);
      setTimeout(() => setShareCopiedPlanId((cur) => (cur === planId ? null : cur)), 1200);
      return true;
    } catch (e: any) {
      try {
        window.prompt('Copy this link:', planShareUrl(planId));
      } catch {
        // ignore
      }
      return false;
    }
  }

  async function publish(planId: string) {
    setStatus('working');
    setError(null);

    try {
      const res = await fetch(`/api/admin/dayplans/${planId}/publish`, { method: 'POST' });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error ?? 'Failed to publish');
      await load();
      setStatus('idle');
    } catch (e: any) {
      setStatus('error');
      setError(e?.message ?? 'Failed to publish');
    }
  }

  async function trash(planId: string) {
    const ok = window.confirm('Delete (trash) this day plan?');
    if (!ok) return;

    setStatus('working');
    setError(null);

    try {
      const res = await fetch(`/api/admin/dayplans/${planId}/trash`, { method: 'POST' });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error ?? 'Failed to delete');
      await load();
      setStatus('idle');
    } catch (e: any) {
      setStatus('error');
      setError(e?.message ?? 'Failed to delete');
    }
  }

  async function revoke(planId: string) {
    const ok = window.confirm('Revoke this public link?');
    if (!ok) return;

    setStatus('working');
    setError(null);

    try {
      const res = await fetch(`/api/admin/dayplans/${planId}/revoke`, { method: 'POST' });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error ?? 'Failed to revoke');
      await load();
      setStatus('idle');
    } catch (e: any) {
      setStatus('error');
      setError(e?.message ?? 'Failed to revoke');
    }
  }

  return (
    <main
      style={styles.page}
      onClick={() => {
        // click-away closes share popover
        if (shareOpenPlanId) setShareOpenPlanId(null);
      }}
    >
      <h1 style={styles.h1}>Publishing</h1>
      <p style={styles.muted}>All day plans. Publish/unpublish to control what appears on the TOC screen.</p>

      <section style={styles.card}>
        <div style={styles.rowBetween}>
          <div style={styles.sectionTitle}>Published day plans</div>
          <button onClick={load} disabled={status === 'loading' || status === 'working'} style={styles.secondaryBtn}>
            Refresh
          </button>
        </div>

        {error && <div style={styles.errorBox}>{error}</div>}

        {status !== 'loading' && items.length === 0 && <div style={{ opacity: 0.85, marginTop: 12 }}>No plans yet.</div>}

        {items.length > 0 && (
          <div style={{ overflowX: 'auto', marginTop: 12 }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Date</th>
                  <th style={styles.th}>Block</th>
                  <th style={styles.th}>Title</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Expires</th>
                  <th style={styles.th}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((p, i) => {
                  const published = p.visibility === 'link';
                  return (
                    <tr key={p.id} style={i % 2 === 0 ? styles.trEven : styles.trOdd}>
                      <td style={styles.tdLabel}>{p.plan_date}</td>
                      <td style={styles.td}>{p.slot ?? '—'}</td>
                      <td style={styles.td}>{p.title}</td>
                      <td style={styles.td}>
                        <span style={published ? styles.badgePublished : styles.badgeDraft}>{published ? 'Published' : 'Draft'}</span>
                      </td>
                      <td style={styles.td}>{p.share_expires_at ?? '—'}</td>
                      <td style={styles.tdRight}>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                          {published ? (
                            <>
                              <div style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => setShareOpenPlanId((cur) => (cur === p.id ? null : p.id))}
                                  disabled={status === 'loading' || status === 'working'}
                                  style={styles.secondaryBtn}
                                >
                                  Copy link
                                </button>

                                {shareOpenPlanId === p.id ? (
                                  <div style={styles.sharePopover}>
                                    <div style={styles.shareRow}>
                                      <div style={styles.shareUrl}>{planShareUrl(p.id)}</div>
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          await copyLink(p.id);
                                        }}
                                        style={styles.copyBtn}
                                      >
                                        {shareCopiedPlanId === p.id ? 'Copied' : 'Copy'}
                                      </button>
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                              <button
                                onClick={() => revoke(p.id)}
                                disabled={isDemo || status === 'loading' || status === 'working'}
                                style={styles.dangerBtn}
                              >
                                Unpublish
                              </button>
                              <button
                                onClick={() => trash(p.id)}
                                disabled={isDemo || status === 'loading' || status === 'working'}
                                style={styles.dangerBtn}
                              >
                                Delete
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => publish(p.id)}
                                disabled={isDemo || status === 'loading' || status === 'working'}
                                style={styles.primaryBtn}
                              >
                                Publish
                              </button>
                              <button
                                onClick={() => trash(p.id)}
                                disabled={isDemo || status === 'loading' || status === 'working'}
                                style={styles.dangerBtn}
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                        <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8, textAlign: 'right' }}>
                          Public links are plan-id based. Publishing/expiry is the access gate.
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
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
  page: { padding: 24, maxWidth: 1100, margin: '0 auto', fontFamily: 'system-ui', background: RCS.white, color: RCS.textDark },
  h1: { margin: 0, color: RCS.deepNavy },
  muted: { opacity: 0.85, marginTop: 6, marginBottom: 16 },
  card: { border: `1px solid ${RCS.deepNavy}`, borderRadius: 12, padding: 16, background: RCS.white },
  rowBetween: { display: 'flex', gap: 12, justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' },
  sectionTitle: { fontWeight: 900, color: RCS.deepNavy },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    textAlign: 'left',
    padding: 10,
    background: RCS.deepNavy,
    color: RCS.white,
    borderBottom: `3px solid ${RCS.gold}`,
    fontSize: 12,
    letterSpacing: 0.4,
  },
  trEven: { background: RCS.white },
  trOdd: { background: RCS.lightGray },
  td: { padding: 10, borderBottom: `1px solid ${RCS.deepNavy}`, verticalAlign: 'top' },
  tdRight: { padding: 10, borderBottom: `1px solid ${RCS.deepNavy}`, verticalAlign: 'top' },
  tdLabel: { padding: 10, borderBottom: `1px solid ${RCS.deepNavy}`, color: RCS.midBlue, fontWeight: 800 },
  badgePublished: {
    display: 'inline-block',
    padding: '4px 8px',
    borderRadius: 999,
    background: '#DCFCE7',
    border: '1px solid #166534',
    color: '#166534',
    fontWeight: 900,
    fontSize: 12,
  },
  badgeDraft: {
    display: 'inline-block',
    padding: '4px 8px',
    borderRadius: 999,
    background: '#E5E7EB',
    border: '1px solid #374151',
    color: '#111827',
    fontWeight: 900,
    fontSize: 12,
  },
  primaryBtn: {
    padding: '8px 10px',
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
  },
  dangerBtn: {
    padding: '8px 10px',
    borderRadius: 10,
    border: '1px solid #991b1b',
    background: '#FEE2E2',
    color: '#7F1D1D',
    cursor: 'pointer',
    fontWeight: 900,
  },
  errorBox: { marginTop: 12, padding: 12, borderRadius: 10, background: '#FEE2E2', border: '1px solid #991b1b', color: '#7F1D1D' },

  sharePopover: {
    position: 'absolute',
    right: 0,
    top: 'calc(100% + 6px)',
    zIndex: 20,
    background: RCS.white,
    border: `1px solid ${RCS.deepNavy}`,
    borderRadius: 10,
    padding: 10,
    minWidth: 320,
    maxWidth: 440,
    boxShadow: '0 14px 32px rgba(0,0,0,0.18)',
  },
  shareRow: { display: 'flex', gap: 10, alignItems: 'center' },
  shareUrl: { fontSize: 12, opacity: 0.9, wordBreak: 'break-all', flex: 1 },
  copyBtn: {
    padding: '6px 8px',
    borderRadius: 8,
    border: `1px solid ${RCS.gold}`,
    background: RCS.deepNavy,
    color: RCS.white,
    cursor: 'pointer',
    fontWeight: 900,
    whiteSpace: 'nowrap',
  },
};
