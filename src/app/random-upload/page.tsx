"use client";

import { useEffect, useState } from "react";
import { AccountNav } from "@/components/account-nav";
import type { Account } from "@/components/auth-form";
import { SharePromptButton } from "@/components/share-prompt-button";
import { appPath } from "@/lib/app-path";
import { MOODS, optimizePhoto } from "@/lib/photo-client";

type Frame = {
  dateKey: string;
  prompt: { id: string; title: string; constraint?: string | null; twist?: string | null };
};

export default function RandomUploadPage() {
  const [account, setAccount] = useState<Account | null | undefined>(undefined);
  const [frame, setFrame] = useState<Frame | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [mood, setMood] = useState("");
  const [status, setStatus] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const dateKey = new URLSearchParams(window.location.search).get("dateKey") ?? "";
    void Promise.all([
      fetch(appPath("/api/auth/session"), { cache: "no-store" }).then((response) => response.json()),
      fetch(appPath(`/api/random-frame?dateKey=${encodeURIComponent(dateKey)}`), { cache: "no-store" }).then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Unable to load this frame.");
        return data;
      }),
    ]).then(([session, loadedFrame]) => {
      setAccount(session.user ?? null);
      setFrame(loadedFrame);
    }).catch((error) => {
      setAccount(null);
      setStatus(error instanceof Error ? error.message : "Unable to load this frame.");
    });
  }, []);

  async function uploadArchivePhoto() {
    if (!account?.emailVerified || !frame || !file) return;
    setUploading(true);
    setStatus("resizing and compressing photo…");
    try {
      const optimized = await optimizePhoto(file);
      const safeName = optimized.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-120) || "photo.jpg";
      setStatus("uploading privately…");
      const { upload } = await import("@vercel/blob/client");
      const blob = await upload(
        `users/${account.id}/archive/${frame.dateKey}/${Date.now()}-${safeName}`,
        optimized,
        { access: "private", handleUploadUrl: appPath("/api/blob") },
      );
      const response = await fetch(appPath("/api/photo/archive-upload"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pathname: blob.pathname,
          promptId: frame.prompt.id,
          promptDateKey: frame.dateKey,
          caption,
          mood,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Upload failed.");
      setStatus("saved to Previous Photos — streak unchanged ✓");
      setFile(null);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  if (account === undefined && !status) return <main className="container">loading…</main>;

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
      <div className="h1">Answer a Random Frame</div>
      <p className="meta">alternate archive photos appear in Previous Photos and never affect streaks or ranks.</p>

      {frame && (
        <section className="card">
          <div className="label">from {frame.dateKey}</div>
          <div className="prompt">{frame.prompt.title}</div>
          {frame.prompt.constraint && <><div className="label">constraint</div><p className="value">{frame.prompt.constraint}</p></>}
          {frame.prompt.twist && <><div className="label">optional twist</div><p className="value">{frame.prompt.twist}</p></>}
          <div style={{ marginTop: 12 }}><SharePromptButton prompt={frame.prompt} label="share random frame" eyebrow="random frame" /></div>
        </section>
      )}

      {!account?.emailVerified ? (
        <aside className="guest-warning">
          <strong>an account with a confirmed email is required to save this alternate frame.</strong>
          <span className="small">{account
            ? <a href={appPath("/account")}>confirm your email</a>
            : <a href={appPath("/account?mode=signup")}>create an account</a>} to add it to Previous Photos.</span>
        </aside>
      ) : (
        <section className="card grid account-section">
          <label className="label">caption (optional)<input maxLength={500} value={caption} onChange={(event) => setCaption(event.target.value)} /></label>
          <label className="label">mood (optional)<select value={mood} onChange={(event) => setMood(event.target.value)}><option value="">—</option>{MOODS.map((item) => <option value={item} key={item}>{item.toLowerCase()}</option>)}</select></label>
          <label className="label">choose file<input type="file" accept="image/jpeg,image/png,image/webp,.heic,.heif,image/heic,image/heif" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label>
          <button className="secondary" type="button" disabled={!file || uploading || !frame} onClick={() => void uploadArchivePhoto()}>{uploading ? "working…" : "save to Previous Photos"}</button>
        </section>
      )}
      {status && <section className="card status-card"><div className="label">status</div><p className="value">{status}</p>{status.includes("✓") && <p><a className="button-link" href={appPath("/progress")}>view Previous Photos</a></p>}</section>}
    </main>
  );
}
