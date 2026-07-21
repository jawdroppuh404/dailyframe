"use client";

import { FormEvent, useEffect, useState } from "react";
import { appPath } from "@/lib/app-path";

export default function ResetPasswordPage() {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [status, setStatus] = useState("");
  const [complete, setComplete] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get("token") ?? "");
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (password !== confirmation) return setStatus("Passwords do not match.");
    setSubmitting(true);
    setStatus("");
    try {
      const response = await fetch(appPath("/api/auth/password-reset/confirm"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to reset password.");
      window.history.replaceState({}, "", appPath("/reset-password"));
      setComplete(true);
      setStatus("Password updated. You can log in now.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to reset password.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="container auth-shell">
      <div className="h1">Reset password</div>
      <section className="card auth-card">
        {complete ? (
          <div className="grid">
            <p className="value">{status}</p>
            <a className="button-link" href={appPath()}>return to login</a>
          </div>
        ) : (
          <form className="grid" onSubmit={submit}>
            <label className="label">
              new password (10+ characters)
              <input
                type="password"
                autoComplete="new-password"
                minLength={10}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <label className="label">
              confirm new password
              <input
                type="password"
                autoComplete="new-password"
                minLength={10}
                required
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
              />
            </label>
            {status && <p className="form-error">{status}</p>}
            <button type="submit" disabled={submitting || !token}>
              {submitting ? "updating…" : "set new password"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
