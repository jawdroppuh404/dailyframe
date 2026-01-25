import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dateKeyInTZ } from "@/lib/date";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const userId = request.headers.get("x-user-id")?.trim();

  if (!userId) {
    return NextResponse.json({ error: "Missing x-user-id header" }, { status: 401 });
  }

  // Create user automatically on first use (simple MVP)
  const user =
    (await prisma.user.findUnique({ where: { id: userId } })) ??
    (await prisma.user.create({
      data: {
        id: userId,
        timezone: "America/New_York",
      },
    }));

  const body = await request.json().catch(() => null);
  const imagePath = body?.imagePath as string | undefined;
  const caption = (body?.caption as string | undefined) ?? null;
  const mood = (body?.mood as string | undefined) ?? null;
  const promptId = (body?.promptId as string | undefined) ?? null;

  if (!imagePath) {
    return NextResponse.json({ error: "Missing imagePath" }, { status: 400 });
  }

  const todayKey = dateKeyInTZ(new Date(), user.timezone);

  const saved = await prisma.dailyPhoto.upsert({
    where: { userId_dateKey: { userId, dateKey: todayKey } },
    update: { imagePath, caption, mood, ...(promptId ? { promptId } : {}) },
    create: { userId, dateKey: todayKey, imagePath, caption, mood, promptId },
  });

  return NextResponse.json({ ok: true, photo: saved });
}