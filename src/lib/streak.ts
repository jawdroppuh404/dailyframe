export function computeStreak(sortedDateKeysDesc: string[], todayKey: string) {
  let streak = 0;
  let cur = todayKey;

  const set = new Set(sortedDateKeysDesc);
  while (set.has(cur)) {
    streak += 1;
    cur = prevDayKey(cur);
  }
  return streak;
}

function prevDayKey(key: string) {
  const d = new Date(key + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}
