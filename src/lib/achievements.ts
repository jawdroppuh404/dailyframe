export type RankIcon = "frame" | "aperture" | "flash" | "sun" | "print" | "laurel";
export type CameraIcon = "disposable" | "instant" | "mirrorless" | "rangefinder" | "medium-format" | "technical";

export type Achievement = {
  days: number;
  rank: string;
  gear: string;
  rankIcon: RankIcon;
  cameraIcon: CameraIcon;
};

const FIXED_ACHIEVEMENTS: Achievement[] = [
  { days: 0, rank: "Fresh Roll", gear: "Disposable Camera", rankIcon: "frame", cameraIcon: "disposable" },
  { days: 3, rank: "Contact Sheet", gear: "Instax Mini 12", rankIcon: "frame", cameraIcon: "instant" },
  { days: 7, rank: "Street Shooter", gear: "Canon EOS R50", rankIcon: "aperture", cameraIcon: "mirrorless" },
  { days: 28, rank: "Visual Storyteller", gear: "Fujifilm X-T50", rankIcon: "aperture", cameraIcon: "mirrorless" },
  { days: 90, rank: "Light Chaser", gear: "Sony α7C II", rankIcon: "flash", cameraIcon: "mirrorless" },
  { days: 180, rank: "Image Maker", gear: "Leica Q3 43", rankIcon: "sun", cameraIcon: "rangefinder" },
  { days: 364, rank: "Master of Light", gear: "Hasselblad X2D II 100C", rankIcon: "print", cameraIcon: "medium-format" },
  { days: 730, rank: "Gallery Artist", gear: "Leica M11-P", rankIcon: "print", cameraIcon: "rangefinder" },
  { days: 1095, rank: "Silver Gelatin Master", gear: "ALPA 12 Plus System", rankIcon: "laurel", cameraIcon: "technical" },
  { days: 1460, rank: "Archive Keeper", gear: "Deardorff 8×10 View Camera", rankIcon: "laurel", cameraIcon: "technical" },
  { days: 1825, rank: "Photographic Laureate", gear: "Phase One XT IQ4 150MP", rankIcon: "laurel", cameraIcon: "medium-format" },
];

const COLLECTOR_GEAR = [
  "Rolleiflex 2.8F White Face",
  "Leica M3 Black Paint",
  "Hasselblad 500C Moon-Style Kit",
  "Polaroid 20×24 Camera",
  "Leica 0-Series Collector Camera",
];

function annualAchievement(year: number): Achievement {
  const collectorIndex = year - 6;
  return {
    days: year * 365,
    rank: year < 10 ? `Lifetime Image Maker · Year ${year}` : `Museum Circle · Year ${year}`,
    gear: COLLECTOR_GEAR[collectorIndex] ?? `Museum Camera Selection · Year ${year}`,
    rankIcon: "laurel",
    cameraIcon: year % 2 === 0 ? "technical" : "rangefinder",
  };
}

export function achievementForStreak(bestStreak: number) {
  if (bestStreak >= 6 * 365) {
    return annualAchievement(Math.floor(bestStreak / 365));
  }
  return [...FIXED_ACHIEVEMENTS].reverse().find((item) => bestStreak >= item.days)!;
}

export function upcomingAchievements(bestStreak: number, limit = 6) {
  const upcoming = FIXED_ACHIEVEMENTS.filter((item) => item.days > bestStreak);
  let year = 6;
  while (upcoming.length < limit) {
    const item = annualAchievement(year);
    if (item.days > bestStreak) upcoming.push(item);
    year += 1;
  }
  return upcoming.slice(0, limit);
}

export function achievementRoadmap(bestStreak: number) {
  const annualThrough = Math.max(12, Math.floor(bestStreak / 365) + 6);
  return [
    ...FIXED_ACHIEVEMENTS,
    ...Array.from({ length: annualThrough - 5 }, (_, index) => annualAchievement(index + 6)),
  ];
}
