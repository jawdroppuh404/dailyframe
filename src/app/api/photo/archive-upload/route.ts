import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { dateKeyInTZ } from "@/lib/date";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const pathname = typeof body?.pathname === "string" ? body.pathname : "";
  const promptId = typeof body?.promptId === "string" ? body.promptId : "";
  const promptDateKey = typeof body?.promptDateKey === "string" ? body.promptDateKey : "";
  const caption = typeof body?.caption === "string" ? body.caption.slice(0, 500) : "";
  const mood = typeof body?.mood === "string" ? body.mood.slice(0, 50) : "";
  const todayKey = dateKeyInTZ(new Date(), user.timezone);

  if (!pathname.startsWith(`users/${user.id}/archive/`) || !/^\d{4}-\d{2}-\d{2}$/.test(promptDateKey) || promptDateKey >= todayKey) {
    return NextResponse.json({ error: "Invalid archive photo." }, { status: 400 });
  }
  const assignment = await prisma.dailyPromptAssignment.findUnique({
    where: { dateKey: promptDateKey },
    select: { promptId: true },
  });
  if (!assignment || assignment.promptId !== promptId) {
    return NextResponse.json({ error: "That prompt is not in the shown archive." }, { status: 400 });
  }

  const saved = await prisma.archivePhoto.create({
    data: { userId: user.id, promptId, promptDateKey, imagePath: pathname, caption, mood },
  });
  return NextResponse.json({ ok: true, photoId: saved.id });
}
