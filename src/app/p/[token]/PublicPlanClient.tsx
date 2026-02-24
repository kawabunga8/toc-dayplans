'use client';

import { useMemo, useState } from 'react';

type Block = {
  id: string;
  start_time: string;
  end_time: string;
  room: string;
  class_name: string;
  details: string | null;
  class_id: string | null;
};

type PublicPlan = {
  id: string;
  plan_date: string;
  slot: string;
  friday_type: string | null;
  title: string;
  notes: string | null;
  blocks: Block[];
};

export default function PublicPlanClient({ plan }: { plan: PublicPlan }) {
  const allIds = useMemo(() => plan.blocks.map((b) => b.id), [plan.blocks]);
  const [selected, setSelected] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const id of allIds) init[id] = true;
    return init;
  });

  const selectedCount = useMemo(() => allIds.filter((id) => selected[id]).length, [allIds, selected]);

  function toggle(id: string) {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function selectAll(val: boolean) {
    setSelected(() => {
      const next: Record<string, boolean> = {};
      for (const id of allIds) next[id] = val;
      return next;
    });
  }

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div style={styles.headerTopRow}>
          <div>
            <div style={styles.headerDate}>{formatHeaderDate(plan.plan_date)}</div>
            <div style={styles.headerTitle}>{plan.title}</div>
            <div style={styles.headerMeta}>
              Slot: <b>{plan.slot}</b>
              {plan.friday_type ? ` • ${plan.friday_type === 'day1' ? 'Fri Day 1' : 'Fri Day 2'}` : ''}
            </div>
          </div>

          <div className="no-print" style={styles.headerControls}>
            <button onClick={() => selectAll(true)} style={styles.secondaryBtn}>
              Select all
            </button>
            <button onClick={() => selectAll(false)} style={styles.secondaryBtn}>
              Select none
            </button>
          </div>
        </div>

        {plan.notes?.trim() ? (
          <div style={styles.notesBox}>
            <div style={styles.notesLabel}>Notes</div>
            <div style={styles.notesText}>{plan.notes}</div>
          </div>
        ) : null}
      </header>

      <div style={styles.blocksWrap}>
        {plan.blocks.map((b) => {
          const isOn = !!selected[b.id];
          const label = blockLabelFromClassName(b.class_name);

          return (
            <section
              key={b.id}
              data-selected={isOn ? 'true' : 'false'}
              style={styles.blockCard}
            >
              <div style={styles.blockHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <div style={styles.blockBadge}>{label}</div>
                  <div style={styles.blockTime}>
                    {formatTime(b.start_time)}–{formatTime(b.end_time)}
                  </div>
                  <div style={styles.blockClass}>{b.class_name}</div>
                  <div style={styles.blockRoom}>Room {b.room}</div>
                </div>

                <label className="no-print" style={styles.checkboxLabel}>
                  <input type="checkbox" checked={isOn} onChange={() => toggle(b.id)} />
                  <span>Print</span>
                </label>
              </div>

              {b.details?.trim() ? <div style={styles.blockDetails}>{b.details}</div> : null}
            </section>
          );
        })}
      </div>

      <div className="no-print" style={styles.stickyBar}>
        <div style={{ opacity: 0.9 }}>
          Selected: <b>{selectedCount}</b> / {plan.blocks.length}
        </div>
        <button
          onClick={() => window.print()}
          disabled={selectedCount === 0}
          style={selectedCount === 0 ? styles.primaryBtnDisabled : styles.primaryBtn}
        >
          Print Selected
        </button>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          [data-selected="false"] { display: none !important; }
          body { background: white !important; }
        }
      `}</style>
    </main>
  );
}

function formatTime(t: string) {
  // expects HH:MM:SS or HH:MM
  return t?.slice(0, 5) || t;
}

function formatHeaderDate(d: string) {
  // YYYY-MM-DD
  return d;
}

function blockLabelFromClassName(className: string) {
  // If class_name already contains "Block X" we keep it compact.
  const m = /\bBlock\s+([A-Z]+|CLE)\b/i.exec(className);
  if (m?.[1]) return `Block ${m[1].toUpperCase()}`;
  return 'Block';
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
  page: {
    padding: 24,
    maxWidth: 980,
    margin: '0 auto',
    fontFamily: 'system-ui',
    color: RCS.textDark,
    background: RCS.white,
  },
  header: {
    border: `1px solid ${RCS.deepNavy}`,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  headerTopRow: {
    background: RCS.deepNavy,
    color: RCS.white,
    padding: 16,
    borderBottom: `4px solid ${RCS.gold}`,
    display: 'flex',
    justifyContent: 'space-between',
    gap: 16,
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
  headerDate: { fontWeight: 800, color: RCS.gold, marginBottom: 6 },
  headerTitle: { fontSize: 22, fontWeight: 900, marginBottom: 6 },
  headerMeta: { opacity: 0.95 },
  headerControls: { display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' },
  notesBox: { padding: 16, background: RCS.lightBlue },
  notesLabel: { fontWeight: 900, color: RCS.deepNavy, marginBottom: 6 },
  notesText: { whiteSpace: 'pre-wrap' },
  blocksWrap: { display: 'grid', gap: 12 },
  blockCard: {
    border: `1px solid ${RCS.deepNavy}`,
    borderRadius: 12,
    background: RCS.white,
    overflow: 'hidden',
  },
  blockHeader: {
    padding: '12px 14px',
    background: RCS.lightGray,
    borderBottom: `2px solid ${RCS.gold}`,
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  blockBadge: {
    background: RCS.deepNavy,
    color: RCS.white,
    border: `1px solid ${RCS.gold}`,
    borderRadius: 999,
    padding: '6px 10px',
    fontWeight: 900,
    whiteSpace: 'nowrap',
  },
  blockTime: { fontWeight: 900, color: RCS.midBlue },
  blockClass: { fontWeight: 900 },
  blockRoom: { opacity: 0.9 },
  checkboxLabel: { display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, color: RCS.textDark },
  blockDetails: { padding: 14, whiteSpace: 'pre-wrap' },
  stickyBar: {
    position: 'sticky',
    bottom: 0,
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    border: `1px solid ${RCS.deepNavy}`,
    background: RCS.white,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
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
  primaryBtnDisabled: {
    padding: '10px 12px',
    borderRadius: 10,
    border: `1px solid ${RCS.lightGray}`,
    background: RCS.lightGray,
    color: '#64748b',
    cursor: 'not-allowed',
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
};
