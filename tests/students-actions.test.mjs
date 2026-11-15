import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { CLASSNAMES, PARTS, PERMISSION } from "../src/db/schema.ts";

function load(path, modules) {
  const code = ts.transpileModule(
    fs.readFileSync(new URL(path, import.meta.url), "utf8"),
    {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    },
  ).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    require: (id) => modules[id],
    Error,
    console,
  });
  return exports;
}
const classes = load("../src/lib/class-name.ts", {
  "@/db/schema": { CLASSNAMES },
});
const permission = load("../src/lib/permission.ts", {
  "@/db/schema": { PERMISSION },
});
let user = null;
let failure;
const created = [];
const revalidated = [];
const operations = [];
let exists = true;
const { createStudentAction, updateStudentAction } = load(
  "../src/app/dashboard/students/actions.ts",
  {
    "next/cache": { revalidatePath: (path) => revalidated.push(path) },
    "@/db/schema": { PARTS },
    "@/db/students": {
      deleteStudent: async (id) => {
        operations.push(["delete", id]);
        if (failure) throw failure;
        return exists;
      },
      updateStudentPart: async (id, part) => {
        operations.push(["update", id, part]);
        if (failure) throw failure;
        return exists;
      },
      createStudent: async (student) => {
        if (failure) throw failure;
        created.push(student);
      },
    },
    "@/lib/class-name": classes,
    "@/lib/permission": permission,
    "@/lib/session": { getCurrentUser: async () => user },
  },
);

async function submit(changes = {}) {
  const form = new FormData();
  for (const [key, value] of Object.entries({
    grade: "3",
    class: "C",
    attendanceNumber: "22",
    part: "Alto",
    ...changes,
  })) {
    if (value !== null) form.set(key, value);
  }
  return createStudentAction({ error: null, success: false }, form);
}

test("student registration checks permission, inputs and duplicate errors", async () => {
  assert.equal((await submit()).success, false);
  user = { permission: "member" };
  assert.equal((await submit()).success, false);
  user = { permission: "editor" };
  for (const changes of [
    { grade: "4" },
    { grade: " 3" },
    { class: "Z" },
    { attendanceNumber: "" },
    { attendanceNumber: "1.5" },
    { attendanceNumber: "41" },
    { attendanceNumber: new File(["1"], "number") },
    { part: "Other" },
  ])
    assert.equal((await submit(changes)).success, false);
  assert.equal(created.length, 0);
  failure = new Error("duplicate", { cause: { code: "23505" } });
  assert.match((await submit()).error, /既に登録/);
  failure = undefined;
  assert.equal((await submit()).success, true);
  assert.equal(created[0].id, "3C22");
  assert.equal(created[0].attendanceNumber, 22);
  assert.equal(created[0].part, "Alto");
  assert.deepEqual(revalidated, ["/dashboard/students"]);
});

test("student updates require permission and protect referenced votes", async () => {
  const form = new FormData();
  form.set("id", "3C22");
  form.set("operation", "update");
  form.set("part", "Bass");
  const submitUpdate = () =>
    updateStudentAction({ error: null, success: false }, form);
  user = null;
  assert.equal((await submitUpdate()).success, false);
  user = { permission: "member" };
  assert.equal((await submitUpdate()).success, false);
  user = { permission: "editor" };
  form.set("part", "Other");
  assert.equal((await submitUpdate()).success, false);
  assert.equal(operations.length, 0);
  form.set("part", "Bass");
  exists = false;
  assert.match((await submitUpdate()).error, /見つかりません/);
  exists = true;
  assert.equal((await submitUpdate()).success, true);
  assert.deepEqual(operations.at(-1), ["update", "3C22", "Bass"]);
  form.set("operation", "delete");
  failure = new Error("foreign key", { cause: { code: "23503" } });
  assert.match((await submitUpdate()).error, /投票データ/);
  failure = undefined;
  assert.equal((await submitUpdate()).success, true);
  assert.deepEqual(operations.at(-1), ["delete", "3C22"]);
});
