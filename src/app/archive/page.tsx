"use client";

import { useEffect, useState } from "react";
import { appPath } from "@/lib/app-path";

type Prompt = { id: string; title: string; constraint?: string | null; twist?: string | null; tags?: string | null };

export default function ArchivePage() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);

  useEffect(() => {
    fetch(appPath("/api/archive"), { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setPrompts(d.prompts))
      .catch(() => setPrompts([]));
  }, []);

  return (
    <main className="container">
      <nav className="nav">
        <a href={appPath()}>today</a>
        <a href={appPath("/archive")}>archive</a>
        <a href={appPath("/progress")}>progress</a>
      </nav>

      <div className="h1">Prompt Archive</div>
      <p className="meta">revisit prompts anytime. (no social feed.)</p>

      <div className="card">
        <ul style={{ margin: 0, paddingLeft: 16 }}>
          {prompts.map((p) => (
            <li key={p.id} style={{ marginBottom: 12 }}>
              <div style={{ color: "var(--text)", marginBottom: 4 }}>{p.title}</div>
              {p.constraint ? <div className="small">constraint: {p.constraint}</div> : null}
              {p.twist ? <div className="small">twist: {p.twist}</div> : null}
            </li>
          ))}
          {prompts.length === 0 ? <li className="small">no prompts yet</li> : null}
        </ul>
      </div>
    </main>
  );
}
