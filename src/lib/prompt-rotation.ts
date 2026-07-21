export type RotationCandidate = {
  id: string;
  lastUsedDateKey: string | null;
};

/**
 * Picks from prompts that have never been used first. Once every prompt has
 * appeared, it picks from the least-recently-used prompts. The date hash makes
 * ties deterministic, so concurrent requests for one date choose the same ID.
 */
export function pickPromptForDate<T extends RotationCandidate>(
  prompts: T[],
  dateKey: string
): T | null {
  if (prompts.length === 0) return null;

  const neverUsed = prompts.filter((prompt) => prompt.lastUsedDateKey === null);
  let candidates = neverUsed;

  if (candidates.length === 0) {
    const oldestDateKey = prompts.reduce((oldest, prompt) => {
      const key = prompt.lastUsedDateKey;
      return key !== null && key < oldest ? key : oldest;
    }, prompts[0].lastUsedDateKey!);

    candidates = prompts.filter(
      (prompt) => prompt.lastUsedDateKey === oldestDateKey
    );
  }

  candidates.sort((a, b) => a.id.localeCompare(b.id));
  return candidates[hashString(dateKey) % candidates.length];
}

function hashString(input: string): number {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash;
}
