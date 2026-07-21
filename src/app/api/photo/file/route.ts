import { get } from "@vercel/blob";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
};

export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const dateKey = new URL(request.url).searchParams.get("dateKey");
  if (!dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    return new NextResponse("Invalid date", { status: 400 });
  }

  const photo = await prisma.dailyPhoto.findUnique({
    where: { userId_dateKey: { userId: user.id, dateKey } },
    select: { imagePath: true },
  });
  if (!photo) return new NextResponse("Not found", { status: 404 });

  // Existing photos remain in the original public store. Proxy them so the
  // application never exposes their raw storage URL to newly authenticated UI.
  if (photo.imagePath.startsWith("https://")) {
    const legacyUrl = new URL(photo.imagePath);
    if (!legacyUrl.hostname.endsWith(".public.blob.vercel-storage.com")) {
      return new NextResponse("Not found", { status: 404 });
    }
    const legacy = await fetch(photo.imagePath, { cache: "no-store" });
    if (!legacy.ok || !legacy.body) return new NextResponse("Not found", { status: 404 });
    return new NextResponse(legacy.body, {
      headers: {
        ...PRIVATE_HEADERS,
        "Content-Type": legacy.headers.get("content-type") ?? "image/jpeg",
      },
    });
  }

  const token = process.env.PRIVATE_BLOB_READ_WRITE_TOKEN;
  if (!token) return new NextResponse("Storage unavailable", { status: 503 });

  const result = await get(photo.imagePath, { access: "private", token });
  if (result?.statusCode !== 200 || !result.stream) {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(result.stream, {
    headers: {
      ...PRIVATE_HEADERS,
      "Content-Type": result.blob.contentType ?? "application/octet-stream",
    },
  });
}
