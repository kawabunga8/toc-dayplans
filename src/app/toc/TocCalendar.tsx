'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DayPlan, ClassBlock } from '@/lib/types';

interface WeekPlan {
  date: string;
  dayName: string;
  plans: (DayPlan & { day_plan_blocks: ClassBlock[] })[];
}

export default function TocCalendar() {
  const [weekPlans, setWeekPlans] = useState<WeekPlan[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchWeek(date: Date) {
    setLoading(true);
    setError(null);
    const dateStr = date.toISOString().split('T')[0];
    
    try {
      const res = await fetch(`/api/toc/calendar?date=${dateStr}`);
      const data = await res.json();

      if (!res.ok) {
        if (data.error === 'database-not-configured') {
          setError('The database schema hasn\'t been set up yet. Please run supabase/schema.sql in your Supabase dashboard.');
        } else {
          setError(data.message || data.error || 'Failed to load schedules');
        }
        setWeekPlans([]);
        setLoading(false);
        return;
      }

      // Build week structure (Mon-Fri)
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(date.getFullYear(), date.getMonth(), diff);

      const toDateString = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const days: WeekPlan[] = [];
      const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

      for (let i = 0; i < 5; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const dateStr = toDateString(d);
        
        days.push({
          date: dateStr,
          dayName: dayNames[i],
          plans: data.plans?.[dateStr] || [],
        });
      }

      setWeekPlans(days);
      setError(null);
      if (days.some(d => d.plans.length > 0)) {
        setSelectedDay(days.find(d => d.plans.length > 0)?.date || null);
      }
    } catch (e) {
      console.error('Failed to fetch week:', e);
      setError('An error occurred while loading the schedule. Please try again.');
      setWeekPlans([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchWeek(currentDate);
  }, [currentDate]);

  function prevWeek() {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 7);
    setCurrentDate(d);
  }

  function nextWeek() {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 7);
    setCurrentDate(d);
  }

  const selectedDayPlans = weekPlans.find(d => d.date === selectedDay)?.plans || [];

  if (loading && weekPlans.length === 0) {
    return (
      <main style={{ padding: 24, maxWidth: 900, margin: '0 auto', fontFamily: 'system-ui' }}>
        <h1>TOC Schedule</h1>
        <p>Loading week plans…</p>
      </main>
    );
  }

  return (
    <main style={{ padding: 24, maxWidth: 1000, margin: '0 auto', fontFamily: 'system-ui' }}>
      <h1 style={{ marginBottom: 8 }}>TOC Schedule</h1>

      {/* Week Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={prevWeek} style={navBtn()}>← Previous Week</button>
        <span style={{ minWidth: 200, textAlign: 'center' }}>
          {weekPlans[0]?.date} to {weekPlans[4]?.date || 'Loading…'}
        </span>
        <button onClick={nextWeek} style={navBtn()}>Next Week →</button>
      </div>

      {error ? (
        <div style={{ padding: 24, background: '#fee2e2', borderRadius: 12, border: '1px solid #fecaca' }}>
          <p style={{ margin: 0, color: '#991b1b' }}>
            <strong>Error:</strong> {error}
          </p>
        </div>
      ) : weekPlans.length === 0 ? (
        <div style={{ padding: 24, background: '#fef3c7', borderRadius: 12, border: '1px solid #fcd34d' }}>
          <p style={{ margin: 0 }}>
            <strong>Setup Required:</strong> The Supabase database schema hasn't been configured yet. 
            Please run the SQL from <code>supabase/schema.sql</code> in your Supabase dashboard to set up the tables.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24 }}>
          {/* Calendar Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
            {weekPlans.map((day) => (
              <button
                key={day.date}
                onClick={() => setSelectedDay(day.date)}
                style={{
                  padding: 12,
                  borderRadius: 8,
                  border:
                    selectedDay === day.date
                      ? '2px solid #2563eb'
                      : '1px solid #e2e8f0',
                  background: selectedDay === day.date ? '#f0f9ff' : 'white',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                }}
              >
                <div style={{ fontWeight: 'bold' }}>{day.dayName}</div>
                <div style={{ fontSize: '0.9em', opacity: 0.7 }}>{day.date}</div>
                {day.plans.length > 0 && (
                  <div style={{ marginTop: 4, fontSize: '0.85em', color: '#2563eb' }}>
                    ● {day.plans.length} plan{day.plans.length !== 1 ? 's' : ''}
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Day Plans Panel */}
          <div
            style={{
              border: '1px solid #cbd5e1',
              borderRadius: 12,
              padding: 16,
              background: '#f9fafb',
            }}
          >
            {selectedDayPlans.length === 0 ? (
              <p style={{ opacity: 0.6 }}>No plans for this day.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {selectedDayPlans.map((plan) => (
                  <Link
                    key={plan.id}
                    href={`/p/${plan.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: 12,
                      borderRadius: 8,
                      background: 'white',
                      border: '1px solid #e2e8f0',
                      textDecoration: 'none',
                      color: 'inherit',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow =
                        '0 4px 12px rgba(0,0,0,0.1)';
                      e.currentTarget.style.borderColor = '#2563eb';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.borderColor = '#e2e8f0';
                    }}
                  >
                    <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                      {plan.title}
                    </div>
                    <div style={{ fontSize: '0.9em', opacity: 0.7 }}>
                      {plan.slot} • {plan.day_plan_blocks?.length || 0} block
                      {plan.day_plan_blocks?.length !== 1 ? 's' : ''}
                    </div>
                    {plan.notes && (
                      <div style={{ marginTop: 8, fontSize: '0.85em', opacity: 0.6 }}>
                        {plan.notes}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

function navBtn(): React.CSSProperties {
  return {
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid #94a3b8',
    background: 'white',
    cursor: 'pointer',
    fontFamily: 'inherit',
  };
}
