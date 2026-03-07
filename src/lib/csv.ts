export type CsvRow = Record<string, string>;

function splitCsvLine(line: string): string[] {
  // RFC4180-ish: supports quoted fields with escaped quotes, no multiline here.
  const out: string[] = [];
  let cur = '';
  let i = 0;
  let inQuotes = false;
  while (i < line.length) {
    const ch = line[i] ?? '';
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      cur += ch;
      i += 1;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }

    if (ch === ',') {
      out.push(cur);
      cur = '';
      i += 1;
      continue;
    }

    cur += ch;
    i += 1;
  }
  out.push(cur);
  return out;
}

export function parseCsv(text: string): CsvRow[] {
  // Handles multiline quoted fields by joining lines until quotes balance.
  const rawLines = text.replace(/^\uFEFF/, '').split(/\r?\n/);
  const logical: string[] = [];
  let buf = '';
  let quoteCount = 0;

  const countQuotes = (s: string) => (s.match(/"/g) ?? []).length;

  for (const ln of rawLines) {
    // skip pure empty lines outside a record
    if (!buf && !ln.trim()) continue;

    buf = buf ? buf + '\n' + ln : ln;
    quoteCount += countQuotes(ln);

    // If quoteCount is even, assume record is complete.
    if (quoteCount % 2 === 0) {
      logical.push(buf);
      buf = '';
      quoteCount = 0;
    }
  }
  if (buf.trim()) logical.push(buf);

  if (logical.length === 0) return [];

  const header = splitCsvLine(logical[0]!).map((h) => h.trim());
  const rows: CsvRow[] = [];
  for (let i = 1; i < logical.length; i++) {
    const fields = splitCsvLine(logical[i]!);
    const row: CsvRow = {};
    for (let j = 0; j < header.length; j++) {
      row[header[j]!] = (fields[j] ?? '').trim();
    }
    // ignore completely empty rows
    if (Object.values(row).some((v) => v !== '')) rows.push(row);
  }
  return rows;
}
