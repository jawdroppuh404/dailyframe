import { AuthTokenType } from "@prisma/client";
import { NextResponse } from "next/server";
import { hashOpaqueToken, hashPassword, validPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token : "";
  if (!token || !validPassword(body?.password)) {
    return NextResponse.json(
      { error: "Use a valid reset link and a password of at least 10 characters." },
      { status: 400 },
    );
  }

  const authToken = await prisma.authToken.findUnique({
    where: { id: hashOpaqueToken(token) },
  });
  if (
    !authToken ||
    authToken.type !== AuthTokenType.PASSWORD_RESET ||
    authToken.expiresAt <= new Date()
  ) {
    return NextResponse.json(
      { error: "This reset link is invalid or expired." },
      { status: 400 },
    );
  }

  const passwordHash = await hashPassword(body.password);
  await prisma.$transaction([
    prisma.user.update({ where: { id: authToken.userId }, data: { passwordHash } }),
    prisma.session.deleteMany({ where: { userId: authToken.userId } }),
    prisma.authToken.deleteMany({ where: { userId: authToken.userId } }),
  ]);

  return NextResponse.json({ ok: true });
}
