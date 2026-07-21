"use client";

import { useEffect, useState } from "react";

export default function VerifyEmailPage() {
  const [status, setStatus] = useState("confirming your email…");
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) {
      setStatus("This confirmation link is invalid.");
      return;
    }

    void fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Unable to confirm email.");
        window.history.replaceState({}, "", "/verify-email");
        setVerified(true);
        setStatus("Email confirmed. Daily Frame is unlocked.");
      })
      .catch((error) => setStatus(error instanceof Error ? error.message : "Unable to confirm email."));
  }, []);

  return (
    <main className="container auth-shell">
      <div className="h1">Email confirmation</div>
      <section className="card auth-card grid">
        <p className="value">{status}</p>
        {verified && <a className="button-link" href="/">continue to today’s prompt</a>}
      </section>
    </main>
  );
}
