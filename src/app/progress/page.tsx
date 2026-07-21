"use client";

import { useEffect, useMemo, useState } from "react";
import { AccountNav } from "@/components/account-nav";
import { Account, AuthForm } from "@/components/auth-form";
import { VerificationGate } from "@/components/verification-gate";

export default function ProgressPage() {
  const [account, setAccount] = useState<Account | null | undefined>(undefined);
  const [todayKey, setTodayKey] = useState("");
  const [streak, setStreak] = useState(0);
  const [dates, setDates] = useState<string[]>([]);

  async function loadProgress(user: Account) {
    setAccount(user);
    if (!user.emailVerified) return;
    const response = await fetch("/api/progress", { cache: "no-store" });
    if (response.status === 401) return setAccount(null);
    const data = await response.json();
    setTodayKey(data.todayKey ?? "");
    setStreak(data.streak ?? 0);
    setDates(data.dateKeysDesc ?? []);
  }

  useEffect(() => {
    void fetch("/api/auth/session", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => data.user ? loadProgress(data.user) : setAccount(null))
      .catch(() => setAccount(null));
  }, []);

  const completedDates = useMemo(() => new Set(dates), [dates]);
  const days = useMemo(() => {
    if (!todayKey) return [] as string[];
    const date = new Date(`${todayKey}T12:00:00Z`);
    return Array.from({ length: 28 }, () => {
      const key = date.toISOString().slice(0, 10);
      date.setUTCDate(date.getUTCDate() - 1);
      return key;
    });
  }, [todayKey]);

  if (account === undefined) return <main className="container">loading…</main>;
  if (!account) return <AuthForm onAuthenticated={(user) => void loadProgress(user)} />;
  if (!account.emailVerified) return <VerificationGate email={account.email} />;

  return (
    <main className="container">
      <AccountNav email={account.email} />
      <div className="h1">Your Progress</div>
      <p className="meta">current streak: {streak}</p>
      <div className="label">last 28 days</div>
      <div className="calendar" style={{ marginTop: 10 }}>
        {days.map((key) => (
          <div
            key={key}
            className={`day ${completedDates.has(key) ? "done" : "dim"}`}
            title={key}
          >
            {key.slice(8, 10)}
          </div>
        ))}
      </div>
    </main>
  );
}
