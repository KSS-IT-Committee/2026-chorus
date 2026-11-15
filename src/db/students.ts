import "server-only";

import { createHash } from "node:crypto";
import { count, eq, inArray, or } from "drizzle-orm";

import { PARTS, students } from "@/db/schema";
import {
  isClassLetter,
  isGrade,
  toClassName,
  type ClassName,
} from "@/lib/class-name";
import { db, type Executor } from "@/lib/db";

type NewStudent = {
  id: string;
  grade: number;
  class: string;
  attendanceNumber: number;
  part: (typeof PARTS)[number];
};

function studentValues(student: NewStudent) {
  const { id, grade, attendanceNumber, part } = student;
  const classLetter = student.class;
  const className =
    typeof classLetter === "string" ? toClassName(grade, classLetter) : null;
  if (
    typeof id !== "string" ||
    !id.trim() ||
    id.length > 32 ||
    !isGrade(grade) ||
    !isClassLetter(classLetter) ||
    !className ||
    !Number.isInteger(attendanceNumber) ||
    attendanceNumber < 1 ||
    attendanceNumber > 2147483647 ||
    !PARTS.includes(part)
  ) {
    throw new Error("Invalid student data");
  }

  return {
    id,
    grade,
    class: classLetter,
    classname: className,
    attendanceNumber,
    part,
  };
}

export async function createStudent(student: NewStudent) {
  await db.insert(students).values(studentValues(student));
}

export async function createStudents(roster: NewStudent[]) {
  if (!roster.length) throw new Error("No students");
  await db.insert(students).values(roster.map(studentValues));
}

async function getImportPreview(
  roster: NewStudent[],
  executor: Executor,
  lock: boolean,
) {
  const values = roster.map(studentValues);
  const query = executor
    .select()
    .from(students)
    .where(
      or(
        inArray(
          students.id,
          values.map((value) => value.id),
        ),
        inArray(students.classname, [
          ...new Set(values.map((value) => value.classname)),
        ]),
      ),
    );
  const existing = await (lock ? query.for("update") : query);
  const updates = [];
  for (const student of values) {
    const sameId = existing.find((current) => current.id === student.id);
    const sameNumber = existing.find(
      (current) =>
        current.classname === student.classname &&
        current.attendanceNumber === student.attendanceNumber,
    );
    if (
      (sameId &&
        (sameId.classname !== student.classname ||
          sameId.attendanceNumber !== student.attendanceNumber)) ||
      (sameNumber && sameNumber.id !== student.id)
    ) {
      throw new Error("生徒番号と出席番号が登録済みのデータと一致しません。");
    }
    if (sameId)
      updates.push({
        id: student.id,
        currentPart: sameId.part,
        part: student.part,
      });
  }
  const token = createHash("sha256")
    .update(JSON.stringify({ values, updates }))
    .digest("hex");
  return { values, updates, token };
}

export async function previewStudentImport(roster: NewStudent[]) {
  const { values, updates, token } = await getImportPreview(roster, db, false);
  return { updates, newCount: values.length - updates.length, token };
}

export async function importStudents(roster: NewStudent[], token: string) {
  await db.transaction(async (tx) => {
    const {
      values,
      updates,
      token: currentToken,
    } = await getImportPreview(roster, tx, true);
    if (currentToken !== token)
      throw new Error(
        "確認後に生徒データが変更されました。もう一度確認してください。",
      );
    const updateIds = new Set(updates.map((student) => student.id));
    const newStudents = values.filter((student) => !updateIds.has(student.id));
    for (const student of updates) {
      await tx
        .update(students)
        .set({ part: student.part })
        .where(eq(students.id, student.id));
    }
    if (newStudents.length) await tx.insert(students).values(newStudents);
  });
}

export async function updateStudentPart(
  id: string,
  part: (typeof PARTS)[number],
) {
  if (!PARTS.includes(part)) throw new Error("Invalid part");
  const updated = await db
    .update(students)
    .set({ part })
    .where(eq(students.id, id))
    .returning({ id: students.id });
  return updated.length > 0;
}

export async function deleteStudent(id: string) {
  const deleted = await db
    .delete(students)
    .where(eq(students.id, id))
    .returning({ id: students.id });
  return deleted.length > 0;
}

export async function getStudents(className: ClassName) {
  return db
    .select()
    .from(students)
    .where(eq(students.classname, className))
    .orderBy(students.attendanceNumber);
}

export async function getStudentCounts() {
  return db
    .select({ className: students.classname, count: count() })
    .from(students)
    .groupBy(students.classname);
}
