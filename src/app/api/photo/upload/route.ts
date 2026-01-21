import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { dateKeyInTZ } from "@/lib/date";

export const runtime = "nodejs";

const USER_ID = "demo-user";

export async function POST(req: Request) {
  const user = await prisma.user.findUnique({ where: { id: USER_ID } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const caption = (form.get("caption") as string | null) ?? null;
  const mood = (form.get("mood") as string | null) ?? null;

  if (!file) return NextResponse.json({ error: "Missing file" }, { status: 400 });

  const todayKey = dateKeyInTZ(new Date(), user.timezone);

  // Upload to Vercel Blob (public URL)
  const blob = await put(
    `${USER_ID}/${todayKey}/${Date.now()}-${file.name}`,
    file,
    { access: "public" }
  );

  const saved = await prisma.dailyPhoto.upsert({
    where: { userId_dateKey: { userId: USER_ID, dateKey: todayKey } },
    update: { imagePath: blob.url, caption, mood },
    create: { userId: USER_ID, dateKey: todayKey, imagePath: blob.url, caption, mood },
  });

  return NextResponse.json({ ok: true, photo: saved });
}
