import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { isValidNewPassword } from "../src/lib/account-validation.ts";
import { getAuditReason } from "../src/lib/audit-reason.ts";

function setup() {
  let user = null;
  let exists = true;
  const calls = [];
  const logs = [];
  const tx = {
    insert: () => ({
      values: async (value) => {
        logs.push(value);
      },
    }),
  };
  const modules = {
    "next/cache": { revalidatePath: () => {} },
    "next/navigation": {
      redirect: () => {
        throw new Error("redirect");
      },
    },
    "@/db/deleteMembers": {
      deleteMembers: async (...args) => {
        calls.push(["delete", args[0]]);
        return exists;
      },
    },
    "@/db/editMember": {
      resetMemberPassword: async (...args) => {
        calls.push(["password", args[0], args[1]]);
        return exists;
      },
      updateMemberPermission: async (...args) => {
        calls.push(["permission", args[0], args[1]]);
        return exists;
      },
    },
    "@/db/schema": {
      PERMISSION: ["admin", "operator", "editor", "member"],
      auditLogs: {},
    },
    "@/lib/db": { db: { transaction: async (callback) => callback(tx) } },
    "@/lib/audit-reason": { getAuditReason },
    "@/lib/account-validation": { isValidNewPassword },
    "@/lib/session": { getCurrentUser: async () => user },
  };
  const code = ts.transpileModule(
    fs.readFileSync(
      new URL(
        "../src/app/dashboard/members/[username]/actions.ts",
        import.meta.url,
      ),
      "utf8",
    ),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
  ).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: (id) => modules[id], console });
  const action = (values) => {
    const form = new FormData();
    for (const [key, value] of Object.entries({
      reason: "作業のため",
      ...values,
    }))
      form.set(key, value);
    return exports.updateMemberAction({ error: null, success: false }, form);
  };
  return {
    action,
    calls,
    logs,
    setUser: (value) => {
      user = value;
    },
    setExists: (value) => {
      exists = value;
    },
  };
}

test("IT members cannot manage other accounts", async () => {
  const ctx = setup();
  ctx.setUser({ username: "it-user", permission: "it" });
  const result = await ctx.action({
    username: "target",
    operation: "permission",
    permission: "editor",
  });
  assert.equal(result.success, false);
  assert.deepEqual(ctx.calls, []);
  assert.deepEqual(ctx.logs, []);
});

test("member actions require an administrator and validate input", async () => {
  const ctx = setup();
  const base = { username: "target", operation: "delete" };
  assert.ok((await ctx.action(base)).error);
  ctx.setUser({ permission: "member" });
  assert.ok((await ctx.action(base)).error);
  ctx.setUser({ permission: "admin" });
  assert.ok(
    (
      await ctx.action({
        ...base,
        operation: "password",
        password: "日本語pass",
        confirmation: "日本語pass",
      })
    ).error,
  );
  assert.ok(
    (
      await ctx.action({
        ...base,
        operation: "password",
        password: "password1",
        confirmation: "password2",
      })
    ).error,
  );
  assert.ok(
    (
      await ctx.action({
        ...base,
        operation: "permission",
        permission: "invalid",
      })
    ).error,
  );
  assert.ok((await ctx.action({ ...base, operation: "unknown" })).error);
  assert.ok((await ctx.action({ ...base, reason: "   " })).error);
  assert.ok((await ctx.action({ ...base, reason: "x".repeat(501) })).error);
  assert.equal(ctx.calls.length, 0);
});

test("member actions update the requested account and handle missing accounts", async () => {
  const ctx = setup();
  ctx.setUser({ permission: "admin" });
  assert.equal(
    (
      await ctx.action({
        username: "target",
        operation: "password",
        password: "password1",
        confirmation: "password1",
      })
    ).success,
    true,
  );
  assert.equal(
    (
      await ctx.action({
        username: "target",
        operation: "permission",
        permission: "editor",
      })
    ).success,
    true,
  );
  ctx.setExists(false);
  assert.ok(
    (await ctx.action({ username: "missing", operation: "delete" })).error,
  );
  ctx.setExists(true);
  await assert.rejects(
    ctx.action({ username: "target", operation: "delete" }),
    /redirect/,
  );
  assert.equal(ctx.logs.length, 3);
  assert.equal(ctx.logs[0].action, "member.password_reset");
  assert.equal(ctx.logs[0].details.reason, "作業のため");
  assert.equal(JSON.stringify(ctx.logs).includes("password1"), false);
  assert.equal(ctx.logs[1].details.permission, "editor");
  assert.equal(ctx.logs[2].action, "member.delete");
  assert.deepEqual(ctx.calls, [
    ["password", "target", "password1"],
    ["permission", "target", "editor"],
    ["delete", "missing"],
    ["delete", "target"],
  ]);
});

test("administrators cannot modify their own account through member actions", async () => {
  const ctx = setup();
  ctx.setUser({ username: "admin-user", permission: "admin" });
  for (const fields of [
    { operation: "delete" },
    { operation: "password", password: "password1", confirmation: "password1" },
    { operation: "permission", permission: "member" },
  ]) {
    const result = await ctx.action({ username: "admin-user", ...fields });
    assert.ok(result.error);
    assert.equal(result.success, false);
  }
  assert.equal(ctx.calls.length, 0);
});
