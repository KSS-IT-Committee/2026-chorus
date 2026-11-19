import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import * as jsx from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";

let user = { permission: "member" };
let reads = 0;
const modules = {
  "react/jsx-runtime": jsx,
  "next/link": {
    __esModule: true,
    default: ({ href, children }) => jsx.jsx("a", { href, children }),
  },
  "@/app/dashboard/students/AutoRefresh": { AutoRefresh: () => null },
  "@/components/Authguard": { AuthGuard: () => null },
  "@/components/AddManualVoteButton": {
    AddManualVoteButton: () => jsx.jsx("button", { children: "投票を追加" }),
  },
  "@/lib/permission": {
    hasMinimumPermission: (user) =>
      ["admin", "operator"].includes(user.permission),
  },
  "@/db/votes": {
    getVoteTotals: async () => {
      reads++;
      return [
        { className: "1A", firstCount: 12, secondCount: 3 },
        { className: "2D", firstCount: 2, secondCount: 5 },
      ];
    },
  },
  "@/lib/class-name": {
    GRADES: [1, 2, 3],
    CLASS_LETTERS: ["A", "B", "C", "D"],
  },
  "@/lib/session": { getCurrentUser: async () => user },
  "../../members/page.module.css": { default: {} },
  "../../students/page.module.css": { default: {} },
  "./page.module.css": { default: {} },
};
const code = ts.transpileModule(
  fs.readFileSync(
    new URL("../src/app/dashboard/votes/result/page.tsx", import.meta.url),
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
vm.runInNewContext(code, { exports, require: (id) => modules[id] });

test("results show every class, use zero for missing counts, and require a signed-in user", async () => {
  const guard = exports.default().props.children;
  assert.equal(guard.props.minimumPermission, "member");
  const content = guard.props.children;
  const tree = await content.type(content.props);
  assert.equal(tree.props.children[0].props.intervalMs, 3_000);
  const html = renderToStaticMarkup(tree);
  assert.equal((html.match(/<dt>/g) ?? []).length, 12);
  assert.match(html, /12<\/span>/);
  assert.match(html, /5<\/span>/);
  assert.match(html, /0<\/span>/);
  assert.match(html, /無効票は含みません/);
  assert.equal((html.match(/1番のクラス/g) ?? []).length, 12);
  assert.equal((html.match(/2番のクラス/g) ?? []).length, 12);
  assert.match(html, /3<\/span>/);
  assert.doesNotMatch(html, /投票を追加/);
  user = { permission: "operator" };
  const operatorHtml = renderToStaticMarkup(await content.type(content.props));
  assert.match(operatorHtml, /投票を追加/);
  assert.match(operatorHtml, /手動投票の一覧/);
  user = null;
  assert.equal(await content.type(content.props), null);
  assert.equal(reads, 2);
});
