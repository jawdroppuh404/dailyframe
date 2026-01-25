"use client";

import { useEffect, useState } from "react";
import { upload } from "@vercel/blob/client";

type Prompt = { id: string; title: string; constraint?: string | null; twist?: string | null };
type Photo = { imagePath: string; caption?: string | null; mood?: string | null } | null;

export default function TodayPage() {
  const [loading, setLoading] = useState(true);
  const [todayKey, setTodayKey] = useState("");
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [photo, setPhoto] = useState<Photo>(null);

  const [caption, setCaption] = useState("");
  const [mood, setMood] = useState<string>("");
  const [tip, setTip] = useState<string>("");

  async function load() {
    setLoading(true);

    const res = await fetch("/api/today", { cache: "no-store" });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      alert(`failed to load: ${res.status} ${text}`);
      setLoading(false);
      return;
    }

    const data = await res.json();
    setTodayKey(data.todayKey);
    setPrompt(data.prompt);
    setPhoto(data.photo);
    setCaption(data.photo?.caption ?? "");
    setMood(data.photo?.mood ?? "");
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function onUpload(file: File) {
    // 1) Upload directly to Vercel Blob (avoids Vercel Function payload limits)
    let blobUrl: string;
    try {
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/blob",
      });
      blobUrl = blob.url;
    } catch (e: any) {
      alert(`blob upload failed: ${e?.message ?? String(e)}`);
      return;
    }

    // 2) Save metadata + blob URL to your DB via a small JSON request
    const res = await fetch("/api/photo/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imagePath: blobUrl,
        caption,
        mood,
      }),
    });

    if (!res.ok) {
      const msg = await res.text().catch(() => "");
      alert(`upload failed: ${res.status} ${msg}`);
      return;
    }

    await load();
  }

  async function getStuckTip() {
    const res = await fetch("/api/stuck", { cache: "no-store" });
    if (!res.ok) return;

    const data = await res.json();
    setTip(data.tip);
  }

  if (loading) return <main className="container">loading…</main>;

  return (
    <main className="container">
      <nav className="nav">
        <a href="/">today</a>
        <a href="/archive">archive</a>
        <a href="/progress">progress</a>
      </nav>

      <div className="h1">Daily Frame</div>
      <p className="meta">today: {todayKey}</p>

      {prompt && (
        <section className="card">
          <div className="label">today’s prompt</div>
          <div className="prompt">{prompt.title}</div>

          {prompt.constraint && (
            <>
              <div className="label">constraint</div>
              <p className="value">{prompt.constraint}</p>
            </>
          )}

          {prompt.twist && (
            <>
              <div className="label">optional twist</div>
              <p className="value">{prompt.twist}</p>
            </>
          )}

          <div style={{ marginTop: 12 }}>
            <button className="secondary" onClick={getStuckTip}>
              i’m stuck →
            </button>
            {tip && (
              <p className="small" style={{ marginTop: 10 }}>
                <em>{tip}</em>
              </p>
            )}
          </div>
        </section>
      )}

      <section style={{ marginTop: 18 }}>
        <div className="label">today’s photo</div>

        {photo?.imagePath ? (
          <div style={{ marginTop: 10 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="photo" src={photo.imagePath} alt="today" />
            <p className="small" style={{ marginTop: 10 }}>
              you can replace this until midnight
            </p>
          </div>
        ) : (
          <p className="small" style={{ marginTop: 10 }}>
            no photo yet. upload one to lock in your day.
          </p>
        )}

        <div className="grid" style={{ marginTop: 12 }}>
          <label className="label">
            caption (optional)
            <input value={caption} onChange={(e) => setCaption(e.target.value)} />
          </label>

          <label className="label">
            mood (optional)
            <select value={mood} onChange={(e) => setMood(e.target.value)}>
              <option value="">—</option>
              <option value="Calm">calm</option>
              <option value="Moody">moody</option>
              <option value="Joyful">joyful</option>
              <option value="Curious">curious</option>
              <option value="Gritty">gritty</option>
            </select>
          </label>

          <label className="label">
            upload image
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onUpload(f);
              }}
            />
          </label>
        </div>
      </section>
    </main>
  );
}