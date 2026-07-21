"use client";

import { appPath } from "@/lib/app-path";

export function AccountNav({ email }: { email: string }) {
  async function logout() {
    await fetch(appPath("/api/auth/logout"), { method: "POST" });
    window.location.href = appPath();
  }

  return (
    <>
      <nav className="nav">
        <a href={appPath()}>today</a>
        <a href={appPath("/archive")}>archive</a>
        <a href={appPath("/progress")}>progress</a>
        <a href={appPath("/account")}>account</a>
        <button className="nav-button" type="button" onClick={() => void logout()}>
          log out
        </button>
      </nav>
      <p className="small account-email">{email}</p>
    </>
  );
}
