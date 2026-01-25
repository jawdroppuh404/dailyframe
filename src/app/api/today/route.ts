import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dateKeyInTZ } from "@/lib/date";

export const runtime = "nodejs";

function requireUserId(req: Request) {
  const userId = req.headers.get("x-user-id");
  return userId && userId.trim().length > 0 ? userId.trim() : null;
}

export async function GET(req: Request) {
  const userId = requireUserId(req);
  if (!userId) {
    return NextResponse.json(
      { error: "Missing x-user-id header" },
      { status: 400 }
    );
  }

  // Ensure user exists (race-safe)
  const user = await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: { id: userId, timezone: "America/New_York" },
  });

  const todayKey = dateKeyInTZ(new Date(), user.timezone);

  const prompt = await prisma.prompt.findFirst({
    where: { active: true },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, constraint: true, twist: true },
  });

  const photo = await prisma.dailyPhoto.findUnique({
    where: { userId_dateKey: { userId, dateKey: todayKey } },
    select: { imagePath: true, caption: true, mood: true, promptId: true },
  });

  return NextResponse.json({ todayKey, prompt, photo });
}