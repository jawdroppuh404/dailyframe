"use client";

import { useEffect, useState } from "react";
import { AchievementBadges } from "@/components/achievement-badges";
import type { Account } from "@/components/auth-form";
import type { Achievement } from "@/lib/achievements";
import { appPath } from "@/lib/app-path";

export function AccountNav({ account, showLogout = false }: { account: Account; showLogout?: boolean }) {
  const [achievement, setAchievement] = useState<Achievement | null>(null);

  useEffect(() => {
    if (!account.emailVerified) return;
    void fetch(appPath("/api/progress"), { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => setAchievement(data?.achievement ?? null))
      .catch(() => setAchievement(null));
  }, [account.emailVerified]);

  async function logout() {
    await fetch(appPath("/api/auth/logout"), { method: "POST" });
    window.location.href = appPath();
  }

  return (
    <>
      <nav className="nav">
        <a href={appPath()}>today</a>
        <a href={appPath("/progress")}>progress</a>
        <a href={appPath("/account")}>account</a>
        <a href={appPath("/archive")}>archive</a>
      </nav>
      {showLogout && <button className="nav-button account-logout" type="button" onClick={() => void logout()}>
        log out
      </button>}
      <div className="account-identity">
        <div className="identity-copy">
          {account.name ? <strong>{account.name}</strong> : <span className="small">{account.email}</span>}
        </div>
        {achievement && <AchievementBadges achievement={achievement} compact />}
      </div>
    </>
  );
}
