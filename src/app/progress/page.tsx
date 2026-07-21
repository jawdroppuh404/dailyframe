"use client";

import { useEffect, useMemo, useState } from "react";
import { getOrCreateUserId } from "@/lib/client-user";

export default function ProgressPage() {
  const [todayKey, setTodayKey] = useState("");
  const [streak, setStreak] = useState(0);
  const [dates, setDates] = useState<string[]>([]);

  useEffect(() => {
    const userId = getOrCreateUserId();

    fetch("/api/progress", {
      cache: "no-store",
      headers: { "x-user-id": userId },
    })
      .then((r) => r.json())
      .then((d) => {
        setTodayKey(d.todayKey);
        setStreak(d.streak);
        setDates(d.dateKeysDesc);
      });
  }, []);

  const set = useMemo(() => new Set(dates), [dates]);

  const days = useMemo(() => {
    if (!todayKey) return [] as string[];
    const d = new Date(todayKey + "T12:00:00Z");
    const arr: string[] = [];
    for (let i = 0; i < 28; i++) {
      arr.push(d.toISOString().slice(0, 10));
      d.setUTCDate(d.getUTCDate() - 1);
    }
    return arr;
  }, [todayKey]);

  return (
    <main className="container">
      <nav className="nav">
        <a href="/">today</a>
        <a href="/archive">archive</a>
        <a href="/progress">progress</a>
      </nav>

      <div className="h1">Your Progress</div>
      <p className="meta">current streak: {streak}</p>

      <div className="label">last 28 days</div>
      <div className="calendar" style={{ marginTop: 10 }}>
        {days.map((k) => {
          const done = set.has(k);
          return (
            <div
              key={k}
              className={`day ${done ? "done" : "dim"}`}
              title={k}
            >
              {k.slice(8, 10)}
            </div>
          );
        })}
      </div>
    </main>
  );
}
