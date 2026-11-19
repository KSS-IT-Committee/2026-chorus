import assert from "node:assert/strict";
import { test } from "node:test";
import { formatStudentId } from "../src/lib/student-id.ts";

test("pads single digit student numbers only for display", () => {
  assert.equal(formatStudentId("1C3"), "1C03");
  assert.equal(formatStudentId("3A9"), "3A09");
  assert.equal(formatStudentId("1C03"), "1C03");
  assert.equal(formatStudentId("1C10"), "1C10");
  assert.equal(formatStudentId("custom-1"), "custom-1");
});
