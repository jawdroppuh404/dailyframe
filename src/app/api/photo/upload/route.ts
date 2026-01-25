import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dateKeyInTZ } from "@/lib/date";

export const runtime = "nodejs";

function requireUserId(req: Request) {
  const userId = req.headers.get("x-user-id");
  return userId && userId.trim().length > 0 ? userId.trim() : null;
}

export async function POST(req: Request) {
  const userId = requireUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Missing x-user-id header" }, { status: 400 });
  }

  // Ensure user exists (race-safe)
  const user = await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: { id: userId, timezone: "America/New_York" },
  });

  const body = await req.json().catch(() => null);
  const imagePath = body?.imagePath as string | undefined;
  const caption = (body?.caption as string | undefined) ?? "";
  const mood = (body?.mood as string | undefined) ?? "";
  const promptId = (body?.promptId as string | null | undefined) ?? null;

  if (!imagePath) {
    return NextResponse.json({ error: "Missing imagePath" }, { status: 400 });
  }

  const todayKey = dateKeyInTZ(new Date(), user.timezone);

  const saved = await prisma.dailyPhoto.upsert({
    where: { userId_dateKey: { userId, dateKey: todayKey } },
    update: { imagePath, caption, mood, promptId },
    create: { userId, dateKey: todayKey, imagePath, caption, mood, promptId },
  });

  return NextResponse.json({ ok: true, photo: saved });
}
