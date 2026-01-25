import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dateKeyInTZ } from "@/lib/date";

export const runtime = "nodejs";

const USER_ID = "demo-user";

export async function POST(req: Request) {
  const user = await prisma.user.findUnique({ where: { id: USER_ID } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const body = await req.json();
  const imagePath = body?.imagePath as string | undefined;
  const caption = (body?.caption as string | undefined) ?? null;
  const mood = (body?.mood as string | undefined) ?? null;

  if (!imagePath) {
    return NextResponse.json({ error: "Missing imagePath" }, { status: 400 });
  }

  const todayKey = dateKeyInTZ(new Date(), user.timezone);

  const saved = await prisma.dailyPhoto.upsert({
    where: { userId_dateKey: { userId: USER_ID, dateKey: todayKey } },
    update: { imagePath, caption, mood },
    create: { userId: USER_ID, dateKey: todayKey, imagePath, caption, mood },
  });

  return NextResponse.json({ ok: true, photo: saved });
}
