import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dateKeyInTZ } from "@/lib/date";
import { computeStreak } from "@/lib/streak";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const userId = req.headers.get("x-user-id")?.trim();
  if (!userId) {
    return NextResponse.json({ error: "Missing x-user-id header" }, { status: 400 });
  }

  const user = await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: { id: userId, timezone: "America/New_York" },
  });

  const todayKey = dateKeyInTZ(new Date(), user.timezone);

  const photos = await prisma.dailyPhoto.findMany({
    where: { userId },
    select: { dateKey: true },
    orderBy: { dateKey: "desc" },
  });

  const dateKeysDesc = photos.map((p) => p.dateKey);
  const streak = computeStreak(dateKeysDesc, todayKey);

  return NextResponse.json(
    { todayKey, streak, dateKeysDesc },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
