import { prisma } from "./prisma";

/**
 * Returns today's prompt.
 * If none exists yet for this dateKey, assigns one safely.
 * This function is race-condition safe.
 */
export async function getOrAssignDailyPrompt(dateKey: string) {
  // 1) Always try to read first
  const existing = await prisma.dailyPromptAssignment.findUnique({
    where: { dateKey },
    include: { prompt: true },
  });

  if (existing) {
    return existing.prompt;
  }

  // 2) Get available prompts
  const prompts = await prisma.prompt.findMany({
    where: { active: true },
    orderBy: { createdAt: "asc" },
  });

  if (prompts.length === 0) {
    throw new Error("No prompts available.");
  }

  // 3) Deterministically pick a prompt for the day
  const index = hashString(dateKey) % prompts.length;
  const picked = prompts[index];

  // 4) Try to create the assignment
  // If another request created it first, ignore the error
  try {
    await prisma.dailyPromptAssignment.create({
      data: {
        dateKey,
        promptId: picked.id,
      },
    });
  } catch (err: any) {
    // P2002 = unique constraint violation (another request won the race)
    if (err?.code !== "P2002") {
      throw err;
    }
  }

  // 5) Read again (guaranteed to exist now)
  const after = await prisma.dailyPromptAssignment.findUnique({
    where: { dateKey },
    include: { prompt: true },
  });

  if (!after) {
    throw new Error("Failed to assign daily prompt.");
  }

  return after.prompt;
}

/**
 * Simple deterministic string hash
 */
function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}