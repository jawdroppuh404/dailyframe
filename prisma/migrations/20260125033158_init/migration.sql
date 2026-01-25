-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prompt" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "title" TEXT NOT NULL,
    "constraint" TEXT,
    "twist" TEXT,
    "tags" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Prompt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyPromptAssignment" (
    "id" TEXT NOT NULL,
    "dateKey" TEXT NOT NULL,
    "promptId" TEXT NOT NULL,

    CONSTRAINT "DailyPromptAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyPhoto" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateKey" TEXT NOT NULL,
    "imagePath" TEXT NOT NULL,
    "caption" TEXT,
    "mood" TEXT,
    "userId" TEXT NOT NULL,
    "promptId" TEXT,

    CONSTRAINT "DailyPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyPromptAssignment_dateKey_key" ON "DailyPromptAssignment"("dateKey");

-- CreateIndex
CREATE UNIQUE INDEX "DailyPhoto_userId_dateKey_key" ON "DailyPhoto"("userId", "dateKey");

-- AddForeignKey
ALTER TABLE "DailyPromptAssignment" ADD CONSTRAINT "DailyPromptAssignment_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "Prompt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyPhoto" ADD CONSTRAINT "DailyPhoto_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyPhoto" ADD CONSTRAINT "DailyPhoto_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "Prompt"("id") ON DELETE SET NULL ON UPDATE CASCADE;
