import { NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { dateKeyInTZ } from "@/lib/date";
import { getAuthenticatedUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const pathname = typeof body?.pathname === "string" ? body.pathname : "";
  const caption = typeof body?.caption === "string" ? body.caption.slice(0, 500) : "";
  const mood = typeof body?.mood === "string" ? body.mood.slice(0, 50) : "";
  const promptId = typeof body?.promptId === "string" && body.promptId ? body.promptId : null;
  const todayKey = dateKeyInTZ(new Date(), user.timezone);

  if (!pathname.startsWith(`users/${user.id}/${todayKey}/`)) {
    return NextResponse.json({ error: "Invalid private photo path." }, { status: 400 });
  }

  const previous = await prisma.dailyPhoto.findUnique({
    where: { userId_dateKey: { userId: user.id, dateKey: todayKey } },
    select: { imagePath: true },
  });

  const saved = await prisma.dailyPhoto.upsert({
    where: { userId_dateKey: { userId: user.id, dateKey: todayKey } },
    update: { imagePath: pathname, caption, mood, promptId },
    create: {
      userId: user.id,
      dateKey: todayKey,
      imagePath: pathname,
      caption,
      mood,
      promptId,
    },
  });

  if (previous && previous.imagePath !== pathname && !previous.imagePath.startsWith("https://")) {
    const token = process.env.PRIVATE_BLOB_READ_WRITE_TOKEN;
    if (token) {
      try {
        await del(previous.imagePath, { token });
      } catch (error) {
        console.error("Unable to remove replaced private photo", error);
      }
    }
  }

  return NextResponse.json({ ok: true, photoId: saved.id });
}
