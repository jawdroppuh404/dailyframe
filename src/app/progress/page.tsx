"use client";

import { useEffect, useMemo, useState } from "react";
import { AccountNav } from "@/components/account-nav";
import { Account, AuthForm } from "@/components/auth-form";
import { VerificationGate } from "@/components/verification-gate";
import { appPath } from "@/lib/app-path";

export default function ProgressPage() {
  const [account, setAccount] = useState<Account | null | undefined>(undefined);
  const [todayKey, setTodayKey] = useState("");
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [dates, setDates] = useState<string[]>([]);
  const [previousPhotos, setPreviousPhotos] = useState<Array<{ dateKey: string; imageUrl: string; caption?: string | null; mood?: string | null }>>([]);

  async function loadProgress(user: Account) {
    setAccount(user);
    if (!user.emailVerified) return;
    const response = await fetch(appPath("/api/progress"), { cache: "no-store" });
    if (response.status === 401) return setAccount(null);
    const data = await response.json();
    setTodayKey(data.todayKey ?? "");
    setStreak(data.streak ?? 0);
    setBestStreak(data.bestStreak ?? 0);
    setDates(data.dateKeysDesc ?? []);
    setPreviousPhotos(data.previousPhotos ?? []);
  }

  useEffect(() => {
    void fetch(appPath("/api/auth/session"), { cache: "no-store" })
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
      <AccountNav account={account} />
      <div className="h1">Your Progress</div>
      <p className="meta">current streak: {streak} · personal best: {bestStreak}</p>
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

      <section className="progress-photos">
        <div className="label">previous photos</div>
        {previousPhotos.length ? (
          <div className="photo-history-grid">
            {previousPhotos.map((photo) => (
              <article className="photo-history-card" key={photo.dateKey}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img loading="lazy" src={photo.imageUrl} alt={`Your frame from ${photo.dateKey}`} />
                <div className="photo-history-copy">
                  <strong>{photo.dateKey}</strong>
                  {photo.caption && <span>{photo.caption}</span>}
                  {photo.mood && <span className="small">{photo.mood}</span>}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="small">your earlier frames will appear here.</p>
        )}
      </section>
    </main>
  );
}
