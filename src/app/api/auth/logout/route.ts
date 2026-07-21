import { NextResponse } from "next/server";
import { deleteRequestSession, expiredSessionCookie } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  await deleteRequestSession(request);
  return NextResponse.json(
    { ok: true },
    { headers: { "Set-Cookie": expiredSessionCookie() } }
  );
}
