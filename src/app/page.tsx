"use client";

import { useEffect, useRef, useState } from "react";

type Prompt = {
  id: string;
  title: string;
  constraint?: string | null;
  twist?: string | null;
};

type Photo =
  | {
      imagePath: string;
      caption?: string | null;
      mood?: string | null;
      promptId?: string | null;
    }
  | null;

function getOrCreateUserId(): string {
  if (typeof window === "undefined") return "";

  const k = "dailyframe_user_id";
  const existing = window.localStorage.getItem(k);
  if (existing) return existing;

  const fresh = `user_${window.crypto.randomUUID()}`;
  window.localStorage.setItem(k, fresh);
  return fresh;
}

function isHeicLike(file: File) {
  const name = file.name.toLowerCase();
  return (
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    name.endsWith(".heic") ||
    name.endsWith(".heif")
  );
}

async function heicToJpeg(file: File): Promise<File> {
  // IMPORTANT: load heic2any only in the browser
  const { default: heic2any } = await import("heic2any");

  const out = (await heic2any({
    blob: file,
    toType: "image/jpeg",
    quality: 0.9,
  })) as Blob;

  const baseName = file.name.replace(/\.(heic|heif)$/i, "");
  return new File([out], `${baseName}.jpg`, { type: "image/jpeg" });
}

export default function TodayPage() {
  const [userId, setUserId] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const [todayKey, setTodayKey] = useState("");
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [photo, setPhoto] = useState<Photo>(null);

  const [caption, setCaption] = useState("");
  const [mood, setMood] = useState<string>("");
  const [tip, setTip] = useState<string>("");

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setUserId(getOrCreateUserId());
  }, []);

  async function load(uid: string) {
    if (!uid) return;

    setLoading(true);
    setStatus("");

    try {
      const res = await fetch("/api/today", {
        cache: "no-store",
        headers: { "x-user-id": uid },
      });

      const text = await res.text();

      if (!res.ok) {
        console.error("LOAD /api/today failed", res.status, text);
        setStatus(`load failed: ${res.status} ${text.slice(0, 200)}`);
        setLoading(false);
        return;
      }

      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        console.error("LOAD /api/today returned non-JSON", text);
        setStatus(`load returned non-JSON: ${text.slice(0, 200)}`);
        setLoading(false);
        return;
      }

      setTodayKey(data.todayKey ?? "");
      setPrompt(data.prompt ?? null);
      setPhoto(data.photo ?? null);
      setCaption(data.photo?.caption ?? "");
      setMood(data.photo?.mood ?? "");
      setLoading(false);
    } catch (e: any) {
      console.error("LOAD error", e);
      setStatus(`load error: ${e?.message ?? String(e)}`);
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!userId) return;
    void load(userId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function getStuckTip() {
    try {
      const res = await fetch("/api/stuck", { cache: "no-store" });
      const text = await res.text();

      if (!res.ok) {
        setStatus(`stuck failed: ${res.status} ${text.slice(0, 200)}`);
        return;
      }

      const data = JSON.parse(text);
      setTip(data.tip ?? "");
    } catch (e: any) {
      setStatus(`stuck error: ${e?.message ?? String(e)}`);
    }
  }

  async function doUpload() {
    if (!selectedFile) {
      setStatus("no file selected");
      return;
    }
    if (!userId) {
      setStatus("userId not ready yet — refresh and try again");
      return;
    }

    setUploading(true);
    setStatus(
      `prepping: ${selectedFile.name} (${selectedFile.type || "unknown"}, ${selectedFile.size} bytes)`
    );

    try {
      let fileToUpload = selectedFile;

      // ✅ Convert HEIC/HEIF to JPEG for browser compatibility
      if (isHeicLike(fileToUpload)) {
        setStatus("converting HEIC → JPEG…");
        fileToUpload = await heicToJpeg(fileToUpload);
        setStatus(
          `converted: ${fileToUpload.name} (${fileToUpload.type}, ${fileToUpload.size} bytes)`
        );
      }

      // ✅ IMPORTANT: dynamic import so build/prerender won't touch window
      const { upload } = await import("@vercel/blob/client");

      // 1) Upload to Vercel Blob
      setStatus("uploading to blob…");
      const blob = await upload(fileToUpload.name, fileToUpload, {
        access: "public",
        handleUploadUrl: "/api/blob",
      });

      setStatus(`blob uploaded: ${blob.url}`);

      // 2) Save metadata
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
        setStatus(`db save failed: ${res.status} ${text.slice(0, 250)}`);
        return;
      }

      setStatus("saved ✓");

      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      await load(userId);
    } catch (e: any) {
      console.error("UPLOAD error", e);
      setStatus(`upload error: ${e?.message ?? String(e)}`);
    } finally {
      setUploading(false);
    }
  }

  if (!userId) return <main className="container">loading…</main>;
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
      <p className="small">user: {userId}</p>

      {status && (
        <section className="card" style={{ marginTop: 12 }}>
          <div className="label">status</div>
          <p className="value" style={{ wordBreak: "break-word" }}>
            {status}
          </p>
        </section>
      )}

      {prompt && (
        <section className="card" style={{ marginTop: 12 }}>
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
            <button className="secondary" type="button" onClick={() => void getStuckTip()}>
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
                // ✅ allows HEIC selection in Finder; JPEG/PNG/etc still allowed
                accept="image/*,.heic,.heif,image/heic,image/heif"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setSelectedFile(f);
                  if (f) setStatus(`selected: ${f.name}`);
                }}
              />

              <button
                className="secondary"
                type="button"
                disabled={!selectedFile || uploading}
                onClick={(e) => {
                  e.preventDefault();
                  void doUpload();
                }}
              >
                {uploading ? "uploading…" : "upload"}
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