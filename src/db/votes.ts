import "server-only";

import { and, eq } from "drizzle-orm";

import { students, votes } from "@/db/schema";
import { db, type Executor } from "@/lib/db";
import type { VoteSubmission } from "@/lib/vote-validation";

export type RegisterVoteResult =
  "created" | "student-not-found" | "already-voted";

function isDuplicateVoteError(error: unknown): boolean {
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

      if (
        constraint === "votes_student_grade_unique" ||
        constraintName === "votes_student_grade_unique"
      ) {
        return true;
      }
    }

    current = "cause" in current ? current.cause : undefined;
  }

  return false;
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
