'use client';

import { useEffect, useMemo, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabaseClient';

/**
 * Lightweight inline editor that ensures a toc_block_plans instance exists for a block,
 * and lets staff edit per-instance overrides without changing the class template defaults.
 *
 * This intentionally stores to toc_block_plans (instance) and does not mutate class_toc_templates.
 */
export default function TocBlockPlanInlineEditor(props: { dayPlanBlockId: string; classId: string }) {
  const { dayPlanBlockId: blockId, classId } = props;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [tocPlan, setTocPlan] = useState<any>(null);

  const [planMode, setPlanMode] = useState<'lesson_flow' | 'activity_options'>('lesson_flow');
  const [teacherName, setTeacherName] = useState('');
  const [taName, setTaName] = useState('');
  const [taRole, setTaRole] = useState('');
  const [phonePolicy, setPhonePolicy] = useState('Not permitted');
  const [noteTOC, setNoteTOC] = useState('');

  const className = useMemo(() => {
    // used just in a header; avoid another fetch if we don't have it
    return '';
  }, []);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseClient();

      // Load existing instance for this block (1:1 enforced by unique index)
      const { data: existing, error: existingErr } = await supabase
        .from('toc_block_plans')
        .select('*')
        .eq('day_plan_block_id', blockId)
        .maybeSingle();
      if (existingErr) throw existingErr;

      if (existing) {
        setTocPlan(existing);
        setPlanMode(existing.plan_mode);
        setTeacherName(existing.override_teacher_name ?? '');
        setTaName(existing.override_ta_name ?? '');
        setTaRole(existing.override_ta_role ?? '');
        setPhonePolicy(existing.override_phone_policy ?? 'Not permitted');
        setNoteTOC(existing.override_note_to_toc ?? '');
        setLoading(false);
        return;
      }

      // Ensure an instance exists (no template copy yet — this editor is only the override shell).
      // Pick the active template (newest updated_at) if present.
      const { data: tpl, error: tplErr } = await supabase
        .from('class_toc_templates')
        .select('*')
        .eq('class_id', classId)
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (tplErr) throw tplErr;

      const inferredPlanMode: 'lesson_flow' | 'activity_options' = (tpl?.plan_mode as any) ?? 'lesson_flow';

      const { data: created, error: createErr } = await supabase
        .from('toc_block_plans')
        .insert({
          day_plan_block_id: blockId,
          class_id: classId,
          template_id: tpl?.id ?? null,
          plan_mode: inferredPlanMode,
          override_teacher_name: null,
          override_ta_name: null,
          override_ta_role: null,
          override_phone_policy: null,
          override_note_to_toc: null,
        })
        .select('*')
        .single();
      if (createErr) throw createErr;

      setTocPlan(created);
      setPlanMode(created.plan_mode);
      setTeacherName('');
      setTaName('');
      setTaRole('');
      setPhonePolicy('Not permitted');
      setNoteTOC('');
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load TOC plan instance');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blockId]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const supabase = getSupabaseClient();

      const payload = {
        plan_mode: planMode,
        override_teacher_name: teacherName.trim() ? teacherName.trim() : null,
        override_ta_name: taName.trim() ? taName.trim() : null,
        override_ta_role: taRole.trim() ? taRole.trim() : null,
        override_phone_policy: phonePolicy || null,
        override_note_to_toc: noteTOC.trim() ? noteTOC.trim() : null,
      };

      if (tocPlan?.id) {
        const { error: upErr } = await supabase.from('toc_block_plans').update(payload).eq('id', tocPlan.id);
        if (upErr) throw upErr;
      } else {
        const { data: created, error: insErr } = await supabase
          .from('toc_block_plans')
          .insert({
            day_plan_block_id: blockId,
            class_id: classId,
            template_id: null,
            ...payload,
          })
          .select('*')
          .single();
        if (insErr) throw insErr;
        setTocPlan(created);
      }
    } catch (e: any) {
      setError(e?.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div style={{ marginTop: 12, opacity: 0.7 }}>Loading TOC content…</div>;

  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(0,0,0,0.12)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
        <h4 style={{ margin: 0 }}>TOC Plan</h4>
        {tocPlan?.template_id ? <div style={{ fontSize: 12, opacity: 0.75 }}>Template linked</div> : <div style={{ fontSize: 12, opacity: 0.75 }}>No template linked</div>}
      </div>

      {error && <div style={{ marginTop: 10, padding: 10, borderRadius: 10, background: '#FEE2E2', border: '1px solid #991b1b', color: '#7F1D1D' }}>{error}</div>}

      <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
        <label style={{ display: 'grid', gap: 6 }}>
          <span>Plan Mode</span>
          <select
            value={planMode}
            onChange={(e) => setPlanMode(e.target.value as 'lesson_flow' | 'activity_options')}
            style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1' }}
          >
            <option value="lesson_flow">Lesson Flow (time-based phases)</option>
            <option value="activity_options">Activity Options (student choices)</option>
          </select>
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span>Teacher Name (override)</span>
          <input
            type="text"
            value={teacherName}
            onChange={(e) => setTeacherName(e.target.value)}
            placeholder="Leave blank to use class template"
            style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1' }}
          />
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span>TA Name (override)</span>
          <input
            type="text"
            value={taName}
            onChange={(e) => setTaName(e.target.value)}
            placeholder="Leave blank to use class template"
            style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1' }}
          />
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span>TA Role (override)</span>
          <input
            type="text"
            value={taRole}
            onChange={(e) => setTaRole(e.target.value)}
            placeholder="Leave blank to use class template"
            style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1' }}
          />
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span>Phone Policy</span>
          <select value={phonePolicy} onChange={(e) => setPhonePolicy(e.target.value)} style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1' }}>
            <option value="Not permitted">Not permitted</option>
            <option value="Allowed in back">Allowed in back</option>
            <option value="Allowed with permission">Allowed with permission</option>
          </select>
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span>Note to TOC</span>
          <textarea
            value={noteTOC}
            onChange={(e) => setNoteTOC(e.target.value)}
            rows={3}
            placeholder="Any special instructions for the TOC"
            style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1' }}
          />
        </label>

        <button onClick={save} disabled={saving} style={btn()}>
          {saving ? 'Saving…' : 'Save TOC Plan'}
        </button>
      </div>
    </div>
  );
}

function btn(): React.CSSProperties {
  return {
    padding: '10px 12px',
    borderRadius: 10,
    background: '#2563eb',
    color: 'white',
    border: 0,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 800,
  };
}
