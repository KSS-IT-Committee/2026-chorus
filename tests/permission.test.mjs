import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { PERMISSION } from "../src/db/schema.ts";

const code = ts.transpileModule(
  fs.readFileSync(new URL("../src/lib/permission.ts", import.meta.url), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } },
).outputText;
const exports = {};
vm.runInNewContext(code, { exports, require: () => ({ PERMISSION }) });
const { hasMinimumPermission } = exports;

test("checks every permission against every minimum", () => {
  const expected = {
    admin: [true, true, true, true, true],
    operator: [false, true, true, true, false],
    editor: [false, false, true, true, false],
    member: [false, false, false, true, false],
    it: [true, true, true, true, true],
  };
  for (const [actual, results] of Object.entries(expected)) {
    PERMISSION.forEach((minimum, index) => {
      assert.equal(
        hasMinimumPermission({ permission: actual }, minimum),
        results[index],
      );
    });
  }
  assert.equal(
    hasMinimumPermission({ permission: "invalid" }, "member"),
    false,
  );
  assert.equal(hasMinimumPermission({ permission: "admin" }, "invalid"), false);
  assert.equal(hasMinimumPermission(null, "member"), false);
  assert.equal(hasMinimumPermission(undefined, "member"), false);
});
