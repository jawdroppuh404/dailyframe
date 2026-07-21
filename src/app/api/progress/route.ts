import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dateKeyInTZ } from "@/lib/date";
import { achievementForStreak, upcomingAchievements } from "@/lib/achievements";
import { computeLongestStreak, computeStreak } from "@/lib/streak";
import { getAuthenticatedUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const todayKey = dateKeyInTZ(new Date(), user.timezone);

  const photos = await prisma.dailyPhoto.findMany({
    where: { userId: user.id },
    select: { dateKey: true },
    orderBy: { dateKey: "desc" },
  });

  const dateKeysDesc = photos.map((p) => p.dateKey);
  const streak = computeStreak(dateKeysDesc, todayKey);
  const bestStreak = computeLongestStreak(dateKeysDesc);

  return NextResponse.json(
    {
      todayKey,
      streak,
      bestStreak,
      dateKeysDesc,
      achievement: achievementForStreak(bestStreak),
      upcomingAchievements: upcomingAchievements(bestStreak),
    },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
