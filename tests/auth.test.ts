import assert from "node:assert/strict";
import {
  hashPassword,
  normalizeEmail,
  validPassword,
  verifyPassword,
} from "../src/lib/auth";

async function main() {
  const password = "a-correct-password";
  const storedHash = await hashPassword(password);

  assert.equal(await verifyPassword(password, storedHash), true);
  assert.equal(await verifyPassword("the-wrong-password", storedHash), false);
  assert.equal(normalizeEmail("  Person@Example.COM "), "person@example.com");
  assert.equal(normalizeEmail("not-an-email"), null);
  assert.equal(validPassword("short"), false);
  assert.equal(validPassword(password), true);

  console.log("Authentication tests passed.");
}

void main();
