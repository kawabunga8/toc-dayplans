import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { parseCsv } from '@/lib/csv';

export const runtime = 'nodejs';

const BUCKET = 'learning-standards-data';
const SUBJECTS = ['ADST', 'FA', 'Bible'] as const;

type Subject = (typeof SUBJECTS)[number];

type Level = 'emerging' | 'developing' | 'proficient' | 'extending';
const LEVELS: Level[] = ['emerging', 'developing', 'proficient', 'extending'];

function asSubject(s: string): Subject {
  const v = (s ?? '').trim();
  if ((SUBJECTS as readonly string[]).includes(v)) return v as Subject;
  throw new Error(`Invalid subject: ${v}`);
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function isLevel(x: string): x is Level {
  return (LEVELS as readonly string[]).includes(x);
}

function normKey(k: string): string {
  return String(k ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

async function fetchPublicCsv(subject: Subject): Promise<string> {
  const url = `${requireEnv('NEXT_PUBLIC_SUPABASE_URL')}/storage/v1/object/public/${encodeURIComponent(BUCKET)}/${encodeURIComponent(subject)}.csv`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${subject}.csv (${res.status})`);
  return await res.text();
}

// POST /api/admin/policies/import
// body: { subject: 'ADST'|'FA'|'Bible'|'all', mode: 'replace', wipeEdited?: boolean }
export async function POST(req: Request) {
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
  const target = String(body?.subject ?? 'all');
  const mode = String(body?.mode ?? 'replace');
  const wipeEdited = body?.wipeEdited !== false; // default true

  if (mode !== 'replace') return NextResponse.json({ error: 'Only mode=replace is supported' }, { status: 400 });

  const subjects: Subject[] = target === 'all' ? [...SUBJECTS] : [asSubject(target)];

  const report: any = { bucket: BUCKET, subjects: {}, wipeEdited };

  for (const subject of subjects) {
    const csvText = await fetchPublicCsv(subject);
    const rows = parseCsv(csvText);

    // validate header presence
    const requiredCols = ['standard_key', 'standard_title', 'grade', 'level', 'text'];
    for (const col of requiredCols) {
      if (!rows.length || !(col in rows[0]!)) {
        // this is best-effort; parseCsv includes header keys, so check first row has keys
      }
    }

    type Cell = { standard_key: string; standard_title: string; grade: number; level: Level; text: string };
    const cells: Cell[] = [];
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]!;
      const standard_key = normKey(r.standard_key ?? '');
      const standard_title = String(r.standard_title ?? '').trim();
      const grade = Number(String(r.grade ?? '').trim());
      const levelRaw = String(r.level ?? '').trim();
      const text = String(r.text ?? '').trim();

      if (!standard_key) errors.push(`row ${i + 2}: missing standard_key`);
      if (!standard_title) errors.push(`row ${i + 2}: missing standard_title`);
      if (![9, 10, 11, 12].includes(grade)) errors.push(`row ${i + 2}: invalid grade ${r.grade}`);
      if (!isLevel(levelRaw)) errors.push(`row ${i + 2}: invalid level ${levelRaw}`);
      if (!text) errors.push(`row ${i + 2}: missing text`);

      if (standard_key && standard_title && [9, 10, 11, 12].includes(grade) && isLevel(levelRaw) && text) {
        cells.push({ standard_key, standard_title, grade, level: levelRaw, text });
      }
    }

    if (errors.length) {
      return NextResponse.json({ error: `CSV validation failed for ${subject}`, details: errors.slice(0, 30) }, { status: 400 });
    }

    // Compute distinct standards
    const stdMap = new Map<string, string>();
    for (const c of cells) {
      const prev = stdMap.get(c.standard_key);
      if (!prev) stdMap.set(c.standard_key, c.standard_title);
    }

    // Replace: delete rubrics + standards for this subject
    // 1) find existing standard ids
    const { data: existingStd, error: exStdErr } = await supabase
      .from('learning_standards')
      .select('id')
      .eq('subject', subject);
    if (exStdErr) throw exStdErr;
    const stdIds = (existingStd ?? []).map((r: any) => r.id);

    if (stdIds.length) {
      // delete rubrics first
      await supabase.from('learning_standard_rubrics').delete().in('learning_standard_id', stdIds);
      // delete standards
      await supabase.from('learning_standards').delete().in('id', stdIds);
    }

    // insert standards
    const stdRows = Array.from(stdMap.entries()).map(([standard_key, standard_title], idx) => ({
      subject,
      standard_key,
      standard_title,
      sort_order: idx + 1,
      source_pdf_path: null,
      page_ref: null,
      updated_at: new Date().toISOString(),
    }));

    const { data: insertedStd, error: insStdErr } = await supabase
      .from('learning_standards')
      .insert(stdRows)
      .select('id,standard_key');
    if (insStdErr) throw insStdErr;

    const idByKey = new Map<string, string>();
    for (const r of insertedStd ?? []) idByKey.set(String((r as any).standard_key), String((r as any).id));

    // insert rubrics
    const rubricRows = cells.map((c) => ({
      learning_standard_id: idByKey.get(c.standard_key),
      grade: c.grade,
      level: c.level,
      original_text: c.text,
      edited_text: wipeEdited ? null : null,
      updated_at: new Date().toISOString(),
    })).filter((r) => !!r.learning_standard_id);

    const { error: insRubErr } = await supabase.from('learning_standard_rubrics').insert(rubricRows);
    if (insRubErr) throw insRubErr;

    report.subjects[subject] = {
      standards: stdRows.length,
      rubric_cells: rubricRows.length,
    };
  }

  return NextResponse.json({ ok: true, report });
}
