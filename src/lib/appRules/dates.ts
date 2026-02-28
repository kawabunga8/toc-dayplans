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
