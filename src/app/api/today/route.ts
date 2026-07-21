import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dateKeyInTZ } from "@/lib/date";
import { getOrAssignDailyPrompt } from "@/lib/prompt";
import { getAuthenticatedUser } from "@/lib/auth";
import { appPath } from "@/lib/app-path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const todayKey = dateKeyInTZ(new Date(), user.timezone);

  const prompt = await getOrAssignDailyPrompt(todayKey);

  const photo = await prisma.dailyPhoto.findUnique({
    where: { userId_dateKey: { userId: user.id, dateKey: todayKey } },
    select: { caption: true, mood: true, promptId: true, imagePath: true },
  });

  const photoResponse = photo
    ? {
        caption: photo.caption,
        mood: photo.mood,
        promptId: photo.promptId,
        imageUrl: appPath(`/api/photo/file?dateKey=${encodeURIComponent(todayKey)}`),
      }
    : null;

  return NextResponse.json(
    { todayKey, prompt, photo: photoResponse },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
