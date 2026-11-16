import "server-only";

import { and, eq } from "drizzle-orm";

import { students, votes } from "@/db/schema";
import { db, type Executor } from "@/lib/db";
import type { VoteSubmission } from "@/lib/vote-validation";

export type RegisterVoteResult =
  | "created"
  | "replayed"
  | "student-not-found"
  | "already-voted"
  | "idempotency-conflict";

export type VoteProgress = {
  registeredCount: number;
  votedCount: number;
};

export async function getVoteProgress(
  classname: VoteSubmission["classname"],
  part: VoteSubmission["part"],
  grade: number,
  executor: Executor = db,
): Promise<VoteProgress> {
  const roster = await executor
    .select({ voteId: votes.id })
    .from(students)
    .leftJoin(
      votes,
      and(eq(votes.studentId, students.id), eq(votes.grade, grade)),
    )
    .where(and(eq(students.classname, classname), eq(students.part, part)));

  return {
    registeredCount: roster.length,
    votedCount: roster.filter((student) => student.voteId !== null).length,
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
  executor: Executor = db,
): Promise<RegisterVoteResult> {
  const [student] = await executor
    .select({ id: students.id })
    .from(students)
    .where(
      and(
        eq(students.classname, submission.classname),
        eq(students.part, submission.part),
        eq(students.attendanceNumber, submission.attendanceNumber),
      ),
    )
    .limit(1);

  if (!student) return "student-not-found";

  const vote = {
    studentId: student.id,
    grade: submission.grade,
    firstClass: submission.firstClass,
    secondClass: submission.secondClass,
    requestId: submission.requestId,
  };

  try {
    await executor.insert(votes).values(vote);
  } catch (error) {
    const constraint = getDuplicateConstraint(error);
    if (
      constraint === "votes_student_grade_unique" ||
      constraint === "votes_request_id_unique"
    ) {
      const [existingRequest] = await executor
        .select({
          studentId: votes.studentId,
          grade: votes.grade,
          firstClass: votes.firstClass,
          secondClass: votes.secondClass,
        })
        .from(votes)
        .where(eq(votes.requestId, submission.requestId))
        .limit(1);

      if (existingRequest) {
        return existingRequest.studentId === student.id &&
          existingRequest.grade === submission.grade &&
          existingRequest.firstClass === submission.firstClass &&
          existingRequest.secondClass === submission.secondClass
          ? "replayed"
          : "idempotency-conflict";
      }

      if (constraint === "votes_student_grade_unique") return "already-voted";
    }

    throw error;
  }

  return "created";
}
