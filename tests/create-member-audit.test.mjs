import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { getAuditReason } from "../src/lib/audit-reason.ts";
import {
  isValidNewPassword,
  isValidUsername,
} from "../src/lib/account-validation.ts";

let user = null;
let failLog = false;
const changes = [];
const logs = [];
const tx = {
  insert: () => ({
    values: async (row) => {
      if (failLog) throw new Error("audit failed");
      logs.push(row);
    },
  }),
};
const modules = {
  "next/cache": { revalidatePath: () => {} },
  "@/db/addMembers": { addMembers: async (...args) => changes.push(args) },
  "@/db/schema": {
    PERMISSION: ["admin", "operator", "editor", "member", "it"],
    auditLogs: {},
  },
  "@/lib/db": { db: { transaction: async (callback) => callback(tx) } },
  "@/lib/audit-reason": { getAuditReason },
  "@/lib/session": { getCurrentUser: async () => user },
  "@/lib/account-validation": { isValidNewPassword, isValidUsername },
};
const code = ts.transpileModule(
  fs.readFileSync(
    new URL("../src/app/dashboard/members/actions.ts", import.meta.url),
    "utf8",
  ),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } },
).outputText;
const exports = {};
vm.runInNewContext(code, {
  exports,
  require: (id) => modules[id],
  console: { error() {} },
});
function submit(reason, permission = "editor") {
  const form = new FormData();
  for (const [key, value] of Object.entries({
    username: "new-member",
    password: "password1",
    permission,
    reason,
  }))
    form.set(key, value);
  return exports.createMemberAction({ error: null, success: false }, form);
}

test("member creation requires a reason and records no password", async () => {
  assert.equal((await submit("新規登録")).success, false);
  user = { username: "admin", permission: "admin" };
  assert.equal((await submit("  ")).success, false);
  assert.equal((await submit("x".repeat(501))).success, false);
  assert.equal(changes.length, 0);
  assert.equal((await submit("  新規登録  ")).success, true);
  assert.equal(logs[0].action, "member.create");
  assert.equal(logs[0].operatorName, "admin");
  assert.equal(logs[0].details.reason, "新規登録");
  assert.equal(JSON.stringify(logs).includes("password1"), false);
  user = { username: "it-user", permission: "it" };
  for (const permission of ["admin", "operator", "editor", "member"]) {
    assert.equal((await submit("新規登録", permission)).success, false);
  }
  assert.equal(changes.length, 1);
  assert.equal(logs.length, 1);
  assert.equal((await submit("新規登録", "it")).success, true);
  assert.equal(logs.at(-1).details.permission, "it");
  assert.equal(logs.at(-1).operatorName, "it-user");
  user = { username: "admin", permission: "admin" };
  failLog = true;
  assert.equal((await submit("新規登録")).success, false);
});
