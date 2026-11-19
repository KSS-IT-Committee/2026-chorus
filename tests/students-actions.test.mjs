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
    TypeError,
    File,
    TextDecoder,
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
const csv = load("../src/lib/student-csv.ts", {
  "@/db/schema": { PARTS },
  "@/lib/class-name": classes,
});
let user = null;
let failure;
const created = [];
const revalidated = [];
const operations = [];
let exists = true;
const { createStudentAction, updateStudentAction, importStudentsAction } = load(
  "../src/app/dashboard/students/actions.ts",
  {
    "next/cache": { revalidatePath: (path) => revalidated.push(path) },
    "@/db/schema": { PARTS },
    "@/db/students": {
      previewStudentImport: async (roster) => {
        if (failure) throw failure;
        return {
          updates: [
            { id: roster[0].id, currentPart: "Bass", part: roster[0].part },
          ],
          newCount: roster.length - 1,
          token: "a".repeat(64),
        };
      },
      importStudents: async (roster, token) => {
        if (failure) throw failure;
        assert.equal(token, "a".repeat(64));
        created.push(...roster);
      },
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
    "@/lib/student-csv": csv,
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

test("CSV import previews updates and requires admin confirmation", async () => {
  const run = async (
    contents,
    intent = "preview",
    token = "",
    filename = "students.csv",
  ) => {
    const form = new FormData();
    form.set("file", new File([contents], filename));
    form.set("intent", intent);
    form.set("token", token);
    return importStudentsAction({}, form);
  };
  const valid =
    "grade,class,attendanceNumber,part\r\n3,C,22,Alto\r\n2,A,3,Bass\r\n";
  created.length = 0;
  user = null;
  assert.equal((await run(valid)).success, false);
  user = { permission: "operator" };
  assert.equal((await run(valid)).success, false);
  user = { permission: "admin" };
  assert.match((await run(valid, "preview", "", "students.txt")).error, /CSV/);
  assert.match(
    (await run("grade,class,attendanceNumber,part\n3,C,41,Alto")).error,
    /2行目/,
  );
  assert.equal((await run(new Uint8Array([0xff]))).success, false);
  assert.equal((await run(valid, "import")).success, false);
  assert.equal(created.length, 0);
  const preview = await run(valid);
  assert.equal(preview.updates[0].id, "3C22");
  assert.equal(preview.updates[0].part, "Alto");
  assert.equal(preview.newCount, 1);
  assert.equal(created.length, 0);
  failure = new Error(
    "確認後に生徒データが変更されました。もう一度確認してください。",
  );
  assert.match(
    (await run(valid, "import", preview.token)).error,
    /もう一度確認/,
  );
  failure = undefined;
  const result = await run(valid, "import", preview.token);
  assert.equal(result.success, true);
  assert.equal(result.count, 2);
  assert.equal(created[0].id, "3C22");
});

test("CSV parser handles quoted fields and rejects malformed rows", () => {
  const parse = csv.parseStudentCsv;
  assert.equal(
    parse(
      '\uFEFFgrade,class,attendanceNumber,part\r\n"3","C","22","Alto"\r\n',
    )[0].id,
    "3C22",
  );
  assert.throws(
    () => parse('grade,class,attendanceNumber,part\n3,C,"22,Alto'),
    /引用符/,
  );
  assert.throws(
    () => parse("grade,class,attendanceNumber,part\n\n3,C,0,Alto"),
    /3行目/,
  );
  assert.throws(
    () => parse("grade,class,attendanceNumber,part\n3,C,1,Alto,extra"),
    /2行目/,
  );
  assert.throws(
    () => parse("grade,class,attendanceNumber,part\n3,C,1,Alto\n3,C,01,Bass"),
    /重複/,
  );
  assert.throws(
    () => parse("grade,class,attendanceNumber,part\n"),
    /データがありません/,
  );
});
