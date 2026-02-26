import type { FridayType } from './navigation';

export type FridayPublishedInfo = { hasDay1: boolean; hasDay2: boolean };

export async function fetchFridayPublishedInfo(date: string): Promise<FridayPublishedInfo> {
  const res = await fetch(`/api/public/friday-types?date=${encodeURIComponent(date)}`);
  const j = await res.json();
  if (!res.ok) throw new Error(j?.error ?? 'Failed');
  return { hasDay1: !!j?.hasDay1, hasDay2: !!j?.hasDay2 };
}

export function chooseFridayType(args: {
  current: '' | FridayType;
  published: FridayPublishedInfo;
  confirm?: (msg: string) => boolean;
}): '' | FridayType {
  const { current, published } = args;
  const confirm = args.confirm ?? ((m) => window.confirm(m));

  const { hasDay1, hasDay2 } = published;

  // Preserve a valid current choice.
  if (current === 'day1' && hasDay1) return 'day1';
  if (current === 'day2' && hasDay2) return 'day2';

  // If current points to an unpublished day, prefer the other.
  if (current === 'day1' && !hasDay1 && hasDay2) return 'day2';
  if (current === 'day2' && !hasDay2 && hasDay1) return 'day1';

  // Choose when not set.
  if (!current) {
    if (hasDay1 && !hasDay2) return 'day1';
    if (hasDay2 && !hasDay1) return 'day2';
    if (hasDay1 && hasDay2) {
      const ok = confirm('Published plans exist for both Friday Day 1 and Day 2.\n\nPress OK for Day 1, or Cancel for Day 2.');
      return ok ? 'day1' : 'day2';
    }
    // Neither day has published plans — still choose one so rotation/times load.
    return 'day1';
  }

  // Neither day published; keep current.
  return current;
}
