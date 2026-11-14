import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { isValidNewPassword } from "../src/lib/account-validation.ts";

function setup() {
  let user = null;
  let exists = true;
  const calls = [];
  const modules = {
    "next/cache": { revalidatePath: () => {} },
    "next/navigation": {
      redirect: () => {
        throw new Error("redirect");
      },
    },
    "@/db/deleteMembers": {
      deleteMembers: async (...args) => {
        calls.push(["delete", ...args]);
        return exists;
      },
    },
    "@/db/editMember": {
      resetMemberPassword: async (...args) => {
        calls.push(["password", ...args]);
        return exists;
      },
      updateMemberPermission: async (...args) => {
        calls.push(["permission", ...args]);
        return exists;
      },
    },
    "@/db/schema": { PERMISSION: ["admin", "operator", "editor", "member"] },
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
    for (const [key, value] of Object.entries(values)) form.set(key, value);
    return exports.updateMemberAction({ error: null, success: false }, form);
  };
  return {
    action,
    calls,
    setUser: (value) => {
      user = value;
    },
    setExists: (value) => {
      exists = value;
    },
  };
}

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
