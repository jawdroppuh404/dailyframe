"use client";

import { FormEvent, useState } from "react";
import { clearLegacyUserId, getLegacyUserId } from "@/lib/client-user";

export type Account = { id: string; email: string };

export function AuthForm({ onAuthenticated }: { onAuthenticated: (user: Account) => void }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          legacyUserId: mode === "signup" ? getLegacyUserId() : null,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Unable to continue.");
        return;
      }

      clearLegacyUserId();
      onAuthenticated(data.user);
    } catch {
      setError("Unable to reach the server. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="container auth-shell">
      <div className="h1">Daily Frame</div>
      <p className="meta">one day. one prompt. one private photo.</p>

      <section className="card auth-card">
        <div className="auth-tabs">
          <button
            type="button"
            className={mode === "login" ? "active" : "secondary"}
            onClick={() => { setMode("login"); setError(""); }}
          >
            log in
          </button>
          <button
            type="button"
            className={mode === "signup" ? "active" : "secondary"}
            onClick={() => { setMode("signup"); setError(""); }}
          >
            create account
          </button>
        </div>

        <form onSubmit={submit} className="grid" style={{ marginTop: 16 }}>
          <label className="label">
            email
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label className="label">
            password {mode === "signup" ? "(10+ characters)" : ""}
            <input
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              minLength={10}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          {error && <p className="form-error">{error}</p>}

          <button type="submit" disabled={submitting}>
            {submitting ? "working…" : mode === "login" ? "log in" : "create account"}
          </button>
        </form>

        {mode === "signup" && getLegacyUserId() && (
          <p className="small" style={{ marginTop: 14 }}>
            your photos and streak from this browser will move into the new account.
          </p>
        )}
      </section>
    </main>
  );
}
