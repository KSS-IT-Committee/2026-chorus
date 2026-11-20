import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import * as jsx from "react/jsx-runtime";
import { formatStudentId } from "../src/lib/student-id.ts";
import { renderToStaticMarkup } from "react-dom/server";

let user = { username: "test", permission: "operator" };
const rows = [
  {
    id: "1A1",
    className: "1A",
    attendanceNumber: 1,
    voteCount: 3,
    invalidCount: 1,
  },
  {
    id: "1A2",
    className: "1A",
    attendanceNumber: 2,
    voteCount: 1,
    invalidCount: 0,
  },
  {
    id: "1B1",
    className: "1B",
    attendanceNumber: 1,
    voteCount: 0,
    invalidCount: 0,
  },
];
const modules = {
  "react/jsx-runtime": jsx,
  "next/link": {
    __esModule: true,
    default: ({ children, href }) => jsx.jsx("a", { href, children }),
  },
  "next/navigation": {
    notFound: () => {
      throw new Error("not found");
    },
  },
  "@/lib/student-id": { formatStudentId },
  "@/components/Authguard": { AuthGuard: () => null },
  "@/app/dashboard/students/AutoRefresh": { AutoRefresh: () => null },
  "@/components/VoteActions": {
    VoteActions: () => jsx.jsx("button", { children: "操作" }),
  },
  "@/db/votes": {
    getVoteStudentSummaries: async (className) =>
      className ? rows.filter((row) => row.className === className) : rows,
    getStudentVotes: async (id) =>
      id === "1A1"
        ? {
            student: { id, className: "1A", attendanceNumber: 1 },
            records: [
              { id: 9, grade: 1, invalid: true },
              { id: 12, grade: 1, invalid: false },
            ],
          }
        : null,
  },
  "@/lib/class-name": {
    GRADES: [1, 2, 3],
    CLASS_LETTERS: ["A", "B", "C", "D"],
    toClassName: (grade, letter) =>
      /^[A-D]$/.test(letter) ? `${grade}${letter}` : null,
  },
  "@/lib/permission": {
    hasMinimumPermission: (value) =>
      ["admin", "operator"].includes(value.permission),
  },
  "@/lib/session": { getCurrentUser: async () => user },
  "../../members/page.module.css": { default: {} },
  "../../students/page.module.css": { default: {} },
  "../../../members/page.module.css": { default: {} },
  "../../../students/page.module.css": { default: {} },
};
function load(path) {
  const code = ts.transpileModule(
    fs.readFileSync(new URL(path, import.meta.url), "utf8"),
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
  return exports.default;
}
async function renderPage(page, props) {
  const guard = page(props).props.children;
  assert.equal(guard.props.minimumPermission, "member");
  return renderToStaticMarkup(
    await guard.props.children.type(guard.props.children.props),
  );
}

test("class counts and student statuses distinguish partial and invalid votes", async () => {
  const page = load("../src/app/dashboard/votes/students/page.tsx");
  const counts = await renderPage(page, {
    searchParams: Promise.resolve({ grade: "1" }),
  });
  assert.match(counts, /投票済み 1 \/ 2人/);
  const list = await renderPage(page, {
    searchParams: Promise.resolve({ grade: "1", class: "A" }),
  });
  assert.match(list, /無効票あり/);
  assert.match(list, /1A01/);
  assert.match(list, /href="\/dashboard\/votes\/students\/1A1"/);
  assert.match(list, /1\/3件/);
  assert.doesNotMatch(list, /1B1/);
});

test("student details hide choices and restrict vote actions to operators", async () => {
  const page = load("../src/app/dashboard/votes/students/[studentId]/page.tsx");
  const props = { params: Promise.resolve({ studentId: "1A1" }) };
  const admin = await renderPage(page, props);
  assert.match(admin, /無効票/);
  assert.match(admin, /投票済み/);
  assert.equal(admin.match(/1年への投票/g).length, 2);
  assert.equal(admin.match(/操作/g).length, 2);
  assert.match(admin, /1A01/);
  assert.match(admin, /未投票/);
  assert.match(admin, /操作/);
  assert.doesNotMatch(admin, /1番のクラス|2番のクラス|firstClass|secondClass/);
  user = { username: "reader", permission: "member" };
  assert.doesNotMatch(await renderPage(page, props), /操作/);
  await assert.rejects(
    renderPage(page, { params: Promise.resolve({ studentId: "missing" }) }),
    /not found/,
  );
});
