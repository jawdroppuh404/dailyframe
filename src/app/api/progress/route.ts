import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dateKeyInTZ } from "@/lib/date";
import { achievementForStreak, achievementRoadmap, upcomingAchievements } from "@/lib/achievements";
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
    select: {
      dateKey: true,
      caption: true,
      mood: true,
      prompt: { select: { title: true, constraint: true, twist: true } },
    },
    orderBy: { dateKey: "desc" },
  });

  const dateKeysDesc = photos.map((p) => p.dateKey);
  const streak = computeStreak(dateKeysDesc, todayKey);
  const bestStreak = computeLongestStreak(dateKeysDesc);
  const assignments = await prisma.dailyPromptAssignment.findMany({
    where: { dateKey: { in: dateKeysDesc } },
    select: { dateKey: true, prompt: { select: { title: true, constraint: true, twist: true } } },
  });
  const assignedPrompts = new Map(assignments.map((assignment) => [assignment.dateKey, assignment.prompt]));
  const archivePhotos = await prisma.archivePhoto.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      createdAt: true,
      promptDateKey: true,
      caption: true,
      mood: true,
      prompt: { select: { title: true, constraint: true, twist: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  const previousPhotos = [
    ...photos.filter((photo) => photo.dateKey < todayKey).map((photo) => ({
      sortKey: `${photo.dateKey}T23:59:59.999Z`,
      dateKey: photo.dateKey,
      caption: photo.caption,
      mood: photo.mood,
      imageUrl: `/dailyframe/api/photo/file?dateKey=${encodeURIComponent(photo.dateKey)}`,
      alternate: false,
      prompt: photo.prompt ?? assignedPrompts.get(photo.dateKey) ?? null,
    })),
    ...archivePhotos.map((photo) => ({
      sortKey: photo.createdAt.toISOString(),
      dateKey: photo.promptDateKey,
      caption: photo.caption,
      mood: photo.mood,
      imageUrl: `/dailyframe/api/photo/file?archiveId=${encodeURIComponent(photo.id)}`,
      alternate: true,
      prompt: photo.prompt,
    })),
  ].sort((a, b) => b.sortKey.localeCompare(a.sortKey)).map(({ sortKey: _sortKey, ...photo }) => photo);

  return NextResponse.json(
    {
      todayKey,
      streak,
      bestStreak,
      dateKeysDesc,
      previousPhotos,
      achievement: achievementForStreak(bestStreak),
      rankRoadmap: achievementRoadmap(bestStreak),
      upcomingAchievements: upcomingAchievements(bestStreak),
    },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
