"use client";

import { useEffect, useRef, useState } from "react";
import { AccountNav } from "@/components/account-nav";
import { Account } from "@/components/auth-form";
import { SharePhotoButton } from "@/components/share-photo-button";
import { SharePromptButton } from "@/components/share-prompt-button";
import { appPath } from "@/lib/app-path";
import { MOODS, optimizePhoto } from "@/lib/photo-client";

type Prompt = {
  id: string;
  title: string;
  constraint?: string | null;
  twist?: string | null;
};

type Photo =
  | {
      imageUrl: string;
      caption?: string | null;
      mood?: string | null;
      promptId?: string | null;
      guest?: boolean;
    }
  | null;

type RandomFrame = {
  dateKey: string;
  prompt: Prompt;
};

export default function TodayPage() {
  const [account, setAccount] = useState<Account | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [todayKey, setTodayKey] = useState("");
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [photo, setPhoto] = useState<Photo>(null);
  const [caption, setCaption] = useState("");
  const [mood, setMood] = useState("");
  const [tip, setTip] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState("");
  const [randomFrame, setRandomFrame] = useState<RandomFrame | null>(null);
  const [loadingRandomFrame, setLoadingRandomFrame] = useState(false);
  const [showPhotoCard, setShowPhotoCard] = useState(false);
  const guestPhotoUrlRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function loadToday() {
    setLoading(true);
    setStatus("");
    try {
      const response = await fetch(appPath("/api/today"), { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to load today.");

      setTodayKey(data.todayKey ?? "");
      setPrompt(data.prompt ?? null);
      setPhoto(data.photo ?? null);
      setCaption(data.photo?.caption ?? "");
      setMood(data.photo?.mood ?? "");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to load today.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetch(appPath("/api/auth/session"), { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        setAccount(data.user ?? null);
        return loadToday();
      })
      .catch(() => {
        setAccount(null);
        void loadToday();
      });
  }, []);

  useEffect(() => () => {
    if (guestPhotoUrlRef.current) URL.revokeObjectURL(guestPhotoUrlRef.current);
  }, []);

  async function getStuckTip() {
    const response = await fetch(appPath("/api/stuck"), { cache: "no-store" });
    const data = await response.json();
    if (response.ok) setTip(data.tip ?? "");
  }

  async function showRandomFrame() {
    setLoadingRandomFrame(true);
    setStatus("");
    try {
      const response = await fetch(appPath("/api/random-frame"), { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to find an earlier frame.");
      setRandomFrame(data);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to find an earlier frame.");
    } finally {
      setLoadingRandomFrame(false);
    }
  }

  async function doUpload() {
    if (!selectedFile) return setStatus("no file selected");
    setUploading(true);
    setStatus("preparing photo…");

    try {
      setStatus("resizing and compressing photo…");
      const file = await optimizePhoto(selectedFile);

      if (!account?.emailVerified) {
        if (guestPhotoUrlRef.current) URL.revokeObjectURL(guestPhotoUrlRef.current);
        const localUrl = URL.createObjectURL(file);
        guestPhotoUrlRef.current = localUrl;
        setPhoto({ imageUrl: localUrl, caption, mood, promptId: prompt?.id ?? null, guest: true });
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        setStatus("preview only — this photo and progress were not saved");
        return;
      }

      setStatus("uploading privately…");
      const { upload } = await import("@vercel/blob/client");
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-120) || "photo.jpg";
      const blob = await upload(
        `users/${account.id}/${todayKey}/${safeName}`,
        file,
        {
          access: "private",
          handleUploadUrl: appPath("/api/blob"),
          multipart: file.size > 5 * 1024 * 1024,
        }
      );

      const response = await fetch(appPath("/api/photo/upload"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pathname: blob.pathname,
          caption,
          mood,
          promptId: prompt?.id ?? null,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Upload failed.");

      setStatus("saved privately ✓");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await loadToday();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  if (account === undefined || loading) return <main className="container">loading…</main>;

  return (
    <main className="container">
      {account ? <AccountNav account={account} /> : (
        <nav className="nav public-nav">
          <a href={appPath()}>today</a>
          <a href={appPath("/progress")}>progress</a>
          <a href={appPath("/account")}>account</a>
          <a href={appPath("/archive")}>archive</a>
        </nav>
      )}
      <div className="h1">Daily Frame</div>
      <div className="today-date-row">
        <p className="meta">today: {todayKey}</p>
        <button className="secondary random-frame-button" type="button" disabled={loadingRandomFrame} onClick={() => void showRandomFrame()}>
          {loadingRandomFrame ? "finding…" : "random frame"}
        </button>
      </div>

      {randomFrame && (
        <section
          className="card random-frame-card clickable-card"
          onClick={(event) => {
            if ((event.target as HTMLElement).closest("button, a")) return;
            window.location.href = appPath(`/random-upload?dateKey=${encodeURIComponent(randomFrame.dateKey)}`);
          }}
        >
          <button className="gear-help-close" type="button" aria-label="Close random frame" onClick={() => setRandomFrame(null)}>×</button>
          <div className="label">from {randomFrame.dateKey}</div>
          <div className="prompt">{randomFrame.prompt.title}</div>
          {randomFrame.prompt.constraint && <><div className="label">constraint</div><p className="value">{randomFrame.prompt.constraint}</p></>}
          {randomFrame.prompt.twist && <><div className="label">optional twist</div><p className="value">{randomFrame.prompt.twist}</p></>}
          <div className="random-frame-actions">
            <SharePromptButton prompt={randomFrame.prompt} label="share random frame" eyebrow="random frame" />
            <a className="small" href={appPath(`/random-upload?dateKey=${encodeURIComponent(randomFrame.dateKey)}`)}>tap the card to answer this frame</a>
          </div>
        </section>
      )}

      {status && (
        <section className="card status-card">
          <div className="label">status</div>
          <p className="value">{status}</p>
        </section>
      )}

      {prompt && (
        <section className="card" style={{ marginTop: 12 }}>
          <div className="label">today’s prompt</div>
          <div className="prompt">{prompt.title}</div>
          {prompt.constraint && <><div className="label">constraint</div><p className="value">{prompt.constraint}</p></>}
          {prompt.twist && <><div className="label">optional twist</div><p className="value">{prompt.twist}</p></>}
          <div style={{ marginTop: 12 }}>
            <div className="prompt-actions">
              <button className="secondary" type="button" onClick={() => void getStuckTip()}>
                i’m stuck →
              </button>
              <SharePromptButton prompt={prompt} />
            </div>
            {tip && <p className="small"><em>{tip}</em></p>}
          </div>
        </section>
      )}

      <section style={{ marginTop: 18 }}>
        <div className="label">today’s private photo</div>
        {photo?.imageUrl ? (
          <div className="today-photo-trigger" style={{ marginTop: 10 }} role="button" tabIndex={0} onClick={() => setShowPhotoCard(true)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setShowPhotoCard(true); }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="photo" src={photo.imageUrl} alt="today" />
            <p className="small">{photo.guest ? "local preview only — tap to open share card." : "only your signed-in account can load this photo. tap to open card."}</p>
          </div>
        ) : (
          <p className="small">no photo yet. upload one to lock in your day.</p>
        )}

        {!account?.emailVerified && (
          <aside className="guest-warning">
            <strong>your progress and photo will not be saved.</strong>
            <span className="small">if you want to keep your streak, then {account
              ? <a href={appPath("/account")}>confirm your email</a>
              : <a href={appPath("/account?mode=signup")}>create an account</a>}.</span>
          </aside>
        )}

        <div className="grid" style={{ marginTop: 12 }}>
          <label className="label">
            caption (optional)
            <input value={caption} maxLength={500} onChange={(event) => setCaption(event.target.value)} />
          </label>
          <label className="label">
            mood (optional)
            <select value={mood} onChange={(event) => setMood(event.target.value)}>
              <option value="">—</option>
              {MOODS.map((item) => <option value={item} key={item}>{item.toLowerCase()}</option>)}
            </select>
          </label>
          <div className="label">
            choose file
            <div className="grid" style={{ marginTop: 8 }}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,.heic,.heif,image/heic,image/heif"
                onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
              />
              <button
                className="secondary"
                type="button"
                disabled={!selectedFile || uploading}
                onClick={() => void doUpload()}
              >
                {uploading ? "working…" : account?.emailVerified ? "upload privately" : "preview photo"}
              </button>
              {selectedFile && <p className="small">selected: <em>{selectedFile.name}</em> · resized to 1600px and compressed before use</p>}
            </div>
          </div>
        </div>
      </section>

      {showPhotoCard && photo?.imageUrl && prompt && (
        <div className="modal-backdrop photo-card-backdrop" role="presentation" onClick={() => setShowPhotoCard(false)}>
          <article className="photo-detail-card" role="dialog" aria-modal="true" aria-label="Today’s photo card" onClick={(event) => event.stopPropagation()}>
            <button className="gear-help-close" type="button" aria-label="Close" onClick={() => setShowPhotoCard(false)}>×</button>
            <div className="label">today’s frame</div>
            <div className="photo-card-prompt">{prompt.title}</div>
            {prompt.constraint && <><div className="label">constraint</div><p className="value">{prompt.constraint}</p></>}
            {prompt.twist && <><div className="label">optional twist</div><p className="value">{prompt.twist}</p></>}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.imageUrl} alt="Your response to today’s frame" />
            <SharePhotoButton prompt={prompt} imageUrl={photo.imageUrl} />
            <p className="photo-card-footer">create today @ jawdroppuh.lol/dailyframe</p>
          </article>
        </div>
      )}
    </main>
  );
}
