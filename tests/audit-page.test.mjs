import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import * as jsx from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import { formatStudentId } from "../src/lib/student-id.ts";

let user = { permission: "member" };
let reads = 0;
let logs = [
  {
    id: 3,
    operatorName: "admin",
    action: "member.permission_change",
    targetType: "member",
    targetId: "editor1",
    details: {
      reason: "担当変更",
      permission: "editor",
      password: "secret-not-for-display",
    },
    createdAt: new Date("2026-11-15T03:04:05Z"),
  },
  {
    id: 2,
    operatorName: "operator",
    action: "vote.invalidate",
    targetType: "vote",
    targetId: "42",
    details: {
      studentId: "1C3",
      grade: 1,
      reason: "重複を確認",
      firstClass: "1A",
    },
    createdAt: new Date("2026-11-14T00:00:00Z"),
  },
  {
    id: 1,
    operatorName: "operator",
    action: "vote.delete",
    targetType: "vote",
    targetId: "41",
    details: { studentId: null, grade: 3 },
    createdAt: new Date("2026-11-13T00:00:00Z"),
  },
  {
    id: 0,
    operatorName: "operator",
    action: "other.event",
    targetType: null,
    targetId: null,
    details: null,
    createdAt: new Date("2026-11-12T00:00:00Z"),
  },
];
const modules = {
  "react/jsx-runtime": jsx,
  "next/link": {
    __esModule: true,
    default: ({ href, children }) => jsx.jsx("a", { href, children }),
  },
  "@/app/dashboard/students/AutoRefresh": { AutoRefresh: () => null },
  "@/components/Authguard": { AuthGuard: () => null },
  "@/db/audit": {
    getAuditLogs: async () => {
      reads++;
      return logs;
    },
  },
  "@/lib/session": { getCurrentUser: async () => user },
  "@/lib/student-id": { formatStudentId },
  "./page.module.css": { __esModule: true, default: {} },
};
const code = ts.transpileModule(
  fs.readFileSync(
    new URL("../src/app/dashboard/audit/page.tsx", import.meta.url),
    "utf8",
  ),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  },
).outputText;
const exports = {};
vm.runInNewContext(code, { exports, require: (id) => modules[id], Intl });

test("audit page displays recorded operations and handles old or unknown records", async () => {
  const guard = exports.default().props.children;
  assert.equal(guard.props.minimumPermission, "member");
  const content = guard.props.children;
  const tree = await content.type(content.props);
  assert.equal(tree.props.children[0].props.intervalMs, 3_000);
  const html = renderToStaticMarkup(tree);
  assert.ok(html.indexOf("権限を変更") < html.indexOf("投票を無効化"));
  assert.match(html, /2026\/11\/15 12:04:05/);
  for (const value of [
    "admin",
    "editor1",
    "担当変更",
    "editor",
    "重複を確認",
    "1C03",
    "生徒IDなし",
    "記録なし",
    "other.event",
  ])
    assert.ok(html.includes(value), value);
  assert.doesNotMatch(html, /secret-not-for-display|firstClass|1A/);
  user = { permission: "it" };
  const itHtml = renderToStaticMarkup(await content.type(content.props));
  assert.match(itHtml, /権限を変更/);
  assert.doesNotMatch(itHtml, /投票を無効化|投票を削除|1C03/);
  user = { permission: "member" };
  logs = [];
  assert.match(
    renderToStaticMarkup(await content.type(content.props)),
    /操作履歴はありません/,
  );
  user = null;
  assert.equal(await content.type(content.props), null);
  assert.equal(reads, 3);
});
