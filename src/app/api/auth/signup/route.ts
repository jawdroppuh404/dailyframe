import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  createSession,
  hashPassword,
  normalizeEmail,
  sessionCookie,
  validPassword,
} from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = normalizeEmail(body?.email);
  const password = body?.password;
  const legacyUserId =
    typeof body?.legacyUserId === "string" && body.legacyUserId.startsWith("user_")
      ? body.legacyUserId
      : null;

  if (!email || !validPassword(password)) {
    return NextResponse.json(
      { error: "Enter a valid email and a password of at least 10 characters." },
      { status: 400 }
    );
  }

  const passwordHash = await hashPassword(password);

  try {
    const user = await prisma.$transaction(async (tx) => {
      const existingEmail = await tx.user.findUnique({ where: { email } });
      if (existingEmail) throw new Error("EMAIL_EXISTS");

      if (legacyUserId) {
        const legacy = await tx.user.findUnique({ where: { id: legacyUserId } });
        if (legacy && !legacy.email && !legacy.passwordHash) {
          return tx.user.update({
            where: { id: legacy.id },
            data: { email, passwordHash },
          });
        }
      }

      return tx.user.create({ data: { email, passwordHash } });
    });

    const session = await createSession(user.id);
    return NextResponse.json(
      { user: { id: user.id, email: user.email } },
      { headers: { "Set-Cookie": sessionCookie(session.token, session.expiresAt) } }
    );
  } catch (error) {
    if (
      (error instanceof Error && error.message === "EMAIL_EXISTS") ||
      (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
    ) {
      return NextResponse.json(
        { error: "An account with that email already exists." },
        { status: 409 }
      );
    }
    throw error;
  }
}
