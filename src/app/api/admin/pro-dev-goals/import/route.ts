import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { parseCsv } from '@/lib/csv';

export const runtime = 'nodejs';

const BUCKET = 'professional-development';
const CANDIDATE_FILES = ['Pro_Dev_Goals.csv', 'pro_dev_goals.csv', 'pro-dev-goals.csv'] as const;

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

async function fetchFirstAvailableCsv(): Promise<{ filename: string; text: string }> {
  const base = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  for (const fn of CANDIDATE_FILES) {
    const url = `${base}/storage/v1/object/public/${encodeURIComponent(BUCKET)}/${encodeURIComponent(fn)}`;
    const res = await fetch(url);
    if (res.ok) return { filename: fn, text: await res.text() };
  }
  throw new Error(`Could not fetch a CSV from bucket ${BUCKET}. Expected one of: ${CANDIDATE_FILES.join(', ')}`);
}

// POST /api/admin/pro-dev-goals/import
// body: { mode: 'replace' }
export async function POST(req: Request) {
  try {
    const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
    const anon = requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

    const cookieStore = await cookies();
    const supabase = createServerClient(url, anon, {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (all: Array<{ name: string; value: string; options?: any }>) => {
          for (const c of all) cookieStore.set(c);
        },
      },
    });

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { data: isStaff, error: staffErr } = await supabase.rpc('is_staff');
    if (staffErr || !isStaff) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const mode = String(body?.mode ?? 'replace');
    if (mode !== 'replace') return NextResponse.json({ error: 'Only mode=replace is supported' }, { status: 400 });

    const { filename, text } = await fetchFirstAvailableCsv();
    const rows = parseCsv(text);

    const errors: string[] = [];

    type InRow = {
      goal_id: string;
      goal_description: string;
      research_focus: string | null;
      action_taken: string | null;
      evidence_date: string | null;
      reflection_notes: string | null;
    };

    const inRows: InRow[] = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i] ?? {};
      const goal_id = String(r['Goal_ID'] ?? r.goal_id ?? r.goalId ?? '').trim();
      const goal_description = String(r['Goal_Description'] ?? r.goal_description ?? r.goalDescription ?? '').trim();
      const research_focus = String(r['Research_Focus'] ?? r.research_focus ?? r.researchFocus ?? '').trim();
      const action_taken = String(r['Action_Taken'] ?? r.action_taken ?? r.actionTaken ?? '').trim();
      const evidence_date = String(r['Evidence_Date'] ?? r.evidence_date ?? r.evidenceDate ?? '').trim();
      const reflection_notes = String(r['Reflection_Notes'] ?? r.reflection_notes ?? r.reflectionNotes ?? '').trim();

      if (!goal_id) errors.push(`row ${i + 2}: missing Goal_ID`);
      if (!goal_description) errors.push(`row ${i + 2}: missing Goal_Description`);

      if (goal_id && goal_description) {
        inRows.push({
          goal_id,
          goal_description,
          research_focus: research_focus || null,
          action_taken: action_taken || null,
          evidence_date: evidence_date || null,
          reflection_notes: reflection_notes || null,
        });
      }
    }

    if (errors.length) {
      return NextResponse.json({ error: 'CSV validation failed', filename, details: errors.slice(0, 50) }, { status: 400 });
    }

    const d1 = await supabase
      .from('professional_development_goals')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (d1.error) {
      return NextResponse.json(
        {
          error: d1.error.message,
          step: 'delete_existing',
          filename,
          code: d1.error.code,
          details: d1.error.details,
          hint: (d1.error as any).hint ?? null,
          note: 'If this says relation does not exist, run supabase/schema_professional_development.sql in Supabase SQL Editor first.',
        },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const outRows = inRows.map((r, idx) => ({
      goal_id: r.goal_id,
      goal_description: r.goal_description,
      research_focus: r.research_focus,
      action_taken: r.action_taken,
      evidence_date: r.evidence_date,
      reflection_notes: r.reflection_notes,
      sort_order: idx + 1,
      updated_at: now,
    }));

    const { error: insErr } = await supabase.from('professional_development_goals').insert(outRows);
    if (insErr) {
      return NextResponse.json(
        { error: insErr.message, step: 'insert_rows', filename, code: insErr.code, details: insErr.details, hint: (insErr as any).hint ?? null },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, filename, counts: { goals: outRows.length } });
  } catch (e: any) {
    return NextResponse.json(
      {
        error: 'Unhandled import error',
        message: String(e?.message ?? e),
        hint: 'If this is your first run, make sure you ran the SQL to create the professional_development_goals table in Supabase.',
      },
      { status: 500 }
    );
  }
}
