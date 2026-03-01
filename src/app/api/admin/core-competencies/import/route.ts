import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { parseCsv } from '@/lib/csv';

export const runtime = 'nodejs';

const BUCKET = 'core-competencies-data';
const CANDIDATE_FILES = [
  'core_competencies.csv',
  'core-competencies.csv',
  'Core Competencies.csv',
  'BC_Core_Competencies_Facets.csv',
  'BC_Core_Competencies_Facets (1).csv',
] as const;

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

async function fetchFirstAvailableCsv(): Promise<{ filename: string; text: string }>
{
  const base = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  for (const fn of CANDIDATE_FILES) {
    const url = `${base}/storage/v1/object/public/${encodeURIComponent(BUCKET)}/${encodeURIComponent(fn)}`;
    const res = await fetch(url);
    if (res.ok) return { filename: fn, text: await res.text() };
  }
  // If none of the known names worked, give a helpful error.
  throw new Error(
    `Could not fetch a CSV from bucket ${BUCKET}. Expected one of: ${CANDIDATE_FILES.join(', ')}`
  );
}

// POST /api/admin/core-competencies/import
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

  type InRow = { domain: string; sub: string; facet: string };
  const inRows: InRow[] = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]!;
    const domain = String((r['Core Competency'] ?? r.core_competency ?? r.coreCompetency ?? '')).trim();
    const sub = String((r['Sub-Competency'] ?? r.sub_competency ?? r.subCompetency ?? '')).trim();
    const facet = String((r['Facet Name'] ?? r.facet_name ?? r.facetName ?? '')).trim();

    if (!domain) errors.push(`row ${i + 2}: missing Core Competency`);
    if (!sub) errors.push(`row ${i + 2}: missing Sub-Competency`);
    if (!facet) errors.push(`row ${i + 2}: missing Facet Name`);

    if (domain && sub && facet) inRows.push({ domain, sub, facet });
  }

  if (errors.length) {
    return NextResponse.json({ error: 'CSV validation failed', filename, details: errors.slice(0, 50) }, { status: 400 });
  }

  // Replace: wipe existing taxonomy
  // Facets -> subcompetencies -> domains
  const d1 = await supabase
    .from('core_competency_facets')
    .delete()
    // avoid PostgREST requiring a filter by using a harmless always-true UUID predicate
    .neq('id', '00000000-0000-0000-0000-000000000000');
  if (d1.error)
    return NextResponse.json(
      {
        error: d1.error.message,
        step: 'delete_facets',
        filename,
        code: d1.error.code,
        details: d1.error.details,
        hint: (d1.error as any).hint ?? null,
        note: 'If this says relation does not exist, run supabase/schema_core_competencies.sql in Supabase SQL Editor first.',
      },
      { status: 400 }
    );

  const d2 = await supabase
    .from('core_competency_subcompetencies')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  if (d2.error)
    return NextResponse.json(
      {
        error: d2.error.message,
        step: 'delete_subcompetencies',
        filename,
        code: d2.error.code,
        details: d2.error.details,
        hint: (d2.error as any).hint ?? null,
      },
      { status: 400 }
    );

  const d3 = await supabase
    .from('core_competency_domains')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  if (d3.error)
    return NextResponse.json(
      {
        error: d3.error.message,
        step: 'delete_domains',
        filename,
        code: d3.error.code,
        details: d3.error.details,
        hint: (d3.error as any).hint ?? null,
      },
      { status: 400 }
    );

  // Insert domains
  const domains = Array.from(new Set(inRows.map((r) => r.domain)));
  const { data: domRows, error: domErr } = await supabase
    .from('core_competency_domains')
    .insert(domains.map((name, idx) => ({ name, sort_order: idx + 1, updated_at: new Date().toISOString() })))
    .select('id,name');
  if (domErr)
    return NextResponse.json(
      { error: domErr.message, step: 'insert_domains', filename, code: domErr.code, details: domErr.details, hint: (domErr as any).hint ?? null },
      { status: 400 }
    );

  const domIdByName = new Map<string, string>();
  for (const r of domRows ?? []) domIdByName.set(String((r as any).name), String((r as any).id));

  // Insert subcompetencies
  const subsKeyed: Array<{ domain: string; sub: string }> = [];
  const seenSub = new Set<string>();
  for (const r of inRows) {
    const k = `${r.domain}::${r.sub}`;
    if (seenSub.has(k)) continue;
    seenSub.add(k);
    subsKeyed.push({ domain: r.domain, sub: r.sub });
  }

  const { data: subRows, error: subErr } = await supabase
    .from('core_competency_subcompetencies')
    .insert(
      subsKeyed.map((x, idx) => ({
        domain_id: domIdByName.get(x.domain),
        name: x.sub,
        sort_order: idx + 1,
        updated_at: new Date().toISOString(),
      }))
    )
    .select('id,domain_id,name');
  if (subErr)
    return NextResponse.json(
      { error: subErr.message, step: 'insert_subcompetencies', filename, code: subErr.code, details: subErr.details, hint: (subErr as any).hint ?? null },
      { status: 400 }
    );

  const subIdByKey = new Map<string, string>();
  for (const r of subRows ?? []) {
    const domId = String((r as any).domain_id);
    const name = String((r as any).name);
    subIdByKey.set(`${domId}::${name}`, String((r as any).id));
  }

  // Insert facets
  const facetRows = inRows.map((r) => {
    const domId = domIdByName.get(r.domain);
    const subId = domId ? subIdByKey.get(`${domId}::${r.sub}`) : null;
    return {
      subcompetency_id: subId,
      name: r.facet,
      updated_at: new Date().toISOString(),
    };
  }).filter((r) => !!r.subcompetency_id);

  const { error: facErr } = await supabase.from('core_competency_facets').insert(facetRows);
  if (facErr)
    return NextResponse.json(
      { error: facErr.message, step: 'insert_facets', filename, code: facErr.code, details: facErr.details, hint: (facErr as any).hint ?? null },
      { status: 400 }
    );

    return NextResponse.json({ ok: true, filename, counts: { domains: domains.length, subcompetencies: subsKeyed.length, facets: facetRows.length } });
  } catch (e: any) {
    return NextResponse.json(
      {
        error: 'Unhandled import error',
        message: String(e?.message ?? e),
        hint: 'If this is your first run, make sure you ran the SQL to create the core_competency_* tables in Supabase.',
      },
      { status: 500 }
    );
  }
}
