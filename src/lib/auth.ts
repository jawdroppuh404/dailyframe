import { AuthTokenType } from "@prisma/client";
import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { prisma } from "./prisma";

const SESSION_COOKIE = "dailyframe_session";
const SESSION_DAYS = 30;

export type AuthenticatedUser = {
  id: string;
  email: string;
  emailVerified: boolean;
  timezone: string;
};

function scryptAsync(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey as Buffer);
    });
  });
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = await scryptAsync(password, salt);
  return `scrypt$${salt}$${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password: string, storedHash: string) {
  const [algorithm, salt, keyHex] = storedHash.split("$");
  if (algorithm !== "scrypt" || !salt || !keyHex) return false;

  const expected = Buffer.from(keyHex, "hex");
  const actual = await scryptAsync(password, salt);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function hashOpaqueToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function readCookie(request: Request, name: string) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  for (const part of cookieHeader.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return null;
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: { id: hashOpaqueToken(token), userId, expiresAt },
  });

  return { token, expiresAt };
}

export function sessionCookie(token: string, expiresAt: Date) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Expires=${expiresAt.toUTCString()}${secure}`;
}

export function expiredSessionCookie() {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

export async function deleteRequestSession(request: Request) {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return;
  await prisma.session.deleteMany({ where: { id: hashOpaqueToken(token) } });
}

export async function getAuthenticatedUser(
  request: Request,
  options: { requireVerified?: boolean } = {},
): Promise<AuthenticatedUser | null> {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { id: hashOpaqueToken(token) },
    select: {
      expiresAt: true,
      user: {
        select: { id: true, email: true, emailVerifiedAt: true, timezone: true },
      },
    },
  });

  if (!session || session.expiresAt <= new Date() || !session.user.email) {
    return null;
  }
  if (options.requireVerified !== false && !session.user.emailVerifiedAt) return null;

  return {
    id: session.user.id,
    email: session.user.email,
    emailVerified: Boolean(session.user.emailVerifiedAt),
    timezone: session.user.timezone,
  };
}

export async function createAuthToken(
  userId: string,
  type: AuthTokenType,
  lifetimeMs: number,
) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + lifetimeMs);

  await prisma.$transaction([
    prisma.authToken.deleteMany({ where: { userId, type } }),
    prisma.authToken.create({
      data: { id: hashOpaqueToken(token), userId, type, expiresAt },
    }),
  ]);

  return { token, expiresAt };
}

export function normalizeEmail(value: unknown) {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

export function validPassword(value: unknown): value is string {
  return typeof value === "string" && value.length >= 10 && value.length <= 200;
}
