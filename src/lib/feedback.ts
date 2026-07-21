export const FEEDBACK_TYPES = ["comment", "bug"] as const;

export type FeedbackType = (typeof FEEDBACK_TYPES)[number];

export function parseFeedback(input: unknown): { type: FeedbackType; message: string } | null {
  if (!input || typeof input !== "object") return null;
  const body = input as { type?: unknown; message?: unknown };
  if (body.type !== "comment" && body.type !== "bug") return null;
  if (typeof body.message !== "string") return null;

  const message = body.message.trim();
  if (message.length < 3 || message.length > 4000) return null;
  return { type: body.type, message };
}
