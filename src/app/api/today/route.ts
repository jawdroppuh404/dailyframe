import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dateKeyInTZ } from "@/lib/date";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const USER_ID = "demo-user";

export async function GET() {
  const user = await prisma.user.findUnique({ where: { id: USER_ID } });
  if (!user) {
    return NextResponse.json(
      { error: "User not found" },
      { status: 404, headers: { "Cache-Control": "no-store" } }
    );
  }

  const todayKey = dateKeyInTZ(new Date(), user.timezone);

  const prompt = await prisma.prompt.findFirst({
    where: { active: true },
    orderBy: { createdAt: "asc" },
  });

  const photo = await prisma.dailyPhoto.findUnique({
    where: { userId_dateKey: { userId: USER_ID, dateKey: todayKey } },
    select: {
      id: true,
      createdAt: true,
      dateKey: true,
      imagePath: true,
      caption: true,
      mood: true,
      userId: true,
      promptId: true,
    },
  });

  return NextResponse.json(
    { todayKey, prompt, photo },
    { headers: { "Cache-Control": "no-store" } }
  );
}