import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createSession,
  normalizeEmail,
  sessionCookie,
  validPassword,
  verifyPassword,
} from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = normalizeEmail(body?.email);
  const password = body?.password;

  if (!email || !validPassword(password)) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const session = await createSession(user.id);
  return NextResponse.json(
    {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: Boolean(user.emailVerifiedAt),
      },
    },
    { headers: { "Set-Cookie": sessionCookie(session.token, session.expiresAt) } }
  );
}
