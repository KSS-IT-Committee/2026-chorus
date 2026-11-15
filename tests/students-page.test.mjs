import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import * as jsx from "react/jsx-runtime";
import { formatStudentId } from "../src/lib/student-id.ts";

const queries = [];
let permission = "editor";
const modules = {
  "react/jsx-runtime": jsx,
  "next/link": { default: () => null },
  "@/lib/student-id": { formatStudentId },
  "@/components/Authguard": { AuthGuard: () => null },
  "@/components/Internal": { Internal: () => null },
  "@/components/CreateStudentButton": { CreateStudentButton: () => null },
  "@/components/StudentActions": { StudentActions: () => null },
  "@/components/ImportStudentsButton": { ImportStudentsButton: () => null },
  "@/lib/session": { getCurrentUser: async () => ({ permission }) },
  "@/lib/class-name": {
    GRADES: [1, 2, 3],
    CLASS_LETTERS: ["A", "B", "C", "D"],
    toClassName: (grade, letter) =>
      /^[A-D]$/.test(letter) ? `${grade}${letter}` : null,
  },
  "@/db/students": {
    getStudentCounts: async () => [
      { className: "1A", count: 1 },
      { className: "1B", count: 2 },
      { className: "1C", count: 3 },
      { className: "1D", count: 4 },
      { className: "2A", count: 3 },
    ],
    getStudents: async (className) => {
      queries.push(className);
      return [];
    },
  },
  "../members/page.module.css": { default: {} },
  "./page.module.css": { default: {} },
  "./AutoRefresh": { AutoRefresh: () => null },
};
const code = ts.transpileModule(
  fs.readFileSync(
    new URL("../src/app/dashboard/students/page.tsx", import.meta.url),
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

async function content(params) {
  const page = exports.default({ searchParams: Promise.resolve(params) });
  const guard = page.props.children;
  assert.equal(guard.props.minimumPermission, "member");
  return guard.props.children.type(guard.props.children.props);
}

test("students are queried only after a valid grade and class are selected", async () => {
  for (const params of [
    {},
    { grade: "2" },
    { grade: "4", class: "A" },
    { grade: "2", class: "X" },
  ]) {
    const tree = await content(params);
    const section = tree.props.children[3];
    assert.equal(section.props.children[1].type, "ul");
  }
  assert.equal(queries.length, 0);
  const tree = await content({ grade: "2", class: "A" });
  const button =
    tree.props.children[3].props.children[0].props.children[1].props.children;
  assert.equal(button.props.grade, "2");
  assert.equal(button.props.class, "A");
  const list = tree.props.children[3].props.children[1];
  await list.type(list.props);
  assert.deepEqual(queries, ["2A"]);
});

test("selection lists show missing classes and registered student counts", async () => {
  const grades = (await content({})).props.children[3].props.children[1].props
    .children;
  assert.equal(grades[0].props.children.props.children[1], null);
  assert.equal(
    grades[1].props.children.props.children[1].props.children,
    "未登録のクラスあり",
  );
  assert.equal(
    grades[2].props.children.props.children[1].props.children,
    "未登録のクラスあり",
  );
  const classes = (await content({ grade: "2" })).props.children[3].props
    .children[1].props.children;
  const first = classes[0].props.children.props.children[1].props.children;
  const second = classes[1].props.children.props.children[1].props.children;
  assert.equal(first[0], 3);
  assert.equal(first[2], false);
  assert.equal(second[0], 0);
  assert.equal(second[2], "（未登録）");
});

test("CSV import control is shown only to admins", async () => {
  permission = "editor";
  let header = (await content({})).props.children[2];
  assert.equal(header.props.children[1], false);
  permission = "admin";
  header = (await content({})).props.children[2];
  assert.equal(
    header.props.children[1].type,
    modules["@/components/ImportStudentsButton"].ImportStudentsButton,
  );
});

test("student navigation returns to the parent of each selection", async () => {
  assert.equal((await content({})).props.children[1].props.href, "/dashboard");
  assert.equal(
    (await content({ grade: "2" })).props.children[1].props.href,
    "/dashboard/students",
  );
  assert.equal(
    (await content({ grade: "2", class: "A" })).props.children[1].props.href,
    "/dashboard/students?grade=2",
  );
});
