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
import { emailDeliveryConfigured, sendVerificationEmail } from "@/lib/auth-email";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = normalizeEmail(body?.email);
  const password = body?.password;
  const marketingEmails = body?.marketingEmails === true;
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
  if (!emailDeliveryConfigured()) {
    return NextResponse.json(
      { error: "Account creation is temporarily unavailable while email delivery is being configured." },
      { status: 503 },
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
            data: { email, passwordHash, marketingEmails },
          });
        }
      }

      return tx.user.create({ data: { email, passwordHash, marketingEmails } });
    });

    const session = await createSession(user.id);
    let emailSent = true;
    try {
      await sendVerificationEmail(
        { id: user.id, email: user.email! },
        request.url,
      );
    } catch (error) {
      console.error("Unable to send verification email", error);
      emailSent = false;
    }
    return NextResponse.json(
      {
        user: { id: user.id, name: user.name, email: user.email, emailVerified: false },
        emailSent,
      },
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
