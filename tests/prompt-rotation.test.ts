import assert from "node:assert/strict";
import { pickPromptForDate, RotationCandidate } from "../src/lib/prompt-rotation";
import { promptLibrary } from "../prisma/seed";

function nextDateKey(dateKey: string) {
  const date = new Date(`${dateKey}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function testSameDateIsDeterministic() {
  const prompts: RotationCandidate[] = Array.from({ length: 20 }, (_, index) => ({
    id: `prompt-${index}`,
    lastUsedDateKey: null,
  }));

  const first = pickPromptForDate([...prompts], "2026-07-21");
  const second = pickPromptForDate([...prompts].reverse(), "2026-07-21");
  assert.equal(first?.id, second?.id);
}

function testEveryPromptAppearsBeforeAnyRepeat() {
  const prompts: RotationCandidate[] = Array.from({ length: 30 }, (_, index) => ({
    id: `prompt-${String(index).padStart(2, "0")}`,
    lastUsedDateKey: null,
  }));
  const selectedIds = new Set<string>();
  let dateKey = "2026-01-01";

  for (let day = 0; day < prompts.length; day += 1) {
    const selected = pickPromptForDate(prompts, dateKey);
    assert.ok(selected);
    assert.equal(selectedIds.has(selected.id), false);
    selectedIds.add(selected.id);
    selected.lastUsedDateKey = dateKey;
    dateKey = nextDateKey(dateKey);
  }

  assert.equal(selectedIds.size, prompts.length);
}

function testLeastRecentlyUsedPromptIsRecycled() {
  const prompts: RotationCandidate[] = [
    { id: "one", lastUsedDateKey: "2026-01-01" },
    { id: "two", lastUsedDateKey: "2026-01-02" },
    { id: "three", lastUsedDateKey: "2026-01-03" },
  ];

  assert.equal(pickPromptForDate(prompts, "2026-02-01")?.id, "one");
}

function testNewPromptIsUsedBeforeRecycling() {
  const prompts: RotationCandidate[] = [
    { id: "used-one", lastUsedDateKey: "2026-01-01" },
    { id: "used-two", lastUsedDateKey: "2026-01-02" },
    { id: "just-added", lastUsedDateKey: null },
  ];

  assert.equal(pickPromptForDate(prompts, "2026-02-01")?.id, "just-added");
}

function testPromptLibraryIsCompleteAndUnique() {
  assert.equal(promptLibrary.length, 365);
  assert.equal(new Set(promptLibrary.map((prompt) => prompt.id)).size, 365);
  assert.equal(new Set(promptLibrary.map((prompt) => prompt.title)).size, 365);
}

testSameDateIsDeterministic();
testEveryPromptAppearsBeforeAnyRepeat();
testLeastRecentlyUsedPromptIsRecycled();
testNewPromptIsUsedBeforeRecycling();
testPromptLibraryIsCompleteAndUnique();

console.log("Prompt rotation tests passed.");
