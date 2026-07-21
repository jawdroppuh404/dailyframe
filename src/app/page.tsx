"use client";

import { useEffect, useRef, useState } from "react";
import { AccountNav } from "@/components/account-nav";
import { Account, AuthForm } from "@/components/auth-form";
import { SharePromptButton } from "@/components/share-prompt-button";
import { VerificationGate } from "@/components/verification-gate";
import { appPath } from "@/lib/app-path";

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
    }
  | null;

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
  const { default: heic2any } = await import("heic2any");
  const out = (await heic2any({
    blob: file,
    toType: "image/jpeg",
    quality: 0.9,
  })) as Blob;
  const baseName = file.name.replace(/\.(heic|heif)$/i, "");
  return new File([out], `${baseName}.jpg`, { type: "image/jpeg" });
}

const MAX_PHOTO_DIMENSION = 1600;
const JPEG_QUALITY = 0.8;

async function optimizePhoto(file: File): Promise<File> {
  const objectUrl = URL.createObjectURL(file);
  const photo = new Image();
  try {
    await new Promise<void>((resolve, reject) => {
      photo.onload = () => resolve();
      photo.onerror = () => reject(new Error("Unable to read this photo."));
      photo.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }

  const scale = Math.min(1, MAX_PHOTO_DIMENSION / Math.max(photo.naturalWidth, photo.naturalHeight));
  const width = Math.max(1, Math.round(photo.naturalWidth * scale));
  const height = Math.max(1, Math.round(photo.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Unable to prepare this photo.");
  context.drawImage(photo, 0, 0, width, height);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => result ? resolve(result) : reject(new Error("Unable to compress this photo.")),
      "image/jpeg",
      JPEG_QUALITY,
    );
  });
  const baseName = file.name.replace(/\.[^.]+$/, "").slice(0, 100) || "photo";
  return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
}

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
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function loadToday() {
    setLoading(true);
    setStatus("");
    try {
      const response = await fetch(appPath("/api/today"), { cache: "no-store" });
      if (response.status === 401) {
        setAccount(null);
        return;
      }
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
        if (data.user?.emailVerified) return loadToday();
        setLoading(false);
      })
      .catch(() => {
        setAccount(null);
        setLoading(false);
      });
  }, []);

  async function getStuckTip() {
    const response = await fetch(appPath("/api/stuck"), { cache: "no-store" });
    const data = await response.json();
    if (response.ok) setTip(data.tip ?? "");
  }

  async function doUpload() {
    if (!selectedFile) return setStatus("no file selected");
    if (!account) return setStatus("log in before uploading");
    setUploading(true);
    setStatus("preparing photo…");

    try {
      let file = selectedFile;
      if (isHeicLike(file)) {
        setStatus("converting HEIC to JPEG…");
        file = await heicToJpeg(file);
      }

      setStatus("resizing and compressing photo…");
      file = await optimizePhoto(file);

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
  if (!account) {
    return (
      <AuthForm
        onAuthenticated={(user) => {
          setAccount(user);
          if (user.emailVerified) void loadToday();
        }}
      />
    );
  }
  if (!account.emailVerified) return <VerificationGate email={account.email} />;

  return (
    <main className="container">
      <AccountNav account={account} />
      <div className="h1">Daily Frame</div>
      <p className="meta">today: {todayKey}</p>

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
          <div style={{ marginTop: 10 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="photo" src={photo.imageUrl} alt="today" />
            <p className="small">only your signed-in account can load this photo.</p>
          </div>
        ) : (
          <p className="small">no photo yet. upload one to lock in your day.</p>
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
              <option value="Calm">calm</option>
              <option value="Moody">moody</option>
              <option value="Joyful">joyful</option>
              <option value="Curious">curious</option>
              <option value="Gritty">gritty</option>
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
                {uploading ? "uploading…" : "upload privately"}
              </button>
              {selectedFile && <p className="small">selected: <em>{selectedFile.name}</em> · resized to 1600px and compressed before upload</p>}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
