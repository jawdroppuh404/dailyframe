import { AuthTokenType } from "@prisma/client";
import { createAuthToken } from "./auth";
import { publicAppUrl } from "./app-path";

const VERIFY_LIFETIME_MS = 24 * 60 * 60 * 1000;
const RESET_LIFETIME_MS = 60 * 60 * 1000;

export function emailDeliveryConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function sendEmail(input: {
  to: string;
  subject: string;
  text: string;
  html: string;
  idempotencyKey: string;
  replyTo?: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) throw new Error("EMAIL_NOT_CONFIGURED");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": input.idempotencyKey,
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      text: input.text,
      html: input.html,
      reply_to: input.replyTo,
    }),
  });

  if (!response.ok) throw new Error(`EMAIL_SEND_FAILED_${response.status}`);
}

export async function sendVerificationEmail(user: { id: string; email: string }, requestUrl: string) {
  const { token } = await createAuthToken(
    user.id,
    AuthTokenType.EMAIL_VERIFICATION,
    VERIFY_LIFETIME_MS,
  );
  const link = `${publicAppUrl(requestUrl)}/verify-email?token=${encodeURIComponent(token)}`;
  const safeLink = escapeHtml(link);

  await sendEmail({
    to: user.email,
    subject: "Confirm your Daily Frame email",
    text: `Confirm your email to unlock Daily Frame: ${link}\n\nThis link expires in 24 hours.`,
    html: `<p>Confirm your email to unlock Daily Frame.</p><p><a href="${safeLink}">confirm email</a></p><p>This link expires in 24 hours.</p>`,
    idempotencyKey: `verify-${user.id}-${token.slice(0, 12)}`,
  });
}

export async function sendPasswordResetEmail(user: { id: string; email: string }, requestUrl: string) {
  const { token } = await createAuthToken(
    user.id,
    AuthTokenType.PASSWORD_RESET,
    RESET_LIFETIME_MS,
  );
  const link = `${publicAppUrl(requestUrl)}/reset-password?token=${encodeURIComponent(token)}`;
  const safeLink = escapeHtml(link);

  await sendEmail({
    to: user.email,
    subject: "Reset your Daily Frame password",
    text: `Reset your Daily Frame password: ${link}\n\nThis link expires in one hour. If you did not request it, you can ignore this email.`,
    html: `<p>Use this link to reset your Daily Frame password.</p><p><a href="${safeLink}">reset password</a></p><p>This link expires in one hour. If you did not request it, you can ignore this email.</p>`,
    idempotencyKey: `reset-${user.id}-${token.slice(0, 12)}`,
  });
}

export async function sendFeedbackEmail(input: {
  userId: string;
  email: string;
  type: "comment" | "bug";
  message: string;
  pageUrl: string | null;
  userAgent: string | null;
}) {
  const recipient = process.env.FEEDBACK_TO?.trim() || "info@jawdroppuh.lol";
  const label = input.type === "bug" ? "Bug report" : "Comment";
  const page = input.pageUrl ?? "Not provided";
  const userAgent = input.userAgent ?? "Not provided";
  const messageHtml = escapeHtml(input.message).replaceAll("\n", "<br>");

  await sendEmail({
    to: recipient,
    replyTo: input.email,
    subject: `[Daily Frame] ${label}`,
    text: `${label} from ${input.email}\n\n${input.message}\n\nPage: ${page}\nBrowser: ${userAgent}`,
    html: `<p><strong>${label}</strong> from <a href="mailto:${escapeHtml(input.email)}">${escapeHtml(input.email)}</a></p><p>${messageHtml}</p><hr><p><small>Page: ${escapeHtml(page)}<br>Browser: ${escapeHtml(userAgent)}</small></p>`,
    idempotencyKey: `feedback-${input.userId}-${Date.now()}`,
  });
}
