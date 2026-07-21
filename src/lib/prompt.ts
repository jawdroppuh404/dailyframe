import { prisma } from "./prisma";
import { pickPromptForDate } from "./prompt-rotation";

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

  // 2) Get active prompts and their most recent assignment.
  const prompts = await prisma.prompt.findMany({
    where: { active: true },
    select: {
      id: true,
      title: true,
      constraint: true,
      twist: true,
      dailyAssignments: {
        orderBy: { dateKey: "desc" },
        take: 1,
        select: { dateKey: true },
      },
    },
  });

  const picked = pickPromptForDate(
    prompts.map((prompt) => ({
      ...prompt,
      lastUsedDateKey: prompt.dailyAssignments[0]?.dateKey ?? null,
    })),
    dateKey
  );

  if (!picked) {
    throw new Error("No prompts available.");
  }

  // 3) Try to create the assignment
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

  // 4) Read again (guaranteed to exist now)
  const after = await prisma.dailyPromptAssignment.findUnique({
    where: { dateKey },
    include: { prompt: true },
  });

  if (!after) {
    throw new Error("Failed to assign daily prompt.");
  }

  return after.prompt;
}
