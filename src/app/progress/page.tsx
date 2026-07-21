"use client";

import { useEffect, useMemo, useState } from "react";
import { AccountNav } from "@/components/account-nav";
import { Account, AuthForm } from "@/components/auth-form";
import { SharePhotoButton } from "@/components/share-photo-button";
import { VerificationGate } from "@/components/verification-gate";
import { appPath } from "@/lib/app-path";

export default function ProgressPage() {
  const [account, setAccount] = useState<Account | null | undefined>(undefined);
  const [todayKey, setTodayKey] = useState("");
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [dates, setDates] = useState<string[]>([]);
  type PreviousPhoto = {
    dateKey: string;
    imageUrl: string;
    caption?: string | null;
    mood?: string | null;
    alternate?: boolean;
    prompt: { title: string; constraint?: string | null; twist?: string | null } | null;
  };
  const [previousPhotos, setPreviousPhotos] = useState<PreviousPhoto[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<PreviousPhoto | null>(null);

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
              <article
                className="photo-history-card clickable-card"
                key={`${photo.dateKey}-${photo.imageUrl}`}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedPhoto(photo)}
                onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setSelectedPhoto(photo); }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img loading="lazy" src={photo.imageUrl} alt={`Your frame from ${photo.dateKey}`} />
                <div className="photo-history-copy">
                  <strong>{photo.dateKey}</strong>
                  {photo.alternate && <span className="small">alternate frame · does not affect streak</span>}
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

      {selectedPhoto && (
        <div className="modal-backdrop photo-card-backdrop" role="presentation" onClick={() => setSelectedPhoto(null)}>
          <article className="photo-detail-card" role="dialog" aria-modal="true" aria-label="Previous photo card" onClick={(event) => event.stopPropagation()}>
            <button className="gear-help-close" type="button" aria-label="Close" onClick={() => setSelectedPhoto(null)}>×</button>
            <div className="label">frame from {selectedPhoto.dateKey}</div>
            <div className="photo-card-prompt">{selectedPhoto.prompt?.title ?? "Daily Frame"}</div>
            {selectedPhoto.prompt?.constraint && <><div className="label">constraint</div><p className="value">{selectedPhoto.prompt.constraint}</p></>}
            {selectedPhoto.prompt?.twist && <><div className="label">optional twist</div><p className="value">{selectedPhoto.prompt.twist}</p></>}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={selectedPhoto.imageUrl} alt={`Your frame from ${selectedPhoto.dateKey}`} />
            {selectedPhoto.prompt ? (
              <SharePhotoButton prompt={selectedPhoto.prompt} imageUrl={selectedPhoto.imageUrl} />
            ) : (
              <p className="small">This older photo does not have a prompt attached, so a complete share card is unavailable.</p>
            )}
            <p className="photo-card-footer">create today @ jawdroppuh.lol/dailyframe</p>
          </article>
        </div>
      )}
    </main>
  );
}
