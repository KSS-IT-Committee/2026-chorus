import "server-only";

import { and, asc, count, desc, eq, isNull, sql } from "drizzle-orm";
import { auditLogs, students, votes } from "@/db/schema";
import type { ClassName } from "@/lib/class-name";
import { db, type Executor } from "@/lib/db";
import { getAuditReason } from "@/lib/audit-reason";
import type { VoteSubmission } from "@/lib/vote-validation";

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
  const auditReason = getAuditReason(reason);
  if (!auditReason) throw new Error("Invalid audit reason");
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
      details: { studentId, grade: changed[0].grade, reason: auditReason },
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
  const auditReason = getAuditReason(reason);
  if (!auditReason) throw new Error("Invalid audit reason");
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
      details: { grade, reason: auditReason },
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

export type RegisterVoteResult =
  | "created"
  | "replayed"
  | "student-not-found"
  | "already-voted"
  | "idempotency-conflict";

export async function getVoteProgress(
  classname: ClassName,
  part: VoteSubmission["part"],
  executor: Executor = db,
) {
  const roster = await executor
    .select({
      attendanceNumber: students.attendanceNumber,
      voteId: votes.id,
    })
    .from(students)
    .leftJoin(
      votes,
      and(
        eq(votes.studentId, students.id),
        eq(votes.grade, students.grade),
        eq(votes.invalid, false),
      ),
    )
    .where(and(eq(students.classname, classname), eq(students.part, part)))
    .orderBy(asc(students.attendanceNumber));

  const entries = roster.map(({ attendanceNumber, voteId }) => ({
    attendanceNumber,
    voted: voteId !== null,
  }));
  return {
    registeredCount: entries.length,
    votedCount: entries.filter((student) => student.voted).length,
    students: entries,
  };
}

function getDuplicateConstraint(error: unknown): string | undefined {
  let current = error;
  const seen = new Set<object>();

  while (
    typeof current === "object" &&
    current !== null &&
    !seen.has(current)
  ) {
    seen.add(current);

    if ("code" in current && current.code === "23505") {
      const constraint =
        "constraint" in current ? current.constraint : undefined;
      const constraintName =
        "constraint_name" in current ? current.constraint_name : undefined;

      if (typeof constraint === "string") return constraint;
      if (typeof constraintName === "string") return constraintName;
    }

    current = "cause" in current ? current.cause : undefined;
  }

  return undefined;
}

export async function registerVote(
  submission: VoteSubmission,
  database: Pick<typeof db, "transaction"> = db,
): Promise<RegisterVoteResult> {
  try {
    return await database.transaction(async (tx) => {
      const [student] = await tx
        .select({ id: students.id })
        .from(students)
        .where(
          and(
            eq(students.classname, submission.classname),
            eq(students.part, submission.part),
            eq(students.attendanceNumber, submission.attendanceNumber),
          ),
        )
        .limit(1)
        .for("update");

      if (!student) return "student-not-found";

      const existing = await tx
        .select({
          grade: votes.grade,
          firstClass: votes.firstClass,
          secondClass: votes.secondClass,
          requestId: votes.requestId,
          invalid: votes.invalid,
        })
        .from(votes)
        .where(eq(votes.studentId, student.id));

      const [choice] = submission.choices;
      const previousRequest = existing.find(
        (vote) => vote.requestId === submission.requestId,
      );
      if (previousRequest) {
        return previousRequest.grade === choice.grade &&
          previousRequest.firstClass === choice.firstClass &&
          previousRequest.secondClass === choice.secondClass
          ? "replayed"
          : "idempotency-conflict";
      }
      if (existing.some((vote) => !vote.invalid && vote.grade === choice.grade))
        return "already-voted";

      await tx.insert(votes).values({
        ...choice,
        studentId: student.id,
        requestId: submission.requestId,
      });
      return "created";
    });
  } catch (error) {
    const constraint = getDuplicateConstraint(error);
    if (constraint === "votes_request_id_unique") return "idempotency-conflict";
    if (constraint === "votes_student_grade_unique") return "already-voted";
    throw error;
  }
}
