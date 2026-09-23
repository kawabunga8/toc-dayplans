// Scans a day plan's TOC content (every free-text field a staff member typed —
// Note to TOC, lesson flow phases, activity options, etc.) for an enrolled
// student's first or last name, before that content goes public. Mirrors the
// matching approach rcs-report-card-tool uses to redact names before sending
// text to AI (app/page.js, redactNames): per-token (first/last name checked
// independently, not as a combined phrase), word-boundary regex built from
// the roster, matched only against a leading-capital form — this avoids a
// student named "Art" flagging every mention of the word "art".

type Student = { first_name?: string | null; last_name?: string | null };

function collectStrings(node: unknown, path: string, out: Array<{ path: string; value: string }>) {
  if (typeof node === 'string') {
    if (node.trim()) out.push({ path, value: node });
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((item, i) => collectStrings(item, `${path}[${i}]`, out));
    return;
  }
  if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      collectStrings(v, path ? `${path}.${k}` : k, out);
    }
  }
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export type NameMatch = { field: string; name: string; snippet: string };

export function detectStudentNamesInToc(toc: unknown, students: Student[]): NameMatch[] {
  const strings: Array<{ path: string; value: string }> = [];
  collectStrings(toc, '', strings);
  if (!strings.length) return [];

  const names = new Set<string>();
  for (const s of students) {
    const first = String(s?.first_name ?? '').trim();
    const last = String(s?.last_name ?? '').trim();
    if (first.length >= 2) names.add(first);
    if (last.length >= 2) names.add(last);
  }
  if (!names.size) return [];

  const matches: NameMatch[] = [];
  for (const name of names) {
    const capitalised = name.charAt(0).toUpperCase() + name.slice(1);
    const re = new RegExp(`\\b${escapeRegExp(capitalised)}\\b`);
    for (const { path, value } of strings) {
      const m = re.exec(value);
      if (!m) continue;
      const start = Math.max(0, m.index - 20);
      const end = Math.min(value.length, m.index + m[0].length + 20);
      const snippet = (start > 0 ? '…' : '') + value.slice(start, end) + (end < value.length ? '…' : '');
      matches.push({ field: path, name: capitalised, snippet });
    }
  }
  return matches;
}

// Replaces any enrolled student's first or last name with "[a student]" in
// every string inside `node` (objects and arrays are walked recursively).
// Used before staff-typed text is sent to an outside AI provider, so a name
// typed into e.g. a Note to TOC never reaches it. Same matching rules as
// detectStudentNamesInToc above (per-token, word-boundary, leading capital).
export function redactStudentNames<T>(node: T, students: Student[]): { value: T; count: number } {
  const names = new Set<string>();
  for (const s of students) {
    const first = String(s?.first_name ?? '').trim();
    const last = String(s?.last_name ?? '').trim();
    if (first.length >= 2) names.add(first.charAt(0).toUpperCase() + first.slice(1));
    if (last.length >= 2) names.add(last.charAt(0).toUpperCase() + last.slice(1));
  }
  if (!names.size) return { value: node, count: 0 };

  // Longest names first, so "Anne-Marie" is matched before "Anne".
  const pattern = new RegExp(
    `\\b(?:${[...names].sort((a, b) => b.length - a.length).map(escapeRegExp).join('|')})\\b`,
    'g'
  );
  let count = 0;

  const walk = (v: unknown): unknown => {
    if (typeof v === 'string') {
      const replaced = v.replace(pattern, () => {
        count++;
        return '[a student]';
      });
      // "Daniel Chiang" becomes two adjacent placeholders; collapse to one.
      return replaced.replace(/\[a student\](\s+\[a student\])+/g, '[a student]');
    }
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === 'object') {
      return Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, x]) => [k, walk(x)]));
    }
    return v;
  };

  return { value: walk(node) as T, count };
}
