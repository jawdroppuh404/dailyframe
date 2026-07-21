import { del } from "@vercel/blob";
import { NextResponse } from "next/server";
import {
  expiredSessionCookie,
  getAuthenticatedUser,
  verifyPassword,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (body?.confirmation !== "DELETE MY ACCOUNT" || typeof body?.password !== "string") {
    return NextResponse.json(
      { error: "Enter your password and type DELETE MY ACCOUNT exactly." },
      { status: 400 },
    );
  }

  const record = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      passwordHash: true,
      photos: { select: { imagePath: true } },
      archivePhotos: { select: { imagePath: true } },
    },
  });
  if (!record?.passwordHash || !(await verifyPassword(body.password, record.passwordHash))) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  const privatePaths = [...record.photos, ...record.archivePhotos]
    .map((photo) => photo.imagePath)
    .filter((pathname) => !pathname.startsWith("https://"));
  if (privatePaths.length) {
    const token = process.env.PRIVATE_BLOB_READ_WRITE_TOKEN;
    if (!token) {
      return NextResponse.json(
        { error: "Private storage is temporarily unavailable. Nothing was deleted." },
        { status: 503 },
      );
    }
    await del(privatePaths, { token });
  }

  await prisma.user.delete({ where: { id: user.id } });
  return NextResponse.json(
    { ok: true },
    { headers: { "Set-Cookie": expiredSessionCookie() } },
  );
}
