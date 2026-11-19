import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import * as jsx from "react/jsx-runtime";
import { formatStudentId } from "../src/lib/student-id.ts";

const queries = [];
let roster = [];
let fail = false;
const modules = {
  "react/jsx-runtime": jsx,
  "@/db/students": {
    getStudents: async (className) => {
      queries.push(className);
      if (fail) throw new Error("database unavailable");
      return roster;
    },
  },
  "@/lib/class-name": {
    GRADES: [1, 2, 3],
    CLASS_LETTERS: ["A", "B", "C", "D"],
    toClassName: (grade, letter) =>
      /^[A-D]$/.test(letter) ? `${grade}${letter}` : null,
  },
  "@/lib/student-id": { formatStudentId },
  "./selectors": { default: () => null },
  "./page.module.css": { default: {} },
};
const code = ts.transpileModule(
  fs.readFileSync(
    new URL("../src/app/verify/page.tsx", import.meta.url),
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

async function page(params) {
  return exports.default({ searchParams: Promise.resolve(params) });
}

function content(element) {
  if (Array.isArray(element)) return element.flatMap(content);
  if (element == null || typeof element === "boolean") return [];
  if (typeof element !== "object") return [element];
  return content(element.props.children);
}

test("queries only a valid selected class and groups formatted IDs by part", async () => {
  for (const params of [
    {},
    { grade: "4", class: "A" },
    { grade: "1", class: "X" },
    { grade: ["1"], class: "A" },
  ]) {
    await page(params);
  }
  assert.equal(queries.length, 0);
  roster = [
    { id: "2A1", part: "Soprano" },
    { id: "2A12", part: "Bass" },
  ];
  const tree = await page({ grade: "2", class: "A" });
  assert.deepEqual(queries, ["2A"]);
  const results = tree.props.children[5];
  const groups = results.props.children[1].props.children;
  assert.deepEqual(Array.from(content(groups[0])), ["ソプラノ", "2A01"]);
  assert.deepEqual(Array.from(content(groups[3])), ["バス", "2A12"]);
});

test("distinguishes an empty roster from a database error", async () => {
  roster = [];
  const empty = await page({ grade: "1", class: "B" });
  assert.ok(content(empty).includes("生徒情報が登録されていません。"));
  fail = true;
  const error = await page({ grade: "1", class: "B" });
  assert.ok(
    content(error).includes(
      "生徒情報を取得できませんでした。もう一度お試しください。",
    ),
  );
  fail = false;
});
