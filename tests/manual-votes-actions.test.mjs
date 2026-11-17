import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { CLASSNAMES, PERMISSION } from "../src/db/schema.ts";
import { getAuditReason } from "../src/lib/audit-reason.ts";

function load(path, modules) {
  const code = ts.transpileModule(
    fs.readFileSync(new URL(path, import.meta.url), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
  ).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: (id) => modules[id], console });
  return exports;
}
const classes = load("../src/lib/class-name.ts", {
  "@/db/schema": { CLASSNAMES },
});
const permissions = load("../src/lib/permission.ts", {
  "@/db/schema": { PERMISSION },
});
let user = null;
const inserted = [];
const paths = [];
const { addManualVoteAction } = load(
  "../src/app/dashboard/votes/manual/actions.ts",
  {
    "next/cache": { revalidatePath: (path) => paths.push(path) },
    "@/db/votes": { addManualVote: async (...args) => inserted.push(args) },
    "@/lib/class-name": classes,
    "@/lib/permission": permissions,
    "@/lib/audit-reason": { getAuditReason },
    "@/lib/session": { getCurrentUser: async () => user },
  },
);
function submit(values = {}) {
  const data = new FormData();
  for (const [key, value] of Object.entries({
    grade: "2",
    firstClass: "A",
    secondClass: "C",
    reason: "確認のため",
    ...values,
  }))
    data.set(key, value);
  return addManualVoteAction({ error: null, success: false }, data);
}

test("manual votes require operator and two different classes in one grade", async () => {
  assert.equal((await submit()).success, false);
  user = { username: "reader", permission: "editor" };
  assert.equal((await submit()).success, false);
  user = { username: "operator", permission: "operator" };
  for (const invalid of [
    { grade: "4" },
    { grade: "1.5" },
    { firstClass: "A", secondClass: "A" },
    { firstClass: "2A" },
    { secondClass: "X" },
    { reason: "   " },
    { reason: "a".repeat(501) },
  ]) {
    assert.equal((await submit(invalid)).success, false);
  }
  assert.equal(inserted.length, 0);
  assert.equal((await submit()).success, true);
  assert.deepEqual(inserted[0], [2, "2A", "2C", "operator", "確認のため"]);
  assert.deepEqual(paths, [
    "/dashboard/votes/result",
    "/dashboard/votes/manual",
  ]);
});
