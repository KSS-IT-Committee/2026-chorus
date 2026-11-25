import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { PERMISSION } from "../src/db/schema.ts";
import { getAuditReason } from "../src/lib/audit-reason.ts";

function load(path, modules) {
  const code = ts.transpileModule(
    fs.readFileSync(new URL(path, import.meta.url), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
  ).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    require: (id) => modules[id],
    console,
    Error,
  });
  return exports;
}
const permission = load("../src/lib/permission.ts", {
  "@/db/schema": { PERMISSION },
});
let user = null;
let found = true;
let failure;
const calls = [];
const { changeVoteAction } = load(
  "../src/app/dashboard/votes/students/actions.ts",
  {
    "next/cache": { revalidatePath: () => {} },
    "@/db/votes": {
      changeVote: async (...args) => {
        calls.push(args);
        if (failure) throw failure;
        return found;
      },
    },
    "@/lib/permission": permission,
    "@/lib/audit-reason": { getAuditReason },
    "@/lib/session": { getCurrentUser: async () => user },
  },
);
function submit(values) {
  const form = new FormData();
  for (const [key, value] of Object.entries({
    studentId: "3A1",
    voteId: "7",
    operation: "invalidate",
    reason: "確認のため",
    ...values,
  }))
    form.set(key, value);
  return changeVoteAction({ error: null, success: false }, form);
}

test("vote mutations require operator permission and validate the target", async () => {
  assert.equal((await submit()).success, false);
  user = { username: "reader", permission: "editor" };
  assert.equal((await submit()).success, false);
  user = { username: "it", permission: "it" };
  assert.equal((await submit()).success, false);
  user = { username: "operator", permission: "operator" };
  for (const values of [
    { voteId: "-1" },
    { voteId: "1.5" },
    { voteId: "2147483648" },
    { studentId: "   " },
    { operation: "restore" },
    { reason: "   " },
    { reason: "a".repeat(501) },
  ]) {
    assert.equal((await submit(values)).success, false);
  }
  assert.equal(calls.length, 0);
  found = false;
  assert.match((await submit()).error, /見つからない/);
  found = true;
  assert.equal((await submit()).success, true);
  assert.deepEqual(calls.at(-1), [
    "3A1",
    7,
    "invalidate",
    "operator",
    "確認のため",
  ]);
  assert.equal((await submit({ operation: "delete" })).success, true);
  assert.equal(calls.at(-1)[2], "delete");
  assert.equal(
    (await submit({ studentId: "", operation: "delete" })).success,
    true,
  );
  assert.deepEqual(calls.at(-1), [null, 7, "delete", "operator", "確認のため"]);
});

test("a failed audit reason check explains that no vote was changed", async () => {
  user = { username: "operator", permission: "operator" };
  failure = new Error("Invalid audit reason");
  assert.match((await submit()).error, /操作を中止/);
  failure = new Error("query failure", {
    cause: { code: "23514", constraint_name: "audit_logs_reason_required" },
  });
  assert.match((await submit()).error, /再読み込み/);
  failure = undefined;
});
