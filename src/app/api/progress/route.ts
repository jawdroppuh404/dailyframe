import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dateKeyInTZ } from "@/lib/date";
import { computeStreak } from "@/lib/streak";

const USER_ID = "demo-user";

export async function GET() {
  const user = await prisma.user.findUnique({ where: { id: USER_ID } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const todayKey = dateKeyInTZ(new Date(), user.timezone);

  const photos = await prisma.dailyPhoto.findMany({
    where: { userId: USER_ID },
    select: { dateKey: true },
    orderBy: { dateKey: "desc" },
  });

  const dateKeysDesc = photos.map((p) => p.dateKey);
  const streak = computeStreak(dateKeysDesc, todayKey);

  return NextResponse.json({ todayKey, streak, dateKeysDesc });
}
