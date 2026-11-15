import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { CLASSNAMES, PARTS, students } from "../src/db/schema.ts";

function load(path, modules) {
  const code = ts.transpileModule(
    fs.readFileSync(new URL(path, import.meta.url), "utf8"),
    {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    },
  ).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: (id) => modules[id] });
  return exports;
}
const className = load("../src/lib/class-name.ts", {
  "@/db/schema": { CLASSNAMES },
});
const calls = [];
let deleted = [];
let deleteError;
const db = {
  insert: () => ({
    values: async (value) => {
      calls.push(["insert", value]);
    },
  }),
  update: () => ({
    set: (values) => ({
      where: (condition) => ({
        returning: async () => {
          calls.push(["update", values, condition]);
          return deleted;
        },
      }),
    }),
  }),
  delete: () => ({
    where: (condition) => ({
      returning: async () => {
        calls.push(["delete", condition]);
        if (deleteError) throw deleteError;
        return deleted;
      },
    }),
  }),
  select: () => ({
    from: () => ({
      groupBy: async (column) => {
        calls.push(["groupBy", column]);
        return [{ className: "3A", count: 4 }];
      },
      where: (condition) => ({
        orderBy: async (column) => {
          calls.push(["select", condition, column]);
          return [{ id: "3A22" }];
        },
      }),
    }),
  }),
};
const {
  createStudent,
  deleteStudent,
  getStudents,
  getStudentCounts,
  updateStudentPart,
} = load("../src/db/students.ts", {
  "server-only": {},
  "drizzle-orm": {
    eq: (column, value) => ({ column, value }),
    count: () => "count",
  },
  "@/db/schema": { PARTS, students },
  "@/lib/class-name": className,
  "@/lib/db": { db },
});

test("student operations validate input and preserve database errors", async () => {
  const student = {
    id: "3A22",
    grade: 3,
    class: "A",
    attendanceNumber: 22,
    part: "Alto",
  };
  await createStudent(student);
  assert.equal(calls[0][1].classname, "3A");
  for (const change of [
    { id: "" },
    { grade: 4 },
    { class: "Z" },
    { attendanceNumber: 1.5 },
    { part: "Other" },
  ]) {
    await assert.rejects(
      createStudent({ ...student, ...change }),
      /Invalid student data/,
    );
  }
  assert.equal(calls.length, 1);
  assert.equal((await getStudents("3A"))[0].id, "3A22");
  assert.equal(calls[1][1].value, "3A");
  assert.equal(calls[1][2], students.attendanceNumber);
  await assert.rejects(updateStudentPart("3A22", "Other"), /Invalid part/);
  assert.equal(await updateStudentPart("3A22", "Bass"), false);
  assert.equal(calls.at(-1)[1].part, "Bass");
  assert.equal(calls.at(-1)[2].value, "3A22");
  assert.equal(await deleteStudent("3A22"), false);
  deleted = [{ id: "3A22" }];
  assert.equal(await deleteStudent("3A22"), true);
  assert.equal(await updateStudentPart("3A22", "Alto"), true);
  deleteError = new Error("foreign key");
  await assert.rejects(deleteStudent("3A22"), /foreign key/);
});

test("student counts are grouped by class", async () => {
  const counts = await getStudentCounts();
  assert.equal(counts[0].className, "3A");
  assert.equal(counts[0].count, 4);
  assert.equal(calls.at(-1)[1], students.classname);
});
