import { AuthTokenType } from "@prisma/client";
import { createAuthToken } from "./auth";

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
    }),
  });

  if (!response.ok) throw new Error(`EMAIL_SEND_FAILED_${response.status}`);
}

export async function sendVerificationEmail(user: { id: string; email: string }, origin: string) {
  const { token } = await createAuthToken(
    user.id,
    AuthTokenType.EMAIL_VERIFICATION,
    VERIFY_LIFETIME_MS,
  );
  const link = `${origin}/verify-email?token=${encodeURIComponent(token)}`;
  const safeLink = escapeHtml(link);

  await sendEmail({
    to: user.email,
    subject: "Confirm your Daily Frame email",
    text: `Confirm your email to unlock Daily Frame: ${link}\n\nThis link expires in 24 hours.`,
    html: `<p>Confirm your email to unlock Daily Frame.</p><p><a href="${safeLink}">confirm email</a></p><p>This link expires in 24 hours.</p>`,
    idempotencyKey: `verify-${user.id}-${token.slice(0, 12)}`,
  });
}

export async function sendPasswordResetEmail(user: { id: string; email: string }, origin: string) {
  const { token } = await createAuthToken(
    user.id,
    AuthTokenType.PASSWORD_RESET,
    RESET_LIFETIME_MS,
  );
  const link = `${origin}/reset-password?token=${encodeURIComponent(token)}`;
  const safeLink = escapeHtml(link);

  await sendEmail({
    to: user.email,
    subject: "Reset your Daily Frame password",
    text: `Reset your Daily Frame password: ${link}\n\nThis link expires in one hour. If you did not request it, you can ignore this email.`,
    html: `<p>Use this link to reset your Daily Frame password.</p><p><a href="${safeLink}">reset password</a></p><p>This link expires in one hour. If you did not request it, you can ignore this email.</p>`,
    idempotencyKey: `reset-${user.id}-${token.slice(0, 12)}`,
  });
}
