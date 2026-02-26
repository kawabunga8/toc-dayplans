export type FridayType = 'day1' | 'day2';

export function isYyyyMmDd(s: string | null | undefined): s is string {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(String(s));
}

export function asFridayType(s: string | null | undefined): '' | FridayType {
  return s === 'day1' || s === 'day2' ? s : '';
}

export function buildDayplansListHref(params: {
  date?: string | null;
  fridayType?: string | null;
}): string {
  const qs = new URLSearchParams();
  if (isYyyyMmDd(params.date)) qs.set('date', params.date);
  const ft = asFridayType(params.fridayType);
  if (ft) qs.set('friday_type', ft);
  const s = qs.toString();
  return s ? `/admin/dayplans?${s}` : '/admin/dayplans';
}

export function buildDayplanDetailHref(params: {
  id: string;
  auto?: boolean;
  date?: string | null;
  fridayType?: string | null;
}): string {
  const qs = new URLSearchParams();
  if (params.auto) qs.set('auto', '1');
  if (isYyyyMmDd(params.date)) qs.set('date', params.date);
  const ft = asFridayType(params.fridayType);
  if (ft) qs.set('friday_type', ft);
  const s = qs.toString();
  return s ? `/admin/dayplans/${params.id}?${s}` : `/admin/dayplans/${params.id}`;
}
