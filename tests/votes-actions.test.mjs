import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { PERMISSION } from "../src/db/schema.ts";

function load(path, modules) {
  const code = ts.transpileModule(
    fs.readFileSync(new URL(path, import.meta.url), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
  ).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: (id) => modules[id], console });
  return exports;
}
const permission = load("../src/lib/permission.ts", {
  "@/db/schema": { PERMISSION },
});
let user = null;
let found = true;
const calls = [];
const { changeVoteAction } = load(
  "../src/app/dashboard/votes/students/actions.ts",
  {
    "next/cache": { revalidatePath: () => {} },
    "@/db/votes": {
      changeVote: async (...args) => {
        calls.push(args);
        return found;
      },
    },
    "@/lib/permission": permission,
    "@/lib/session": { getCurrentUser: async () => user },
  },
);
function submit(values) {
  const form = new FormData();
  for (const [key, value] of Object.entries({
    studentId: "3A1",
    voteId: "7",
    operation: "invalidate",
    ...values,
  }))
    form.set(key, value);
  return changeVoteAction({ error: null, success: false }, form);
}

test("vote mutations require operator permission and validate the target", async () => {
  assert.equal((await submit()).success, false);
  user = { username: "reader", permission: "editor" };
  assert.equal((await submit()).success, false);
  user = { username: "operator", permission: "operator" };
  for (const values of [
    { voteId: "-1" },
    { voteId: "1.5" },
    { voteId: "2147483648" },
    { studentId: "" },
    { operation: "restore" },
  ]) {
    assert.equal((await submit(values)).success, false);
  }
  assert.equal(calls.length, 0);
  found = false;
  assert.match((await submit()).error, /見つからない/);
  found = true;
  assert.equal((await submit()).success, true);
  assert.deepEqual(calls.at(-1), ["3A1", 7, "invalidate", "operator"]);
  assert.equal((await submit({ operation: "delete" })).success, true);
  assert.equal(calls.at(-1)[2], "delete");
});
