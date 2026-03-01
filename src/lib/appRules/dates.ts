export function yyyyMmDdLocal(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function nextSchoolDayDate(from: Date = new Date()): Date {
  // NEXT school day (skip weekends). Does not account for holidays.
  // IMPORTANT: use local date math + local formatting (not toISOString) to avoid timezone off-by-one.
  const d = new Date(from);
  d.setHours(12, 0, 0, 0); // stabilize around DST boundaries
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() + 1);
  }
  return d;
}

export function nextSchoolDayIso(from: Date = new Date()): string {
  return yyyyMmDdLocal(nextSchoolDayDate(from));
}

function parseYyyyMmDdLocal(yyyyMmDd: string): Date {
  const [y, m, d] = String(yyyyMmDd).split('-').map((x) => Number(x));
  // Use local noon to avoid DST edge cases.
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0);
}

export function prevSchoolDayDate(from: Date = new Date()): Date {
  // PREVIOUS school day (skip weekends). Does not account for holidays.
  const d = new Date(from);
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - 1);
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() - 1);
  }
  return d;
}

export function prevSchoolDayIso(from: Date = new Date()): string {
  return yyyyMmDdLocal(prevSchoolDayDate(from));
}

export function nextSchoolDayIsoFromIso(yyyyMmDd: string): string {
  const d = parseYyyyMmDdLocal(yyyyMmDd);
  return nextSchoolDayIso(d);
}

export function prevSchoolDayIsoFromIso(yyyyMmDd: string): string {
  const d = parseYyyyMmDdLocal(yyyyMmDd);
  return prevSchoolDayIso(d);
}
