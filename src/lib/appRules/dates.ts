export function nextSchoolDayDate(from: Date = new Date()): Date {
  // NEXT school day (skip weekends). Does not account for holidays.
  const d = new Date(from);
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() + 1);
  }
  return d;
}

export function nextSchoolDayIso(from: Date = new Date()): string {
  return nextSchoolDayDate(from).toISOString().slice(0, 10);
}
