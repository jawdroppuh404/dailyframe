"use client";

import { FormEvent, useEffect, useState } from "react";
import { AccountNav } from "@/components/account-nav";
import { AchievementBadges } from "@/components/achievement-badges";
import { Account, AuthForm } from "@/components/auth-form";
import { VerificationControls } from "@/components/verification-gate";
import type { Achievement } from "@/lib/achievements";
import { appPath } from "@/lib/app-path";

type StreakProgress = {
  streak: number;
  bestStreak: number;
  achievement: Achievement;
  upcomingAchievements: Achievement[];
};

export default function AccountPage() {
  const [account, setAccount] = useState<Account | null | undefined>(undefined);
  const [showDelete, setShowDelete] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [status, setStatus] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [progress, setProgress] = useState<StreakProgress | null>(null);
  const [feedbackType, setFeedbackType] = useState<"comment" | "bug">("comment");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState("");
  const [sendingFeedback, setSendingFeedback] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [profileStatus, setProfileStatus] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [showGearHelp, setShowGearHelp] = useState(false);

  useEffect(() => {
    void fetch(appPath("/api/auth/session"), { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => setAccount(data.user ?? null))
      .catch(() => setAccount(null));
  }, []);

  useEffect(() => {
    if (account) setDisplayName(account.name ?? "");
  }, [account]);

  useEffect(() => {
    setShowGearHelp(new URLSearchParams(window.location.search).get("help") === "gear");
  }, []);

  useEffect(() => {
    if (!account?.emailVerified) return;
    void fetch(appPath("/api/progress"), { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load streak progress.");
        return response.json();
      })
      .then((data) => setProgress(data))
      .catch(() => setProgress(null));
  }, [account]);

  async function deleteAccount(event: FormEvent) {
    event.preventDefault();
    setDeleting(true);
    setStatus("");
    try {
      const response = await fetch(appPath("/api/account/delete"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, confirmation }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to delete account.");
      window.location.href = appPath();
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
      const response = await fetch(appPath("/api/auth/password-reset/request"), {
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

  async function sendFeedback(event: FormEvent) {
    event.preventDefault();
    setSendingFeedback(true);
    setFeedbackStatus("");
    try {
      const response = await fetch(appPath("/api/feedback"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: feedbackType, message: feedbackMessage }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to send feedback.");
      setFeedbackMessage("");
      setFeedbackStatus("sent ✓");
    } catch (error) {
      setFeedbackStatus(error instanceof Error ? error.message : "Unable to send feedback.");
    } finally {
      setSendingFeedback(false);
    }
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    setSavingProfile(true);
    setProfileStatus("");
    try {
      const response = await fetch(appPath("/api/account/profile"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: displayName }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to save display name.");
      setDisplayName(data.name);
      setAccount((current) => current ? { ...current, name: data.name } : current);
      setProfileStatus("saved ✓");
    } catch (error) {
      setProfileStatus(error instanceof Error ? error.message : "Unable to save display name.");
    } finally {
      setSavingProfile(false);
    }
  }

  if (account === undefined) return <main className="container">loading…</main>;
  if (!account) return <AuthForm onAuthenticated={setAccount} />;

  return (
    <main className="container">
      <AccountNav account={account} />
      <div className="h1">My Account</div>
      <p className="meta">your streak, status, and account controls.</p>

      {showGearHelp && (
        <aside className="gear-help" role="dialog" aria-label="Gear help">
          <button className="gear-help-close" type="button" aria-label="Close" onClick={() => setShowGearHelp(false)}>×</button>
          <strong>Upgrade your gear with a longer streak</strong>
          <p className="small">Post one private frame each day to unlock the next rank and camera.</p>
        </aside>
      )}

      {account.emailVerified && progress ? (
        <section className="card achievement-card">
          <div className="label">streak program</div>
          <div className="streak-stats">
            <div><span>{progress.streak}</span><small>current streak</small></div>
            <div><span>{progress.bestStreak}</span><small>personal best</small></div>
          </div>
          <AchievementBadges achievement={progress.achievement} />
          {progress.upcomingAchievements[0] && (
            <p className="next-unlock">
              {progress.upcomingAchievements[0].days - progress.bestStreak} more streak days to unlock <strong>{progress.upcomingAchievements[0].rank}</strong>
            </p>
          )}
          <div className="upcoming-ranks">
            <div className="label">upcoming ranks</div>
            {progress.upcomingAchievements.map((item) => (
              <div className="upcoming-rank" key={item.days}>
                <div>
                  <strong>{item.rank}</strong>
                  <span>{item.gear}</span>
                </div>
                <span>{item.days - progress.bestStreak} days</span>
              </div>
            ))}
          </div>
        </section>
      ) : account.emailVerified ? (
        <section className="card"><p className="small">loading streak status…</p></section>
      ) : (
        <section className="account-section">
          <div className="h1">Confirm your email</div>
          <p className="meta">confirm your address to unlock prompts, streaks, and ranks.</p>
          <VerificationControls email={account.email} />
        </section>
      )}

      <section className="card grid account-section">
        <form className="grid" onSubmit={saveProfile}>
          <label className="label">
            display name
            <input
              required
              minLength={2}
              maxLength={40}
              autoComplete="nickname"
              value={displayName}
              placeholder="how you want to be known"
              onChange={(event) => setDisplayName(event.target.value)}
            />
          </label>
          {profileStatus && <p className={profileStatus.includes("✓") ? "small" : "form-error"}>{profileStatus}</p>}
          <button className="secondary" type="submit" disabled={savingProfile || displayName.trim().length < 2}>
            {savingProfile ? "saving…" : "save display name"}
          </button>
        </form>
        <hr />
        <div>
          <div className="label">email</div>
          <p className="value">{account.email}</p>
          <p className="small">{account.emailVerified ? "confirmed ✓" : "confirmation pending"}</p>
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

      <section className="card account-section feedback-card">
        <div className="label">feedback</div>
        <p className="small">Send a comment or report a bug.</p>
        {account.emailVerified ? (
          <form className="grid" onSubmit={sendFeedback}>
            <label className="label">
              type
              <select
                value={feedbackType}
                onChange={(event) => setFeedbackType(event.target.value as "comment" | "bug")}
              >
                <option value="comment">comment</option>
                <option value="bug">bug report</option>
              </select>
            </label>
            <label className="label">
              message
              <textarea
                required
                minLength={3}
                maxLength={4000}
                rows={6}
                value={feedbackMessage}
                placeholder={feedbackType === "bug" ? "what happened, and what did you expect?" : "what would you like to share?"}
                onChange={(event) => setFeedbackMessage(event.target.value)}
              />
            </label>
            {feedbackStatus && <p className={feedbackStatus.includes("✓") ? "small" : "form-error"}>{feedbackStatus}</p>}
            <button type="submit" disabled={sendingFeedback || feedbackMessage.trim().length < 3}>
              {sendingFeedback ? "sending…" : "send feedback"}
            </button>
          </form>
        ) : (
          <p className="small">Confirm your email before sending feedback.</p>
        )}
      </section>

      {account.emailVerified && <section className="card danger-zone">
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
      </section>}
    </main>
  );
}
