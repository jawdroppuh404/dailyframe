import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { dateKeyInTZ } from "@/lib/date";

export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export async function POST(request: Request) {
  const token = process.env.PRIVATE_BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "Private storage is not configured." }, { status: 503 });
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const response = await handleUpload({
      body,
      request,
      token,
      onBeforeGenerateToken: async (pathname) => {
        const user = await getAuthenticatedUser(request);
        if (!user) throw new Error("Authentication required");

        const todayKey = dateKeyInTZ(new Date(), user.timezone);
        const dailyPrefix = `users/${user.id}/${todayKey}/`;
        const archivePrefix = `users/${user.id}/archive/`;
        if (!pathname.startsWith(dailyPrefix) && !pathname.startsWith(archivePrefix)) {
          throw new Error("Invalid upload path");
        }

        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp"],
          maximumSizeInBytes: MAX_UPLOAD_BYTES,
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async () => {},
    });

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload authorization failed." },
      { status: 400 }
    );
  }
}
