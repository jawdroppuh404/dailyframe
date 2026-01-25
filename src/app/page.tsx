"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";

type Prompt = { id: string; title: string; constraint?: string | null; twist?: string | null };
type Photo = { imagePath: string; caption?: string | null; mood?: string | null; promptId?: string | null } | null;

function getOrCreateUserId() {
  const k = "dailyframe_user_id";
  const existing = localStorage.getItem(k);
  if (existing) return existing;

  const fresh = `user_${crypto.randomUUID()}`;
  localStorage.setItem(k, fresh);
  return fresh;
}

export default function TodayPage() {
  const [loading, setLoading] = useState(true);
  const [todayKey, setTodayKey] = useState("");
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [photo, setPhoto] = useState<Photo>(null);

  const [caption, setCaption] = useState("");
  const [mood, setMood] = useState<string>("");
  const [tip, setTip] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const userId = useMemo(() => {
    // safe: only runs on client
    return getOrCreateUserId();
  }, []);

  async function load() {
    setLoading(true);

    const res = await fetch("/api/today", {
      cache: "no-store",
      headers: { "x-user-id": userId },
    });

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function getStuckTip() {
    const res = await fetch("/api/stuck", { cache: "no-store" });
    const data = await res.json();
    setTip(data.tip);
  }

  async function doUpload() {
    if (!selectedFile) return;

    setUploading(true);
    try {
      // 1) Upload image to Vercel Blob
      const blob = await upload(selectedFile.name, selectedFile, {
        access: "public",
        handleUploadUrl: "/api/blob",
      });

      // 2) Save metadata to DB (per-user)
      const res = await fetch("/api/photo/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
        },
        body: JSON.stringify({
          imagePath: blob.url,
          caption,
          mood,
          promptId: prompt?.id ?? null,
        }),
      });

      const text = await res.text();
      if (!res.ok) {
        alert(`upload failed: ${res.status} ${text}`);
        return;
      }

      // clear selection + input so you can pick the same file again
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      await load();
    } catch (e: any) {
      alert(`upload error: ${e?.message ?? String(e)}`);
    } finally {
      setUploading(false);
    }
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

          <div className="label">
            choose file
            <div style={{ display: "grid", gap: 10, marginTop: 8 }}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setSelectedFile(f);
                }}
              />

              <button
                className="secondary"
                disabled={!selectedFile || uploading}
                onClick={() => void doUpload()}
              >
                {uploading ? "uploading…" : selectedFile ? "upload" : "upload"}
              </button>

              {selectedFile && (
                <p className="small">
                  selected: <em>{selectedFile.name}</em>
                </p>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}