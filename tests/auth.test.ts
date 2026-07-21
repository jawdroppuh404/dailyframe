import assert from "node:assert/strict";
import {
  hashPassword,
  hashOpaqueToken,
  normalizeEmail,
  validPassword,
  verifyPassword,
} from "../src/lib/auth";
import { appPath, publicAppUrl } from "../src/lib/app-path";

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

  console.log("Authentication tests passed.");
}

void main();
