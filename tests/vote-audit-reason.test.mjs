import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import * as orm from "drizzle-orm";
import { auditLogs, votes } from "../src/db/schema.ts";
import { getAuditReason } from "../src/lib/audit-reason.ts";

const logs = [];
let transactions = 0;
const tx = {
  delete: () => ({
    where: () => ({ returning: async () => [{ id: 12, grade: 2 }] }),
  }),
  update: () => ({
    set: () => ({
      where: () => ({ returning: async () => [{ id: 12, grade: 2 }] }),
    }),
  }),
  insert: (table) => ({
    values: (value) => {
      if (table === auditLogs) {
        logs.push(value);
        return Promise.resolve();
      }
      assert.equal(table, votes);
      return { returning: async () => [{ id: 13 }] };
    },
  }),
};
const modules = {
  "server-only": {},
  "drizzle-orm": orm,
  "@/db/schema": { auditLogs, votes },
  "@/lib/db": {
    db: {
      transaction: async (callback) => {
        transactions++;
        return callback(tx);
      },
    },
  },
  "@/lib/audit-reason": { getAuditReason },
};
const code = ts.transpileModule(
  fs.readFileSync(new URL("../src/db/votes.ts", import.meta.url), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } },
).outputText;
const exports = {};
vm.runInNewContext(code, { exports, require: (id) => modules[id] });

test("vote changes reject missing reasons before any database operation", async () => {
  for (const reason of [undefined, "", "   ", "x".repeat(501)]) {
    await assert.rejects(
      exports.changeVote("2A1", 12, "delete", "operator", reason),
      /Invalid audit reason/,
    );
    await assert.rejects(
      exports.addManualVote(2, "2A", "2B", "operator", reason),
      /Invalid audit reason/,
    );
  }
  assert.equal(transactions, 0);
  assert.equal(logs.length, 0);
  await exports.changeVote("2A1", 12, "delete", "operator", "  修正理由  ");
  await exports.addManualVote(2, "2A", "2B", "operator", "  追加理由  ");
  assert.equal(logs[0].details.reason, "修正理由");
  assert.equal(logs[1].details.reason, "追加理由");
});
