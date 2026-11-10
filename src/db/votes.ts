import "server-only";

import { and, eq } from "drizzle-orm";

import { students, votes } from "@/db/schema";
import { db, type Executor } from "@/lib/db";
import type { VoteSubmission } from "@/lib/vote-validation";

export type RegisterVoteResult =
  "created" | "student-not-found" | "already-voted";

function isDuplicateVoteError(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return false;
  }

  if (error.code !== "23505") return false;

  const constraint =
    "constraint_name" in error ? error.constraint_name : undefined;
  const legacyConstraint = "constraint" in error ? error.constraint : undefined;
  return (
    constraint === "votes_student_grade_unique" ||
    legacyConstraint === "votes_student_grade_unique"
  );
}

export async function registerVote(
  submission: VoteSubmission,
  executor: Executor = db,
): Promise<RegisterVoteResult> {
  const [student] = await executor
    .select({ id: students.id })
    .from(students)
    .where(
      and(
        eq(students.classname, submission.classname),
        eq(students.attendanceNumber, submission.attendanceNumber),
      ),
    )
    .limit(1);

  if (!student) return "student-not-found";

  try {
    await executor.insert(votes).values({
      studentId: student.id,
      grade: submission.grade,
      firstClass: submission.firstClass,
      secondClass: submission.secondClass,
    });
  } catch (error) {
    if (isDuplicateVoteError(error)) return "already-voted";
    throw error;
  }

  return "created";
}
