import assert from "node:assert/strict";
import {
  hashPassword,
  hashOpaqueToken,
  normalizeEmail,
  validPassword,
  verifyPassword,
} from "../src/lib/auth";
import { appPath, publicAppUrl } from "../src/lib/app-path";
import { parseFeedback } from "../src/lib/feedback";

async function main() {
  const password = "a-correct-password";
  const storedHash = await hashPassword(password);

  assert.equal(await verifyPassword(password, storedHash), true);
  assert.equal(await verifyPassword("the-wrong-password", storedHash), false);
  assert.equal(normalizeEmail("  Person@Example.COM "), "person@example.com");
  assert.equal(normalizeEmail("not-an-email"), null);
  assert.equal(validPassword("short"), false);
  assert.equal(validPassword(password), true);
  assert.equal(hashOpaqueToken("same-token"), hashOpaqueToken("same-token"));
  assert.notEqual(hashOpaqueToken("same-token"), hashOpaqueToken("different-token"));
  assert.equal(appPath(), "/dailyframe");
  assert.equal(appPath("/api/today"), "/dailyframe/api/today");
  assert.equal(
    publicAppUrl("https://dailyframe.example/api/auth/signup"),
    "https://dailyframe.example/dailyframe",
  );
  assert.deepEqual(parseFeedback({ type: "bug", message: "  upload failed  " }), {
    type: "bug",
    message: "upload failed",
  });
  assert.equal(parseFeedback({ type: "question", message: "hello" }), null);
  assert.equal(parseFeedback({ type: "comment", message: "x" }), null);

  console.log("Authentication tests passed.");
}

void main();
