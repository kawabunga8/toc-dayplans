'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

type Phase = { phase_text: string };

type PlanData = {
  title: string;
  plan_date: string;
  slot: string;
  toc?: {
    plan_mode: 'lesson_flow' | 'activity_options';
    lesson_flow_phases?: Phase[];
    activity_options?: Array<{ title: string }>;
  };
};

const FIXED_ITEMS = ['Review', 'Check-in', 'Prayer'];

const RCS = {
  deepNavy: '#1F4E79',
  midBlue: '#2E75B6',
  gold: '#C9A84C',
  white: '#FFFFFF',
  lightGray: '#F5F5F5',
  textDark: '#1A1A1A',
} as const;

function ShapeContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  const [plan, setPlan] = useState<PlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlan = useCallback(async () => {
    if (!id) {
      setError('No plan ID provided.');
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/public/plan?id=${encodeURIComponent(id)}`);
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error ?? 'Failed to load plan');
      setPlan(j.plan as PlanData);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load plan');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchPlan();
  }, [fetchPlan]);

  if (loading) {
    return (
      <div style={styles.center}>
        <div style={styles.loadingText}>Loading…</div>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div style={styles.center}>
        <div style={styles.errorText}>{error ?? 'Plan not found.'}</div>
      </div>
    );
  }

  // Build topic list from lesson flow phases (excluding fixed items to avoid duplication)
  const phases = plan.toc?.lesson_flow_phases ?? [];
  const activityOptions = plan.toc?.activity_options ?? [];

  const topics: string[] = phases.length
    ? phases.map((p) => p.phase_text).filter(Boolean)
    : activityOptions.map((a) => a.title).filter(Boolean);

  // Combine: fixed items first, then any topics not already in fixed items
  const fixedSet = new Set(FIXED_ITEMS.map((s) => s.toLowerCase()));
  const extraTopics = topics.filter((t) => !fixedSet.has(t.toLowerCase()));
  const allItems = [...FIXED_ITEMS, ...extraTopics];

  const dateLabel = plan.plan_date
    ? new Date(plan.plan_date + 'T12:00:00').toLocaleDateString('en-CA', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div style={styles.kicker}>Shape of the Day</div>
        <div style={styles.title}>{plan.title}</div>
        {dateLabel ? <div style={styles.date}>{dateLabel}</div> : null}
      </div>

      <ol style={styles.list}>
        {allItems.map((item, i) => (
          <li key={i} style={styles.listItem}>
            <span style={styles.itemNumber}>{i + 1}</span>
            <span style={styles.itemText}>{item}</span>
          </li>
        ))}
      </ol>

      <div style={styles.footer}>Richmond Christian School</div>
    </div>
  );
}

export default function ShapeOfDayPage() {
  return (
    <Suspense fallback={<div style={styles.center}><div style={styles.loadingText}>Loading…</div></div>}>
      <ShapeContent />
    </Suspense>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: RCS.deepNavy,
    color: RCS.white,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '48px 60px',
    fontFamily: 'system-ui, sans-serif',
    boxSizing: 'border-box',
  },
  center: {
    minHeight: '100vh',
    background: RCS.deepNavy,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'system-ui, sans-serif',
  },
  loadingText: { color: RCS.white, fontSize: 28, opacity: 0.7 },
  errorText: { color: '#FF9999', fontSize: 24 },
  header: {
    textAlign: 'center',
    marginBottom: 56,
  },
  kicker: {
    fontSize: 18,
    fontWeight: 700,
    color: RCS.gold,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  title: {
    fontSize: 52,
    fontWeight: 900,
    color: RCS.white,
    lineHeight: 1.1,
    marginBottom: 10,
  },
  date: {
    fontSize: 22,
    opacity: 0.75,
    fontWeight: 500,
  },
  list: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    width: '100%',
    maxWidth: 800,
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  listItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 28,
    background: 'rgba(255,255,255,0.07)',
    borderRadius: 16,
    padding: '24px 36px',
    borderLeft: `6px solid ${RCS.gold}`,
  },
  itemNumber: {
    fontSize: 28,
    fontWeight: 900,
    color: RCS.gold,
    minWidth: 36,
    textAlign: 'center',
  },
  itemText: {
    fontSize: 36,
    fontWeight: 700,
    color: RCS.white,
    lineHeight: 1.2,
  },
  footer: {
    marginTop: 56,
    fontSize: 16,
    opacity: 0.4,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },
};
