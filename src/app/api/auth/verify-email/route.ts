import { AuthTokenType } from "@prisma/client";
import { NextResponse } from "next/server";
import { hashOpaqueToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token : "";
  if (!token) return NextResponse.json({ error: "Invalid confirmation link." }, { status: 400 });

  const authToken = await prisma.authToken.findUnique({
    where: { id: hashOpaqueToken(token) },
  });
  if (
    !authToken ||
    authToken.type !== AuthTokenType.EMAIL_VERIFICATION ||
    authToken.expiresAt <= new Date()
  ) {
    return NextResponse.json(
      { error: "This confirmation link is invalid or expired." },
      { status: 400 },
    );
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: authToken.userId },
      data: { emailVerifiedAt: new Date() },
    }),
    prisma.authToken.deleteMany({
      where: { userId: authToken.userId, type: AuthTokenType.EMAIL_VERIFICATION },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
