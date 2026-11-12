import { test } from "node:test";
import assert from "node:assert/strict";
import { validatePasswordChange } from "../src/lib/password-change.ts";

test("validates password changes at the server boundary", () => {
  assert.equal(
    validatePasswordChange("old password", "new password", "new password"),
    null,
  );
  assert.ok(validatePasswordChange("", "new password", "new password"));
  assert.ok(validatePasswordChange("old password", "short", "short"));
  assert.ok(
    validatePasswordChange("old password", "new password", "different"),
  );
  assert.ok(
    validatePasswordChange("old password", "あ".repeat(342), "あ".repeat(342)),
  );
});
