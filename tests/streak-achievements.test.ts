import assert from "node:assert/strict";
import { achievementForStreak, achievementRoadmap, upcomingAchievements } from "../src/lib/achievements";
import { computeLongestStreak, computeStreak } from "../src/lib/streak";

assert.equal(computeStreak(["2026-07-20", "2026-07-19"], "2026-07-21"), 2);
assert.equal(computeStreak(["2026-07-21", "2026-07-20"], "2026-07-21"), 2);
assert.equal(computeLongestStreak(["2026-01-01", "2026-01-02", "2026-01-04"]), 2);
assert.equal(achievementForStreak(2).rank, "Fresh Roll");
assert.equal(achievementForStreak(3).rank, "Contact Sheet");
assert.equal(achievementForStreak(365).gear, "Hasselblad X2D II 100C");
assert.equal(achievementForStreak(2000).rank, "Photographic Laureate");
assert.equal(achievementForStreak(2190).rank, "Lifetime Image Maker · Year 6");
assert.equal(upcomingAchievements(28)[0].days, 90);
assert.equal(upcomingAchievements(2000)[0].days, 2190);
assert.equal(achievementRoadmap(0)[0].rank, "Fresh Roll");
assert.equal(achievementRoadmap(0).some((item) => item.rank === "Museum Circle · Year 10"), true);

console.log("Streak achievement tests passed.");
