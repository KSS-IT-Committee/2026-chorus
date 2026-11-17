import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

test("login issues a cookie only after the locked session write commits", async () => {
  const events = [];
  const tx = {
    select: () => ({
      from: () => ({
        where: () => ({
          for: async (lock) => {
            assert.equal(lock, "update");
            return [{ username: "committee", password: "hash" }];
          },
        }),
      }),
    }),
    update: () => ({ set: () => ({ where: async () => {} }) }),
  };
  const modules = {
    "drizzle-orm": { eq: () => {} },
    "next/headers": {
      cookies: async () => ({ set: () => events.push("cookie") }),
    },
    "next/navigation": { redirect: () => {} },
    "@/db/schema": { members: {} },
    "@/lib/db": {
      db: {
        transaction: async (callback) => {
          const token = await callback(tx);
          events.push("commit");
          return token;
        },
      },
    },
    "@/lib/password": { verifyPassword: async () => true },
    "@/lib/session": {
      createSession: async (username, executor) => {
        assert.equal(username, "committee");
        assert.equal(executor, tx);
        events.push("session");
        return "token";
      },
    },
  };
  const code = ts.transpileModule(
    readFileSync(
      new URL("../src/app/login/actions.ts", import.meta.url),
      "utf8",
    ),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
  ).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: (id) => modules[id], Buffer });
  const form = new FormData();
  form.set("username", "committee");
  form.set("password", "password");
  await exports.loginAction({ error: null }, form);
  assert.deepEqual(events, ["session", "commit", "cookie"]);
});
