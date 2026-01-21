import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dateKeyInTZ } from "@/lib/date";
import { getOrAssignDailyPrompt } from "@/lib/prompt";

const USER_ID = "demo-user";

export async function GET() {
  const user = await prisma.user.findUnique({ where: { id: USER_ID } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const todayKey = dateKeyInTZ(new Date(), user.timezone);
  const prompt = await getOrAssignDailyPrompt(todayKey);

  const photo = await prisma.dailyPhoto.findUnique({
    where: { userId_dateKey: { userId: USER_ID, dateKey: todayKey } },
  });

  if (photo && !photo.promptId) {
    await prisma.dailyPhoto.update({
      where: { id: photo.id },
      data: { promptId: prompt.id },
    });
  }

  return NextResponse.json({ todayKey, prompt, photo });
}
