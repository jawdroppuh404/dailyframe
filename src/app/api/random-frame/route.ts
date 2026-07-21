import { NextResponse } from "next/server";
import { dateKeyInTZ } from "@/lib/date";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const todayKey = dateKeyInTZ(new Date(), "America/New_York");
  const requestedDate = new URL(request.url).searchParams.get("dateKey");
  if (requestedDate && (!/^\d{4}-\d{2}-\d{2}$/.test(requestedDate) || requestedDate >= todayKey)) {
    return NextResponse.json({ error: "That frame is not in the archive." }, { status: 404 });
  }
  if (requestedDate) {
    const assignment = await prisma.dailyPromptAssignment.findUnique({
      where: { dateKey: requestedDate },
      select: { dateKey: true, prompt: { select: { id: true, title: true, constraint: true, twist: true } } },
    });
    return assignment
      ? NextResponse.json(assignment, { headers: { "Cache-Control": "no-store, max-age=0" } })
      : NextResponse.json({ error: "That frame is not in the archive." }, { status: 404 });
  }
  const where = { dateKey: { lt: todayKey } };
  const count = await prisma.dailyPromptAssignment.count({ where });
  if (!count) {
    return NextResponse.json({ error: "No earlier daily frames yet." }, { status: 404 });
  }

  const assignment = await prisma.dailyPromptAssignment.findFirst({
    where,
    orderBy: { dateKey: "asc" },
    skip: Math.floor(Math.random() * count),
    select: {
      dateKey: true,
      prompt: { select: { id: true, title: true, constraint: true, twist: true } },
    },
  });

  if (!assignment) return NextResponse.json({ error: "No earlier daily frames yet." }, { status: 404 });
  return NextResponse.json(assignment, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
