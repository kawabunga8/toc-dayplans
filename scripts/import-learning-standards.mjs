#!/usr/bin/env node
/*
  Import Learning Standards PDFs into Supabase tables:
    - learning_standards(subject, grade, standard_key, standard_title)
    - learning_standard_levels(learning_standard_id, level, original_text)

  Requirements:
    - `pdftotext` installed
    - env:
        NEXT_PUBLIC_SUPABASE_URL
        SUPABASE_SERVICE_ROLE_KEY   (recommended)
      Alternatively you can try NEXT_PUBLIC_SUPABASE_ANON_KEY but inserts will usually fail under RLS.

  Usage:
    node scripts/import-learning-standards.mjs --subject ADST --pdf /path/to/adst.pdf
    node scripts/import-learning-standards.mjs --subject FA   --pdf /path/to/fa.pdf

  Notes:
    This parser is best-effort for columnar rubric PDFs. Review results in Admin → Policies.
*/

import { execSync } from 'node:child_process';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';

function arg(name) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return null;
  return process.argv[idx + 1] ?? null;
}

const subject = (arg('--subject') ?? '').trim();
const pdf = arg('--pdf');

if (!subject) {
  console.error('Missing --subject (e.g., ADST, FA)');
  process.exit(1);
}
if (!pdf) {
  console.error('Missing --pdf /path/to/file.pdf');
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url) {
  console.error('Missing env NEXT_PUBLIC_SUPABASE_URL');
  process.exit(1);
}
if (!serviceKey && !anonKey) {
  console.error('Missing env SUPABASE_SERVICE_ROLE_KEY (recommended) or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(url, serviceKey || anonKey, { auth: { persistSession: false } });

function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);
}

function cleanLines(lines) {
  return lines
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter((l) => l.length > 0);
}

function isHeading(line) {
  return /^((ADST )?Learning Standard:)/i.test(line);
}

function parseRubricText(text) {
  // Bible rubrics have a different layout (columns get interleaved in pdftotext output).
  // Use a dedicated heuristic parser.
  if (String(subject).toLowerCase() === 'bible') {
    return parseBibleRubricText(text);
  }

  const rawLines = text.split(/\r?\n/);

  // Segment by "Learning Standard:" headings.
  const sections = [];
  let current = null;

  for (const line0 of rawLines) {
    const line = line0.trim();
    if (isHeading(line)) {
      if (current) sections.push(current);
      const title = line.replace(/^(ADST\s+)?Learning Standard:\s*/i, '').trim();
      current = { title, lines: [] };
      continue;
    }
    if (current) current.lines.push(line0);
  }
  if (current) sections.push(current);

  // Parse each section into grade->level->text.
  const out = [];

  for (const sec of sections) {
    const lines = cleanLines(sec.lines);

    /** @type {null|9|10|11|12} */
    let grade = null;
    /** @type {null|'emerging'|'developing'|'proficient'|'extending'} */
    let level = null;

    const buf = { 9: initLevels(), 10: initLevels(), 11: initLevels(), 12: initLevels() };
    const allGrades = initLevels();

    for (const l of lines) {
      // Grade markers are often standalone digits
      if (/^(9|10|11|12)$/.test(l)) {
        grade = Number(l);
        // keep current level; some PDFs list content right after a grade marker without repeating the level header
        continue;
      }

      // Level headers
      if (/^Emerging\//i.test(l)) {
        level = 'emerging';
        continue;
      }
      if (/^Developing\//i.test(l)) {
        level = 'developing';
        continue;
      }
      if (/^Proficient\//i.test(l)) {
        level = 'proficient';
        continue;
      }
      if (/^Extending\//i.test(l)) {
        level = 'extending';
        continue;
      }

      // Content line
      if (level) {
        if (grade) buf[grade][level].push(l);
        else allGrades[level].push(l);
      }
    }

    for (const g of [9, 10, 11, 12]) {
      const lv = buf[g];

      // If any level is empty for this grade, backfill from the "all grades" bucket.
      for (const k of ['emerging', 'developing', 'proficient', 'extending']) {
        if ((lv[k]?.length ?? 0) === 0 && (allGrades[k]?.length ?? 0) > 0) {
          lv[k] = [...allGrades[k]];
        }
      }

      // Keep only if we got *any* content for this grade
      const any = Object.values(lv).some((arr) => (arr?.length ?? 0) > 0);
      if (!any) continue;

      out.push({
        subject,
        grade: g,
        title: sec.title,
        key: slugify(sec.title),
        levels: {
          emerging: joinLines(lv.emerging),
          developing: joinLines(lv.developing),
          proficient: joinLines(lv.proficient),
          extending: joinLines(lv.extending),
        },
      });
    }
  }

  return out;
}

function parseBibleRubricText(text) {
  const rawLines = text.split(/\r?\n/);

  // Segment by "BIBLE Learning Standard:" headings.
  const sections = [];
  let current = null;

  for (const line0 of rawLines) {
    const line = line0.trim();
    if (/^BIBLE\s+Learning Standard:/i.test(line)) {
      if (current) sections.push(current);
      const title = line.replace(/^BIBLE\s+Learning Standard:\s*/i, '').trim();
      current = { title, lines: [] };
      continue;
    }
    if (current) current.lines.push(line0);
  }
  if (current) sections.push(current);

  const out = [];

  for (const sec of sections) {
    const lines = cleanLines(sec.lines);

    // Heuristic bucketing based on common rubric verbs.
    // Bible rubrics often use: Begin / Partially / (plain verb) / Fully
    const buckets = initLevels();

    /** @type {null|'emerging'|'developing'|'proficient'|'extending'} */
    let level = null;

    for (const l of lines) {
      // Skip grade markers and level header labels (they don't survive column layout cleanly)
      if (/^(9|10|11|12)$/.test(l)) continue;
      if (/^Emerging\//i.test(l)) continue;
      if (/^Developing\//i.test(l)) continue;
      if (/^Proficient\//i.test(l)) continue;
      if (/^Extending\//i.test(l)) continue;

      if (/^Fully\b/i.test(l)) level = 'extending';
      else if (/^Partially\b/i.test(l)) level = 'developing';
      else if (/^Begin(s)?\b/i.test(l)) level = 'emerging';
      else {
        // If it starts with a strong verb and not Begin/Partially/Fully, treat as proficient.
        if (/^(Show|Apply|Demonstrate|Exemplify|Explore|Describe|Explain|Justify|Synthesize|Outline|Identify)\b/i.test(l)) {
          level = 'proficient';
        }
      }

      // If we still don't know, keep previous; if none, default to proficient.
      const effective = level ?? 'proficient';
      buckets[effective].push(l);
    }

    // Apply same rubric text to all grades 9–12 (teacher can edit per grade later).
    for (const g of [9, 10, 11, 12]) {
      const any = Object.values(buckets).some((arr) => arr.length > 0);
      if (!any) continue;

      out.push({
        subject,
        grade: g,
        title: sec.title,
        key: slugify(sec.title),
        levels: {
          emerging: joinLines(buckets.emerging),
          developing: joinLines(buckets.developing),
          proficient: joinLines(buckets.proficient),
          extending: joinLines(buckets.extending),
        },
      });
    }
  }

  return out;
}

function initLevels() {
  return { emerging: [], developing: [], proficient: [], extending: [] };
}

function joinLines(arr) {
  const s = arr.join('\n').trim();
  return s;
}

function pdftotext(path) {
  return execSync(`pdftotext ${shellEscape(path)} -`, { encoding: 'utf8' });
}

function shellEscape(s) {
  return `'${String(s).replace(/'/g, `'\\''`)}'`;
}

async function upsertStandard(row) {
  const { data, error } = await supabase
    .from('learning_standards')
    .upsert(
      {
        subject: row.subject,
        grade: row.grade,
        standard_key: row.key,
        standard_title: row.title,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'subject,grade,standard_key' }
    )
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

async function upsertLevel(learningStandardId, level, originalText) {
  const { error } = await supabase
    .from('learning_standard_levels')
    .upsert(
      {
        learning_standard_id: learningStandardId,
        level,
        original_text: originalText || '',
        // do not touch edited_text on import
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'learning_standard_id,level' }
    );
  if (error) throw error;
}

async function main() {
  console.log(`[import] subject=${subject} pdf=${pdf}`);
  const text = pdftotext(pdf);
  const parsed = parseRubricText(text);

  if (parsed.length === 0) {
    console.error('[import] No standards parsed. This PDF may not match the expected format.');
    process.exit(2);
  }

  let countStd = 0;
  for (const row of parsed) {
    const stdId = await upsertStandard(row);
    await upsertLevel(stdId, 'emerging', row.levels.emerging);
    await upsertLevel(stdId, 'developing', row.levels.developing);
    await upsertLevel(stdId, 'proficient', row.levels.proficient);
    await upsertLevel(stdId, 'extending', row.levels.extending);
    countStd++;
  }

  console.log(`[import] Upserted ${countStd} learning_standards rows (plus level rows).`);
}

main().catch((e) => {
  console.error('[import] FAILED:', e?.message ?? e);
  process.exit(1);
});
