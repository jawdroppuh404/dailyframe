import { AuthTokenType } from "@prisma/client";
import { NextResponse } from "next/server";
import { normalizeEmail } from "@/lib/auth";
import { sendPasswordResetEmail } from "@/lib/auth-email";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const GENERIC_RESPONSE = {
  ok: true,
  message: "If that account exists, a reset link is on its way.",
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = normalizeEmail(body?.email);
  if (!email) return NextResponse.json(GENERIC_RESPONSE);

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.email || !user.passwordHash) return NextResponse.json(GENERIC_RESPONSE);

  const recent = await prisma.authToken.findFirst({
    where: { userId: user.id, type: AuthTokenType.PASSWORD_RESET },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  if (recent && Date.now() - recent.createdAt.getTime() < 60_000) {
    return NextResponse.json(GENERIC_RESPONSE);
  }

  try {
    await sendPasswordResetEmail(
      { id: user.id, email: user.email },
      request.url,
    );
  } catch (error) {
    console.error("Unable to send password reset email", error);
  }
  return NextResponse.json(GENERIC_RESPONSE);
}
