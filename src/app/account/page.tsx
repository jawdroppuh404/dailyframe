"use client";

import { FormEvent, useEffect, useState } from "react";
import { AccountNav } from "@/components/account-nav";
import { Account, AuthForm } from "@/components/auth-form";
import { VerificationGate } from "@/components/verification-gate";

export default function AccountPage() {
  const [account, setAccount] = useState<Account | null | undefined>(undefined);
  const [showDelete, setShowDelete] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [status, setStatus] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  useEffect(() => {
    void fetch("/api/auth/session", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => setAccount(data.user ?? null))
      .catch(() => setAccount(null));
  }, []);

  async function deleteAccount(event: FormEvent) {
    event.preventDefault();
    setDeleting(true);
    setStatus("");
    try {
      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, confirmation }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to delete account.");
      window.location.href = "/";
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to delete account.");
      setDeleting(false);
    }
  }

  async function sendResetEmail() {
    if (!account) return;
    setSendingReset(true);
    setStatus("");
    try {
      const response = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: account.email }),
      });
      const data = await response.json();
      setStatus(data.message ?? "If that account exists, a reset link is on its way.");
    } catch {
      setStatus("Unable to request a reset link.");
    } finally {
      setSendingReset(false);
    }
  }

  if (account === undefined) return <main className="container">loading…</main>;
  if (!account) return <AuthForm onAuthenticated={setAccount} />;
  if (!account.emailVerified) return <VerificationGate email={account.email} />;

  return (
    <main className="container">
      <AccountNav email={account.email} />
      <div className="h1">Account</div>
      <p className="meta">manage your Daily Frame account.</p>

      <section className="card grid">
        <div>
          <div className="label">email</div>
          <p className="value">{account.email}</p>
          <p className="small">confirmed ✓</p>
        </div>
        <button
          className="secondary"
          type="button"
          disabled={sendingReset}
          onClick={() => void sendResetEmail()}
        >
          {sendingReset ? "sending…" : "send password reset email"}
        </button>
        {status && !showDelete && <p className="small">{status}</p>}
      </section>

      <section className="card danger-zone">
        <div className="label">danger zone</div>
        <p className="small">
          Deleting your account permanently removes your streak, captions, and private photos.
        </p>
        {!showDelete ? (
          <button className="danger-button" type="button" onClick={() => setShowDelete(true)}>
            delete account…
          </button>
        ) : (
          <form className="grid" onSubmit={deleteAccount}>
            <label className="label">
              current password
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <label className="label">
              type DELETE MY ACCOUNT to confirm
              <input
                required
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
              />
            </label>
            {status && <p className="form-error">{status}</p>}
            <button
              className="danger-button"
              type="submit"
              disabled={deleting || confirmation !== "DELETE MY ACCOUNT"}
            >
              {deleting ? "deleting…" : "permanently delete account"}
            </button>
            <button className="secondary" type="button" onClick={() => setShowDelete(false)}>
              cancel
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
