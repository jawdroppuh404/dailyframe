export function computeStreak(sortedDateKeysDesc: string[], todayKey: string) {
  let streak = 0;
  const set = new Set(sortedDateKeysDesc);
  let cur = set.has(todayKey) ? todayKey : prevDayKey(todayKey);
  while (set.has(cur)) {
    streak += 1;
    cur = prevDayKey(cur);
  }
  return streak;
}

export function computeLongestStreak(dateKeys: string[]) {
  const uniqueSorted = [...new Set(dateKeys)].sort();
  let longest = 0;
  let current = 0;
  let previous: string | null = null;

  for (const key of uniqueSorted) {
    current = previous && prevDayKey(key) === previous ? current + 1 : 1;
    longest = Math.max(longest, current);
    previous = key;
  }
  return longest;
}

function prevDayKey(key: string) {
  const d = new Date(key + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}
