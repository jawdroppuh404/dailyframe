import { NextResponse } from "next/server";
import { getAuthenticatedUser, normalizeDisplayName } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getAuthenticatedUser(request, { requireVerified: false });
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const name = normalizeDisplayName(body?.name);
  if (!name) {
    return NextResponse.json(
      { error: "Display name must be between 2 and 40 characters." },
      { status: 400 },
    );
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { name },
    select: { name: true },
  });

  return NextResponse.json({ ok: true, name: updated.name });
}
