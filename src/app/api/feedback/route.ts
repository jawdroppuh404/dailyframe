import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { sendFeedbackEmail } from "@/lib/auth-email";
import { parseFeedback } from "@/lib/feedback";

export const runtime = "nodejs";

const RATE_LIMIT_MS = 60_000;
const feedbackRateLimits = new Map<string, number>();

export async function POST(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json(
      { error: "A confirmed account is required to send feedback." },
      { status: 401 },
    );
  }

  const feedback = parseFeedback(await request.json().catch(() => null));
  if (!feedback) {
    return NextResponse.json(
      { error: "Choose comment or bug and enter 3–4,000 characters." },
      { status: 400 },
    );
  }

  const now = Date.now();
  const lastSentAt = feedbackRateLimits.get(user.id) ?? 0;
  if (now - lastSentAt < RATE_LIMIT_MS) {
    return NextResponse.json(
      { error: "Please wait a minute before sending more feedback." },
      { status: 429 },
    );
  }

  feedbackRateLimits.set(user.id, now);
  try {
    await sendFeedbackEmail({
      userId: user.id,
      email: user.email,
      type: feedback.type,
      message: feedback.message,
      pageUrl: request.headers.get("referer"),
      userAgent: request.headers.get("user-agent"),
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (feedbackRateLimits.get(user.id) === now) feedbackRateLimits.delete(user.id);
    console.error("Unable to send feedback email", error);
    return NextResponse.json(
      { error: "Feedback could not be sent. Please try again." },
      { status: 503 },
    );
  }
}
