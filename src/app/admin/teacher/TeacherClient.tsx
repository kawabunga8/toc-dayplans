'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { TEACHER_ROLES, buildSection1FromFields, STANDING_GUARDRAILS } from '@/lib/teacherSuperprompt/superprompt';

type RoleId = 1 | 2 | 3 | 4 | 5 | 6;

type Phase = { time_text: string; phase_text: string; activity_text: string; purpose_text: string };

const RCS = {
  deepNavy: '#1F4E79',
  midBlue: '#2E75B6',
  lightBlue: '#D6E4F0',
  gold: '#C9A84C',
  white: '#FFFFFF',
  textDark: '#1A1A1A',
} as const;

export default function TeacherClient() {
  const [roleId, setRoleId] = useState<RoleId>(1);

  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState('');
  const [classSize, setClassSize] = useState('');
  const [diversity, setDiversity] = useState('');
  const [standards, setStandards] = useState('');
  const [unitTopic, setUnitTopic] = useState('');
  const [unitStage, setUnitStage] = useState('');
  const [tools, setTools] = useState('');
  const [notWorked, setNotWorked] = useState('');

  const [task, setTask] = useState('');
  const [constraints, setConstraints] = useState('');

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [phases, setPhases] = useState<Phase[] | null>(null);

  const role = useMemo(() => TEACHER_ROLES.find((r) => r.id === roleId)!, [roleId]);
  const section1 = useMemo(
    () =>
      buildSection1FromFields({
        subject,
        grade,
        classSize,
        diversity,
        standards,
        unitTopic,
        unitStage,
        tools,
        notWorked,
      }),
    [subject, grade, classSize, diversity, standards, unitTopic, unitStage, tools, notWorked]
  );

  const fullPromptPreview = useMemo(() => {
    return `${section1}\n\n---\n\n${role.prompt}\n\n---\n\n${STANDING_GUARDRAILS}`;
  }, [section1, role.prompt]);

  return (
    <main style={{ padding: 24, maxWidth: 1100, margin: '0 auto', fontFamily: 'system-ui', background: RCS.white, color: RCS.textDark }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, color: RCS.deepNavy }}>Teacher</h1>
          <p style={{ marginTop: 6, opacity: 0.85 }}>Generate lesson flow suggestions using the Educator Superprompt (role + context + guardrails).</p>
        </div>
        <Link href="/admin" style={{ textDecoration: 'none', fontWeight: 900, color: RCS.deepNavy, border: `1px solid ${RCS.gold}`, padding: '8px 10px', borderRadius: 10 }}>
          ← Admin
        </Link>
      </div>

      <section style={{ marginTop: 16, border: `1px solid ${RCS.deepNavy}`, borderRadius: 12, padding: 16 }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Section 1 — Teaching context</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
          <Field label="Subject / Course" value={subject} setValue={setSubject} placeholder="e.g., ADST" />
          <Field label="Year/Grade" value={grade} setValue={setGrade} placeholder="e.g., Grade 7" />
          <Field label="Class size" value={classSize} setValue={setClassSize} placeholder="e.g., 28" />
          <Field label="Learner diversity" value={diversity} setValue={setDiversity} placeholder="e.g., EAL, IEP, mixed prior knowledge" />
          <Field label="Standards" value={standards} setValue={setStandards} placeholder="e.g., ADST — Define / Ideate" />
          <Field label="Unit topic" value={unitTopic} setValue={setUnitTopic} placeholder="e.g., Design thinking" />
          <Field label="Unit stage" value={unitStage} setValue={setUnitStage} placeholder="e.g., mid-unit" />
          <Field label="Tools/platforms" value={tools} setValue={setTools} placeholder="e.g., no devices" />
          <Field label="Hasn't worked well" value={notWorked} setValue={setNotWorked} placeholder="e.g., long lectures" />
        </div>
      </section>

      <section style={{ marginTop: 16, border: `1px solid ${RCS.deepNavy}`, borderRadius: 12, padding: 16 }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Section 2 — Choose your role</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
          {TEACHER_ROLES.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRoleId(r.id as RoleId)}
              style={{
                textAlign: 'left',
                borderRadius: 12,
                padding: 12,
                border: `1px solid ${roleId === r.id ? r.color : RCS.deepNavy}`,
                background: roleId === r.id ? `${r.color}1A` : '#fff',
                cursor: 'pointer',
              }}
            >
              <div style={{ fontSize: 18 }}>{r.emoji} <span style={{ fontWeight: 900, color: roleId === r.id ? r.color : RCS.textDark }}>{r.short}</span></div>
              <div style={{ fontSize: 12, opacity: 0.9, marginTop: 4 }}>{r.label}</div>
              <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>{r.description}</div>
            </button>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 16, border: `1px solid ${RCS.deepNavy}`, borderRadius: 12, padding: 16 }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Generate lesson flow</div>
        <label style={{ display: 'grid', gap: 6, marginBottom: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.8 }}>Task</div>
          <textarea value={task} onChange={(e) => setTask(e.target.value)} rows={3} style={styles.textarea} placeholder="What are we building today?" />
        </label>
        <label style={{ display: 'grid', gap: 6, marginBottom: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.8 }}>Constraints (optional)</div>
          <textarea value={constraints} onChange={(e) => setConstraints(e.target.value)} rows={2} style={styles.textarea} placeholder="Time, tech limits, group needs, must-include elements…" />
        </label>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            disabled={loading}
            onClick={async () => {
              setLoading(true);
              setErr(null);
              setPhases(null);
              try {
                const res = await fetch('/api/ai/suggest', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    section: 'teacher_lesson_flow_phases',
                    input: {
                      role_id: roleId,
                      section1_fields: { subject, grade, class_size: classSize, diversity, standards, unit_topic: unitTopic, unit_stage: unitStage, tools, not_worked: notWorked },
                      task,
                      constraints,
                    },
                  }),
                });
                const j = await res.json();
                if (!res.ok) throw new Error(j?.error ?? 'AI suggest failed');
                setPhases(j?.suggestion?.lesson_flow_phases ?? null);
              } catch (e: any) {
                setErr(e?.message ?? 'AI suggest failed');
              } finally {
                setLoading(false);
              }
            }}
            style={styles.primaryBtn}
          >
            {loading ? 'Generating…' : 'Generate'}
          </button>

          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(fullPromptPreview);
            }}
            style={styles.secondaryBtn}
          >
            Copy full superprompt (preview)
          </button>

          {phases ? (
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(JSON.stringify({ lesson_flow_phases: phases }, null, 2));
              }}
              style={styles.secondaryBtn}
            >
              Copy phases JSON
            </button>
          ) : null}
        </div>

        {err ? <div style={{ marginTop: 10, color: '#B00020', fontWeight: 800 }}>{err}</div> : null}

        {phases ? (
          <div style={{ marginTop: 12, border: `1px solid ${RCS.gold}`, borderRadius: 12, padding: 12, background: '#fffdf2' }}>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>Preview</div>
            <div style={{ display: 'grid', gap: 8 }}>
              {phases.map((p, idx) => (
                <div key={idx} style={{ borderTop: idx ? '1px solid rgba(0,0,0,0.08)' : 'none', paddingTop: idx ? 8 : 0 }}>
                  <div style={{ fontWeight: 900 }}>{p.time_text || `Phase ${idx + 1}`} — {p.phase_text}</div>
                  <div style={{ fontSize: 12, opacity: 0.9, marginTop: 4 }}><b>Activity:</b> {p.activity_text}</div>
                  <div style={{ fontSize: 12, opacity: 0.9, marginTop: 4 }}><b>Purpose:</b> {p.purpose_text}</div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}

function Field(props: { label: string; value: string; setValue: (v: string) => void; placeholder?: string }) {
  return (
    <label style={{ display: 'grid', gap: 6 }}>
      <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.8 }}>{props.label}</div>
      <input value={props.value} onChange={(e) => props.setValue(e.target.value)} style={styles.input} placeholder={props.placeholder} />
    </label>
  );
}

const styles: Record<string, React.CSSProperties> = {
  input: { padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.2)', fontSize: 14 },
  textarea: { padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.2)', fontSize: 14, fontFamily: 'inherit' },
  primaryBtn: {
    padding: '10px 12px',
    borderRadius: 10,
    border: `1px solid ${RCS.gold}`,
    background: RCS.deepNavy,
    color: '#fff',
    fontWeight: 900,
    cursor: 'pointer',
  },
  secondaryBtn: {
    padding: '10px 12px',
    borderRadius: 10,
    border: `1px solid ${RCS.deepNavy}`,
    background: 'transparent',
    color: RCS.deepNavy,
    fontWeight: 900,
    cursor: 'pointer',
  },
};
