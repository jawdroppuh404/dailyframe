"use client";

import { useState } from "react";

export function VerificationGate({ email }: { email: string }) {
  const [status, setStatus] = useState("Check your inbox for the confirmation link.");
  const [sending, setSending] = useState(false);

  async function resend() {
    setSending(true);
    try {
      const response = await fetch("/api/auth/resend-verification", { method: "POST" });
      const data = await response.json();
      setStatus(response.ok ? "Confirmation email sent." : data.error ?? "Unable to send email.");
    } catch {
      setStatus("Unable to send email. Try again later.");
    } finally {
      setSending(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  return (
    <main className="container auth-shell">
      <div className="h1">Confirm your email</div>
      <p className="meta">one quick check before Daily Frame unlocks.</p>
      <section className="card auth-card grid">
        <p className="value">
          We sent a confirmation link to <strong>{email}</strong>.
        </p>
        <p className="small">{status}</p>
        <button type="button" disabled={sending} onClick={() => void resend()}>
          {sending ? "sending…" : "resend confirmation"}
        </button>
        <button className="secondary" type="button" onClick={() => void logout()}>
          log out
        </button>
      </section>
    </main>
  );
}
