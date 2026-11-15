import "server-only";

import { and, count, desc, eq, isNull, sql } from "drizzle-orm";
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
  studentId: string | null,
  voteId: number,
  operation: "delete" | "invalidate",
  operatorName: string,
  reason: string,
) {
  return db.transaction(async (tx) => {
    const condition = and(
      eq(votes.id, voteId),
      studentId === null
        ? isNull(votes.studentId)
        : eq(votes.studentId, studentId),
    );
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
      details: { studentId, grade: changed[0].grade, reason },
    });
    return true;
  });
}

export async function getVoteTotals() {
  return db.execute<{
    className: ClassName;
    firstCount: number;
    secondCount: number;
  }>(sql`
    select selection.class_name as "className",
      count(*) filter (where selection.choice = 1)::int as "firstCount",
      count(*) filter (where selection.choice = 2)::int as "secondCount"
    from ${votes}
    cross join lateral unnest(array[${votes.firstClass}, ${votes.secondClass}]) with ordinality as selection(class_name, choice)
    where ${votes.invalid} = false
    group by selection.class_name
  `);
}

export async function addManualVote(
  grade: number,
  firstClass: ClassName,
  secondClass: ClassName,
  operatorName: string,
  reason: string,
) {
  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(votes)
      .values({ studentId: null, grade, firstClass, secondClass })
      .returning({ id: votes.id });
    await tx.insert(auditLogs).values({
      operatorName,
      action: "vote.create_manual",
      targetType: "vote",
      targetId: String(created.id),
      details: { grade, reason },
    });
  });
}

export async function getManualVotes() {
  return db
    .select({
      id: votes.id,
      grade: votes.grade,
      invalid: votes.invalid,
      votedAt: votes.votedAt,
    })
    .from(votes)
    .where(isNull(votes.studentId))
    .orderBy(desc(votes.votedAt), desc(votes.id));
}
