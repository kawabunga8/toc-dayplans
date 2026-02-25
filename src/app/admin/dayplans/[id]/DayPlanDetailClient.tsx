'use client';

import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabaseClient';
import type { DayPlan } from '@/lib/types';

interface Block {
  id: string;
  start_time: string;
  end_time: string;
  room: string;
  class_name: string;
  details: string | null;
  class_id: string | null;
}

interface TocBlockPlan {
  id: string;
  plan_mode: 'lesson_flow' | 'activity_options';
  override_teacher_name: string | null;
  override_ta_name: string | null;
  override_ta_role: string | null;
  override_phone_policy: string | null;
  override_note_to_toc: string | null;
}

type Status = 'idle' | 'loading' | 'saving' | 'error';

export default function DayPlanDetailClient({ planId }: { planId: string }) {
  const [plan, setPlan] = useState<DayPlan | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [tocContent, setTocContent] = useState<Record<string, TocBlockPlan>>({});
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const [editingPlanTitle, setEditingPlanTitle] = useState('');
  const [editingPlanNotes, setEditingPlanNotes] = useState('');
  const [editingPlanVisibility, setEditingPlanVisibility] = useState<'private' | 'link'>('private');

  // Block form
  const [newBlockStartTime, setNewBlockStartTime] = useState('09:00');
  const [newBlockEndTime, setNewBlockEndTime] = useState('10:00');
  const [newBlockRoom, setNewBlockRoom] = useState('');
  const [newBlockClassName, setNewBlockClassName] = useState('');
  const [newBlockDetails, setNewBlockDetails] = useState('');
  const [showBlockForm, setShowBlockForm] = useState(false);

  // TOC content editing
  const [expandedBlockId, setExpandedBlockId] = useState<string | null>(null);

  async function load() {
    setStatus('loading');
    setError(null);
    try {
      const supabase = getSupabaseClient();
      const { data: planData, error: planError } = await supabase
        .from('day_plans')
        .select('*')
        .eq('id', planId)
        .single();

      if (planError) throw planError;
      setPlan(planData as DayPlan);
      setEditingPlanTitle(planData.title);
      setEditingPlanNotes(planData.notes || '');
      setEditingPlanVisibility(planData.visibility || 'private');

      const { data: blockData, error: blockError } = await supabase
        .from('day_plan_blocks')
        .select('*')
        .eq('day_plan_id', planId)
        .order('start_time', { ascending: true });

      if (blockError) throw blockError;
      setBlocks((blockData ?? []) as Block[]);

      // Load TOC content for each block
      if (blockData && blockData.length > 0) {
        const { data: tocData, error: tocError } = await supabase
          .from('toc_block_plans')
          .select('*')
          .in('day_plan_block_id', (blockData as any[]).map((b: any) => b.id));

        if (!tocError && tocData) {
          const tocMap: Record<string, TocBlockPlan> = {};
          (tocData as any[]).forEach((t: any) => {
            tocMap[t.day_plan_block_id] = t;
          });
          setTocContent(tocMap);
        }
      }

      setStatus('idle');
    } catch (e: any) {
      setStatus('error');
      setError(e?.message ?? 'Failed to load dayplan');
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId]);

  async function updatePlanHeader() {
    setStatus('saving');
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('day_plans')
        .update({
          title: editingPlanTitle,
          notes: editingPlanNotes || null,
          visibility: editingPlanVisibility,
        })
        .eq('id', planId);

      if (error) throw error;
      setPlan({
        ...plan!,
        title: editingPlanTitle,
        notes: editingPlanNotes || null,
        visibility: editingPlanVisibility,
      });
      setStatus('idle');
    } catch (e: any) {
      setStatus('error');
      setError(e?.message ?? 'Failed to update plan');
    }
  }

  async function addBlock() {
    if (!newBlockRoom || !newBlockClassName) {
      setError('Room and class name required');
      return;
    }

    setStatus('saving');
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('day_plan_blocks')
        .insert({
          day_plan_id: planId,
          start_time: newBlockStartTime,
          end_time: newBlockEndTime,
          room: newBlockRoom,
          class_name: newBlockClassName,
          details: newBlockDetails || null,
        })
        .select()
        .single();

      if (error) throw error;

      setBlocks([...blocks, data as Block]);
      setNewBlockStartTime('09:00');
      setNewBlockEndTime('10:00');
      setNewBlockRoom('');
      setNewBlockClassName('');
      setNewBlockDetails('');
      setShowBlockForm(false);
      setStatus('idle');
    } catch (e: any) {
      setStatus('error');
      setError(e?.message ?? 'Failed to add block');
    }
  }

  async function deleteBlock(blockId: string) {
    if (!confirm('Delete this block?')) return;

    setStatus('saving');
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.from('day_plan_blocks').delete().eq('id', blockId);
      if (error) throw error;

      setBlocks(blocks.filter((b) => b.id !== blockId));
      const newToc = { ...tocContent };
      delete newToc[blockId];
      setTocContent(newToc);
      setStatus('idle');
    } catch (e: any) {
      setStatus('error');
      setError(e?.message ?? 'Failed to delete block');
    }
  }

  if (status === 'loading') return <div style={{ padding: 24 }}>Loading…</div>;

  return (
    <main style={{ padding: 24, maxWidth: 1000, margin: '0 auto', fontFamily: 'system-ui' }}>
      <h1>Dayplan Details</h1>

      {error && (
        <div style={{ padding: 12, borderRadius: 10, border: '1px solid #fecaca', background: '#fee2e2', marginBottom: 16 }}>
          {error}
        </div>
      )}

      {plan && (
        <section style={{ border: '1px solid #cbd5e1', borderRadius: 12, padding: 16, marginBottom: 24 }}>
          <h2 style={{ marginTop: 0 }}>Plan Details</h2>
          <div style={{ display: 'grid', gap: 10 }}>
            <label style={{ display: 'grid', gap: 6 }}>
              <span>Title</span>
              <input
                type="text"
                value={editingPlanTitle}
                onChange={(e) => setEditingPlanTitle(e.target.value)}
                style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1' }}
              />
            </label>

            <label style={{ display: 'grid', gap: 6 }}>
              <span>Notes</span>
              <textarea
                value={editingPlanNotes}
                onChange={(e) => setEditingPlanNotes(e.target.value)}
                rows={3}
                style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1' }}
              />
            </label>

            <label style={{ display: 'grid', gap: 6 }}>
              <span>Visibility</span>
              <select
                value={editingPlanVisibility}
                onChange={(e) => setEditingPlanVisibility(e.target.value as 'private' | 'link')}
                style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1' }}
              >
                <option value="private">Private (staff only)</option>
                <option value="link">Public (TOC can see)</option>
              </select>
            </label>

            <button onClick={updatePlanHeader} disabled={status === 'saving'} style={btn()}>
              {status === 'saving' ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </section>
      )}

      <section style={{ border: '1px solid #cbd5e1', borderRadius: 12, padding: 16 }}>
        <h2 style={{ marginTop: 0 }}>Schedule Blocks</h2>

        {blocks.length === 0 ? (
          <div style={{ opacity: 0.8, marginBottom: 16 }}>No blocks yet. Add your first block below.</div>
        ) : (
          <div style={{ display: 'grid', gap: 10, marginBottom: 20 }}>
            {blocks.map((block) => (
              <div key={block.id} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>
                      {block.start_time}–{block.end_time}
                    </div>
                    <div>{block.class_name}</div>
                    <div style={{ opacity: 0.7, fontSize: 14 }}>{block.room}</div>
                    {block.details && <div style={{ opacity: 0.75, fontSize: 14, marginTop: 4 }}>{block.details}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => setExpandedBlockId(expandedBlockId === block.id ? null : block.id)}
                      style={btnOutline()}
                    >
                      {expandedBlockId === block.id ? 'Hide' : 'Edit TOC'}
                    </button>
                    <button onClick={() => deleteBlock(block.id)} style={{ ...btnOutline(), color: '#dc2626' }}>
                      Delete
                    </button>
                  </div>
                </div>

                {expandedBlockId === block.id && (
                  <TocBlockEditor blockId={block.id} className={block.class_name} onUpdate={load} />
                )}
              </div>
            ))}
          </div>
        )}

        {showBlockForm && (
          <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, marginBottom: 16, background: '#f9fafb' }}>
            <h3 style={{ marginTop: 0 }}>Add Block</h3>
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <label style={{ display: 'grid', gap: 6 }}>
                  <span>Start Time</span>
                  <input
                    type="time"
                    value={newBlockStartTime}
                    onChange={(e) => setNewBlockStartTime(e.target.value)}
                    style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1' }}
                  />
                </label>
                <label style={{ display: 'grid', gap: 6 }}>
                  <span>End Time</span>
                  <input
                    type="time"
                    value={newBlockEndTime}
                    onChange={(e) => setNewBlockEndTime(e.target.value)}
                    style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1' }}
                  />
                </label>
              </div>

              <label style={{ display: 'grid', gap: 6 }}>
                <span>Room</span>
                <input
                  type="text"
                  value={newBlockRoom}
                  onChange={(e) => setNewBlockRoom(e.target.value)}
                  placeholder="e.g., 101"
                  style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1' }}
                />
              </label>

              <label style={{ display: 'grid', gap: 6 }}>
                <span>Class Name</span>
                <input
                  type="text"
                  value={newBlockClassName}
                  onChange={(e) => setNewBlockClassName(e.target.value)}
                  placeholder="e.g., Math 9A"
                  style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1' }}
                />
              </label>

              <label style={{ display: 'grid', gap: 6 }}>
                <span>Details (optional)</span>
                <textarea
                  value={newBlockDetails}
                  onChange={(e) => setNewBlockDetails(e.target.value)}
                  rows={2}
                  style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1' }}
                />
              </label>

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={addBlock} disabled={status === 'saving'} style={btn()}>
                  {status === 'saving' ? 'Adding…' : 'Add Block'}
                </button>
                <button onClick={() => setShowBlockForm(false)} style={btnOutline()}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {!showBlockForm && (
          <button onClick={() => setShowBlockForm(true)} style={btnOutline()}>
            + Add Block
          </button>
        )}
      </section>
    </main>
  );
}

function TocBlockEditor({ blockId, className }: { blockId: string; className: string; onUpdate: () => void }) {
  const [tocPlan, setTocPlan] = useState<TocBlockPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [planMode, setPlanMode] = useState<'lesson_flow' | 'activity_options'>('lesson_flow');
  const [teacherName, setTeacherName] = useState('');
  const [taName, setTaName] = useState('');
  const [taRole, setTaRole] = useState('');
  const [phonePolicy, setPhonePolicy] = useState('Not permitted');
  const [noteTOC, setNoteTOC] = useState('');

  useEffect(() => {
    (async () => {
      const supabase = getSupabaseClient();
      const { data } = await supabase.from('toc_block_plans').select('*').eq('day_plan_block_id', blockId).single();

      if (data) {
        setTocPlan(data as TocBlockPlan);
        setPlanMode(data.plan_mode);
        setTeacherName(data.override_teacher_name || '');
        setTaName(data.override_ta_name || '');
        setTaRole(data.override_ta_role || '');
        setPhonePolicy(data.override_phone_policy || 'Not permitted');
        setNoteTOC(data.override_note_to_toc || '');
      }
      setLoading(false);
    })();
  }, [blockId]);

  async function saveTocPlan() {
    const supabase = getSupabaseClient();
    try {
      if (tocPlan) {
        await supabase
          .from('toc_block_plans')
          .update({
            plan_mode: planMode,
            override_teacher_name: teacherName || null,
            override_ta_name: taName || null,
            override_ta_role: taRole || null,
            override_phone_policy: phonePolicy || null,
            override_note_to_toc: noteTOC || null,
          })
          .eq('id', tocPlan.id);
      } else {
        await supabase.from('toc_block_plans').insert({
          day_plan_block_id: blockId,
          class_id: null, // Link to class if needed
          plan_mode: planMode,
          template_id: null,
          override_teacher_name: teacherName || null,
          override_ta_name: taName || null,
          override_ta_role: taRole || null,
          override_phone_policy: phonePolicy || null,
          override_note_to_toc: noteTOC || null,
        });
      }
    } catch (e: any) {
      alert('Failed to save: ' + e.message);
    }
  }

  if (loading) return <div style={{ marginTop: 12, opacity: 0.7 }}>Loading TOC content…</div>;

  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #e2e8f0' }}>
      <h4 style={{ marginTop: 0 }}>TOC Plan for {className}</h4>
      <div style={{ display: 'grid', gap: 10 }}>
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
          <select
            value={phonePolicy}
            onChange={(e) => setPhonePolicy(e.target.value)}
            style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1' }}
          >
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

        <button onClick={saveTocPlan} style={btn()}>
          Save TOC Plan
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
  };
}

function btnOutline(): React.CSSProperties {
  return {
    padding: '10px 12px',
    borderRadius: 10,
    border: '1px solid #94a3b8',
    color: '#0f172a',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: 14,
  };
}
