import { AuthTokenType } from "@prisma/client";
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/auth-email";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getAuthenticatedUser(request, { requireVerified: false });
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (user.emailVerified) return NextResponse.json({ ok: true });

  const recent = await prisma.authToken.findFirst({
    where: { userId: user.id, type: AuthTokenType.EMAIL_VERIFICATION },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  if (recent && Date.now() - recent.createdAt.getTime() < 60_000) {
    return NextResponse.json(
      { error: "Please wait a minute before requesting another email." },
      { status: 429 },
    );
  }

  try {
    await sendVerificationEmail(user, request.url);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Unable to resend verification email", error);
    return NextResponse.json(
      { error: "Email delivery is unavailable. Try again later." },
      { status: 503 },
    );
  }
}
