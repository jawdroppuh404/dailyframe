"use client";

import { Achievement, CameraIcon, RankIcon } from "@/lib/achievements";

function RankMark({ kind }: { kind: RankIcon }) {
  if (kind === "aperture") return <><circle cx="32" cy="32" r="22" /><path d="M32 10l10 17-10 17-10-17zM14 22h18M32 42h18" /></>;
  if (kind === "flash") return <><path d="M37 7L19 34h13l-5 23 18-29H32z" /><circle cx="32" cy="32" r="27" /></>;
  if (kind === "sun") return <><circle cx="32" cy="32" r="13" /><path d="M32 5v9M32 50v9M5 32h9M50 32h9M13 13l7 7M44 44l7 7M51 13l-7 7M20 44l-7 7" /></>;
  if (kind === "print") return <><rect x="10" y="8" width="44" height="48" rx="2" /><rect x="17" y="15" width="30" height="27" /><path d="M18 49h28" /></>;
  if (kind === "laurel") return <><circle cx="32" cy="31" r="12" /><path d="M20 55C7 45 7 23 18 11M44 55c13-10 13-32 2-44M13 42l9 1M10 32l9 3M12 21l8 6M51 42l-9 1M54 32l-9 3M52 21l-8 6" /></>;
  return <><rect x="10" y="10" width="44" height="44" rx="3" /><path d="M18 44l10-12 7 7 7-9 6 14z" /><circle cx="40" cy="22" r="4" /></>;
}

function CameraMark({ kind }: { kind: CameraIcon }) {
  const lens = kind === "technical" ? <rect x="26" y="24" width="18" height="18" /> : <circle cx="35" cy="33" r={kind === "medium-format" ? 12 : 10} />;
  return (
    <>
      <path d={kind === "instant" ? "M15 14h37v43H15z" : kind === "disposable" ? "M8 20h48v29H8z" : kind === "medium-format" ? "M10 13h44v42H10z" : "M7 21h50v31H7z"} />
      <path d="M17 20l4-7h20l5 8M12 27h8" />
      {lens}
      {kind === "rangefinder" && <><rect x="15" y="26" width="8" height="5" /><rect x="47" y="26" width="5" height="5" /></>}
      {kind === "instant" && <path d="M22 57h24l-4-12H26z" />}
      {kind === "technical" && <path d="M16 18v35M51 18v35M20 48h30" />}
    </>
  );
}

function Badge({ label, value, children }: { label: string; value: string; children: React.ReactNode }) {
  return (
    <div className="achievement-badge">
      <svg viewBox="0 0 64 64" role="img" aria-label={`${label}: ${value}`}>
        <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {children}
        </g>
      </svg>
      <div>
        <div className="label">{label}</div>
        <div className="badge-name">{value}</div>
      </div>
    </div>
  );
}

export function AchievementBadges({ achievement }: { achievement: Achievement }) {
  return (
    <div className="achievement-badges">
      <Badge label="rank" value={achievement.rank}><RankMark kind={achievement.rankIcon} /></Badge>
      <Badge label="camera" value={achievement.gear}><CameraMark kind={achievement.cameraIcon} /></Badge>
    </div>
  );
}
