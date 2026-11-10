import assert from "node:assert/strict";
import test from "node:test";
import { hashPassword, verifyPassword } from "../src/lib/password.ts";

test("password hashes are salted, verifiable and fit the member column", async () => {
  const first = await hashPassword("test password");
  const second = await hashPassword("test password");
  assert.ok(first.length <= 60);
  assert.notEqual(first, second);
  assert.equal(await verifyPassword("test password", first), true);
  assert.equal(await verifyPassword("wrong password", first), false);
  assert.equal(await verifyPassword("test password", "scrypt$bad$bad"), false);
});
