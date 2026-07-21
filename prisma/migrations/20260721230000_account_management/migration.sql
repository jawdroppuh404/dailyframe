-- CreateEnum
CREATE TYPE "AuthTokenType" AS ENUM ('EMAIL_VERIFICATION', 'PASSWORD_RESET');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "emailVerifiedAt" TIMESTAMP(3);

-- Existing password accounts predate email verification. Keep them usable;
-- every account created after this migration must verify through email.
UPDATE "User"
SET "emailVerifiedAt" = CURRENT_TIMESTAMP
WHERE "email" IS NOT NULL AND "passwordHash" IS NOT NULL;

-- CreateTable
CREATE TABLE "AuthToken" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "type" "AuthTokenType" NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "AuthToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuthToken_userId_type_idx" ON "AuthToken"("userId", "type");

-- CreateIndex
CREATE INDEX "AuthToken_expiresAt_idx" ON "AuthToken"("expiresAt");

-- AddForeignKey
ALTER TABLE "AuthToken" ADD CONSTRAINT "AuthToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
