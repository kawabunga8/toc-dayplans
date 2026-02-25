'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface Block {
  id: string;
  start_time: string;
  end_time: string;
  room: string;
  class_name: string;
  details: string | null;
  class_id: string | null;
  enrollments: Array<{
    student_id: string;
    student: {
      id: string;
      first_name: string;
      last_name: string;
      photo_url: string | null;
    };
  }>;
}

interface Plan {
  id: string;
  plan_date: string;
  slot: string;
  title: string;
  notes: string | null;
  day_plan_blocks: Block[];
}

export default function PlanPage() {
  const params = useParams();
  const planId = params.id as string;

  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedBlocks, setSelectedBlocks] = useState<Set<string>>(new Set());
  const [expandedClass, setExpandedClass] = useState<string | null>(null);
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function fetchPlan() {
      try {
        const res = await fetch(`/api/toc/plan/${planId}`);
        if (!res.ok) throw new Error('Plan not found');
        const data = await res.json();
        setPlan(data);
        // Select all blocks by default
        setSelectedBlocks(
          new Set(data.day_plan_blocks.map((b: Block) => b.id))
        );
      } catch (e) {
        console.error('Failed to fetch plan:', e);
      } finally {
        setLoading(false);
      }
    }

    if (planId) fetchPlan();
  }, [planId]);

  function toggleBlock(blockId: string) {
    const newSet = new Set(selectedBlocks);
    if (newSet.has(blockId)) {
      newSet.delete(blockId);
    } else {
      newSet.add(blockId);
    }
    setSelectedBlocks(newSet);
  }

  function toggleAttendance(studentId: string) {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: !prev[studentId],
    }));
  }

  function printSelected() {
    // Print media queries will hide all non-block UI
    window.print();
  }

  if (loading) {
    return (
      <main style={{ padding: 24, fontFamily: 'system-ui' }}>
        Loading plan…
      </main>
    );
  }

  if (!plan) {
    return (
      <main style={{ padding: 24, fontFamily: 'system-ui' }}>
        <h1>Plan not found</h1>
      </main>
    );
  }

  // Format date as readable
  const dateObj = new Date(plan.plan_date + 'T00:00:00');
  const dateStr = dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  const selectedBlocksList = plan.day_plan_blocks.filter((b) =>
    selectedBlocks.has(b.id)
  );

  return (
    <main style={{ fontFamily: 'system-ui' }}>
      <style>{`
        @media print {
          header { display: none; }
          .controls { display: none; }
          .sidebar { display: none; }
          body { margin: 0; padding: 0; }
          main { max-width: 100%; }
          .plan-card { break-inside: avoid; page-break-inside: avoid; }
          .hidden-print { display: none; }
        }
      `}</style>

      {/* Header */}
      <header
        style={{
          padding: '12px 24px',
          borderBottom: '1px solid #e2e8f0',
          background: '#f9fafb',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '1.5em' }}>{plan.title}</h1>
        <p style={{ margin: '4px 0 0 0', opacity: 0.7 }}>
          {dateStr} • {plan.slot}
        </p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 250px', gap: 24, padding: 24, maxWidth: 1200 }}>
        {/* Main Content */}
        <div>
          {plan.notes && (
            <div
              style={{
                padding: 12,
                borderRadius: 8,
                background: '#fef3c7',
                borderLeft: '4px solid #f59e0b',
                marginBottom: 24,
              }}
            >
              <strong>Notes:</strong> {plan.notes}
            </div>
          )}

          {/* Block Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {plan.day_plan_blocks.map((block) => (
              <div key={block.id} className="plan-card">
                <div
                  style={{
                    border: '1px solid #cbd5e1',
                    borderRadius: 12,
                    padding: 16,
                    background: selectedBlocks.has(block.id) ? '#f0f9ff' : '#fafbfc',
                  }}
                >
                  {/* Block Header with Checkbox */}
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
                    <input
                      type="checkbox"
                      checked={selectedBlocks.has(block.id)}
                      onChange={() => toggleBlock(block.id)}
                      className="hidden-print"
                      style={{ marginTop: 4, minWidth: 20 }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 'bold', fontSize: '1.1em' }}>
                        {block.class_name}
                      </div>
                      <div style={{ opacity: 0.7, fontSize: '0.95em' }}>
                        {block.start_time}–{block.end_time} • Room {block.room}
                      </div>
                    </div>
                  </div>

                  {/* Block Details */}
                  {block.details && (
                    <div
                      style={{
                        padding: 12,
                        background: 'white',
                        borderRadius: 8,
                        marginBottom: 12,
                        fontSize: '0.95em',
                      }}
                    >
                      {block.details}
                    </div>
                  )}

                  {/* Attendance List */}
                  {block.enrollments && block.enrollments.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <button
                        onClick={() =>
                          setExpandedClass(
                            expandedClass === block.id ? null : block.id
                          )
                        }
                        className="hidden-print"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#2563eb',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          textAlign: 'left',
                          padding: 0,
                          fontSize: '0.95em',
                        }}
                      >
                        {expandedClass === block.id ? '▼' : '▶'} Attendance List (
                        {block.enrollments.length})
                      </button>

                      {expandedClass === block.id && (
                        <div style={{ marginTop: 12 }}>
                          <div
                            style={{
                              display: 'grid',
                              gap: 8,
                              maxHeight: '300px',
                              overflowY: 'auto',
                            }}
                          >
                            {block.enrollments.map((enrollment) => (
                              <div
                                key={enrollment.student_id}
                                style={{
                                  display: 'flex',
                                  gap: 8,
                                  alignItems: 'center',
                                  padding: 8,
                                  background: 'white',
                                  borderRadius: 6,
                                  fontSize: '0.9em',
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={!!attendance[enrollment.student_id]}
                                  onChange={() =>
                                    toggleAttendance(enrollment.student_id)
                                  }
                                  style={{ minWidth: 18 }}
                                />
                                <span>
                                  {enrollment.student.first_name}{' '}
                                  {enrollment.student.last_name}
                                </span>
                              </div>
                            ))}
                          </div>

                          <button
                            onClick={() => {
                              // Print only this class's attendance
                              const w = window.open('', '_blank');
                              if (w) {
                                w.document.write(`
                                  <html><head><title>Attendance - ${block.class_name}</title></head>
                                  <body style="font-family: system-ui; padding: 24px;">
                                    <h2>${block.class_name}</h2>
                                    <table style="width: 100%; border-collapse: collapse;">
                                      <thead>
                                        <tr style="border-bottom: 2px solid #000;">
                                          <th style="text-align: left; padding: 8px;">Name</th>
                                          <th style="text-align: center; padding: 8px;">Present</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        ${block.enrollments
                                          .map(
                                            (e) => `
                                          <tr style="border-bottom: 1px solid #ccc;">
                                            <td style="padding: 8px;">${e.student.first_name} ${e.student.last_name}</td>
                                            <td style="text-align: center; padding: 8px;">☐</td>
                                          </tr>
                                        `
                                          )
                                          .join('')}
                                      </tbody>
                                    </table>
                                  </body></html>
                                `);
                                w.document.close();
                                w.print();
                              }
                            }}
                            className="hidden-print"
                            style={{
                              marginTop: 12,
                              padding: '6px 10px',
                              borderRadius: 6,
                              background: 'white',
                              border: '1px solid #94a3b8',
                              cursor: 'pointer',
                              fontSize: '0.85em',
                            }}
                          >
                            Print Attendance
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar - Controls */}
        <div className="controls hidden-print" style={{ position: 'sticky', top: 24 }}>
          <div style={{ background: '#f9fafb', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '0.95em' }}>
              Blocks Selected
            </h3>
            <p style={{ margin: 0, fontSize: '1.5em', fontWeight: 'bold', marginBottom: 12 }}>
              {selectedBlocks.size} / {plan.day_plan_blocks.length}
            </p>

            <button
              onClick={printSelected}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: 8,
                background: '#2563eb',
                color: 'white',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '1em',
              }}
            >
              Print Selected
            </button>

            <button
              onClick={() =>
                setSelectedBlocks(
                  new Set(plan.day_plan_blocks.map((b) => b.id))
                )
              }
              style={{
                width: '100%',
                marginTop: 8,
                padding: '8px 12px',
                borderRadius: 6,
                background: 'white',
                border: '1px solid #94a3b8',
                cursor: 'pointer',
                fontSize: '0.9em',
              }}
            >
              Select All
            </button>

            <button
              onClick={() => setSelectedBlocks(new Set())}
              style={{
                width: '100%',
                marginTop: 6,
                padding: '8px 12px',
                borderRadius: 6,
                background: 'white',
                border: '1px solid #94a3b8',
                cursor: 'pointer',
                fontSize: '0.9em',
              }}
            >
              Deselect All
            </button>
          </div>

          <div style={{ marginTop: 16, fontSize: '0.85em', opacity: 0.7 }}>
            Click "Print Selected" to print only the checked blocks. Attendance lists can be printed separately.
          </div>
        </div>
      </div>
    </main>
  );
}
