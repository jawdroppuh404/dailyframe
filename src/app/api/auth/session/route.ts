import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request, { requireVerified: false });
  return NextResponse.json(
    { user },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
