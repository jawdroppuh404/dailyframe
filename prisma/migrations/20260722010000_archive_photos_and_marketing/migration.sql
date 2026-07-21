ALTER TABLE "User"
ADD COLUMN "marketingEmails" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "ArchivePhoto" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "promptDateKey" TEXT NOT NULL,
  "imagePath" TEXT NOT NULL,
  "caption" TEXT,
  "mood" TEXT,
  "userId" TEXT NOT NULL,
  "promptId" TEXT NOT NULL,
  CONSTRAINT "ArchivePhoto_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ArchivePhoto_userId_createdAt_idx" ON "ArchivePhoto"("userId", "createdAt");

ALTER TABLE "ArchivePhoto"
ADD CONSTRAINT "ArchivePhoto_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ArchivePhoto"
ADD CONSTRAINT "ArchivePhoto_promptId_fkey"
FOREIGN KEY ("promptId") REFERENCES "Prompt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
