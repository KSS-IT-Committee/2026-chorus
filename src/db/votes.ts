import "server-only";

import { and, count, eq, sql } from "drizzle-orm";
import { auditLogs, students, votes } from "@/db/schema";
import type { ClassName } from "@/lib/class-name";
import { db } from "@/lib/db";

export async function getVoteStudentSummaries(className?: ClassName) {
  return db
    .select({
      id: students.id,
      className: students.classname,
      attendanceNumber: students.attendanceNumber,
      voteCount: count(votes.id),
      invalidCount:
        sql<number>`count(${votes.id}) filter (where ${votes.invalid})`.mapWith(
          Number,
        ),
    })
    .from(students)
    .leftJoin(votes, eq(votes.studentId, students.id))
    .where(className ? eq(students.classname, className) : undefined)
    .groupBy(students.id, students.classname, students.attendanceNumber)
    .orderBy(students.attendanceNumber);
}

export async function getStudentVotes(studentId: string) {
  const [student] = await db
    .select({
      id: students.id,
      className: students.classname,
      attendanceNumber: students.attendanceNumber,
    })
    .from(students)
    .where(eq(students.id, studentId));
  if (!student) return null;
  const records = await db
    .select({
      id: votes.id,
      grade: votes.grade,
      invalid: votes.invalid,
    })
    .from(votes)
    .where(eq(votes.studentId, studentId))
    .orderBy(votes.grade);
  return { student, records };
}

export async function changeVote(
  studentId: string,
  voteId: number,
  operation: "delete" | "invalidate",
  operatorName: string,
) {
  return db.transaction(async (tx) => {
    const condition = and(eq(votes.id, voteId), eq(votes.studentId, studentId));
    const changed =
      operation === "delete"
        ? await tx
            .delete(votes)
            .where(condition)
            .returning({ id: votes.id, grade: votes.grade })
        : await tx
            .update(votes)
            .set({ invalid: true })
            .where(and(condition, eq(votes.invalid, false)))
            .returning({ id: votes.id, grade: votes.grade });
    if (!changed.length) return false;
    await tx.insert(auditLogs).values({
      operatorName,
      action: operation === "delete" ? "vote.delete" : "vote.invalidate",
      targetType: "vote",
      targetId: String(voteId),
      details: { studentId, grade: changed[0].grade },
    });
    return true;
  });
}
