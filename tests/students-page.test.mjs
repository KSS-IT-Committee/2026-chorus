import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import * as jsx from "react/jsx-runtime";

const queries = [];
const modules = {
  "react/jsx-runtime": jsx,
  "drizzle-orm": { eq: (_column, value) => value },
  "next/link": { default: () => null },
  "@/components/Authguard": { AuthGuard: () => null },
  "@/db/schema": {
    students: { classname: "classname", attendanceNumber: "number" },
  },
  "@/lib/class-name": {
    GRADES: [1, 2, 3],
    CLASS_LETTERS: ["A", "B", "C", "D"],
    toClassName: (grade, letter) =>
      /^[A-D]$/.test(letter) ? `${grade}${letter}` : null,
  },
  "@/lib/db": {
    db: {
      select: () => ({
        from: () => ({
          where: (value) => ({
            orderBy: async () => {
              queries.push(value);
              return [];
            },
          }),
        }),
      }),
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
  assert.equal(guard.props.minimumPermission, "editor");
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
    const section = tree.props.children[1];
    assert.equal(section.props.children[2].type, "ul");
  }
  assert.equal(queries.length, 0);
  const tree = await content({ grade: "2", class: "A" });
  const list = tree.props.children[1].props.children[2].props.children[1];
  await list.type(list.props);
  assert.deepEqual(queries, ["2A"]);
});
