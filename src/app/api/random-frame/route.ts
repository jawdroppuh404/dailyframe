import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { dateKeyInTZ } from "@/lib/date";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const todayKey = dateKeyInTZ(new Date(), user.timezone);
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
