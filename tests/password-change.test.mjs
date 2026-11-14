import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isValidUsername,
  isValidNewPassword,
  validatePasswordChange,
} from "../src/lib/account-validation.ts";

test("validates password changes at the server boundary", () => {
  assert.equal(
    validatePasswordChange("旧パスワード", "new-pass1!", "new-pass1!"),
    null,
  );
  assert.ok(validatePasswordChange("", "new-pass1!", "new-pass1!"));
  assert.ok(validatePasswordChange("old password", "short", "short"));
  assert.ok(validatePasswordChange("old password", "new-pass1!", "different"));
  assert.ok(
    validatePasswordChange("old password", "あ".repeat(342), "あ".repeat(342)),
  );
});

test("accepts only non-space printable ASCII for new credentials", () => {
  for (let code = 33; code <= 126; code++) {
    assert.ok(isValidUsername(String.fromCharCode(code)));
  }
  for (const value of ["", "日本語", "abc def", "abc\n", "a".repeat(33)])
    assert.equal(isValidUsername(value), false);
  assert.ok(isValidNewPassword("abcXYZ09!@#$%^&*()_+-=[]{};:'\",.<>/?\\|`~"));
  for (const value of [
    "short",
    "日本語password",
    "has space",
    "password\n",
    "a".repeat(1025),
  ])
    assert.equal(isValidNewPassword(value), false);
  assert.ok(validatePasswordChange("old", "日本語pass", "日本語pass"));
});
