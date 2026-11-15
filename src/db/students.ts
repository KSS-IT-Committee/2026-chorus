import "server-only";

import { count, eq } from "drizzle-orm";

import { PARTS, students } from "@/db/schema";
import {
  isClassLetter,
  isGrade,
  toClassName,
  type ClassName,
} from "@/lib/class-name";
import { db } from "@/lib/db";

type NewStudent = {
  id: string;
  grade: number;
  class: string;
  attendanceNumber: number;
  part: (typeof PARTS)[number];
};

export async function createStudent(student: NewStudent) {
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

  await db.insert(students).values({
    id,
    grade,
    class: classLetter,
    classname: className,
    attendanceNumber,
    part,
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
