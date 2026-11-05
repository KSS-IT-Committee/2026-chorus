import "server-only";

import { and, eq } from "drizzle-orm";

import { students, votes } from "@/db/schema";
import {
  type ClassLetter,
  type Grade,
  isClassLetter,
  isGrade,
  toClassName,
} from "@/lib/class-name";
import { db, type Executor } from "@/lib/db";

export type RehearsalVoteInput = {
  grade: number;
  classLetter: string;
  attendanceNumber: number;
  firstClass: string;
  secondClass: string;
};

export type RehearsalVoteResult =
  | { ok: true }
  | {
      ok: false;
      reason: "invalid" | "not-on-roster" | "already-voted" | "error";
      message: string;
    };

type ValidVote = {
  grade: Grade;
  classLetter: ClassLetter;
  attendanceNumber: number;
  firstClass: ClassLetter;
  secondClass: ClassLetter;
};

/**
 * Checks the rules the UI enforces, again on the server: a voter picks two
 * DIFFERENT classes of their OWN grade, neither of which is their own class.
 */
export function validateRehearsalVote(
  input: RehearsalVoteInput,
): ValidVote | null {
  const { grade, classLetter, attendanceNumber, firstClass, secondClass } =
    input;
  if (
    !isGrade(grade) ||
    !isClassLetter(classLetter) ||
    !isClassLetter(firstClass) ||
    !isClassLetter(secondClass) ||
    !Number.isInteger(attendanceNumber) ||
    attendanceNumber < 1 ||
    attendanceNumber > 40
  ) {
    return null;
  }
  if (
    firstClass === secondClass ||
    firstClass === classLetter ||
    secondClass === classLetter
  ) {
    return null;
  }
  return { grade, classLetter, attendanceNumber, firstClass, secondClass };
}

/**
 * Records one student's rehearsal vote. The voter is identified by
 * grade + class + attendance number against the `students` roster; the
 * `votes_student_grade_unique` constraint makes a second vote by the same
 * student a no-op that is reported as "already-voted".
 */
export async function recordRehearsalVote(
  input: RehearsalVoteInput,
  executor: Executor = db,
): Promise<RehearsalVoteResult> {
  const vote = validateRehearsalVote(input);
  if (!vote) {
    return { ok: false, reason: "invalid", message: "投票内容が不正です。" };
  }

  const [student] = await executor
    .select({ id: students.id })
    .from(students)
    .where(
      and(
        eq(students.grade, vote.grade),
        eq(students.class, vote.classLetter),
        eq(students.attendanceNumber, vote.attendanceNumber),
      ),
    )
    .limit(1);

  if (!student) {
    return {
      ok: false,
      reason: "not-on-roster",
      message: `${vote.grade}年${vote.classLetter}組${vote.attendanceNumber}番は名簿に登録されていません。`,
    };
  }

  // toClassName can't fail here: grade and letters were validated above.
  const firstClass = toClassName(vote.grade, vote.firstClass)!;
  const secondClass = toClassName(vote.grade, vote.secondClass)!;

  const inserted = await executor
    .insert(votes)
    .values({
      studentId: student.id,
      grade: vote.grade,
      firstClass,
      secondClass,
    })
    .onConflictDoNothing({ target: [votes.studentId, votes.grade] })
    .returning({ id: votes.id });

  if (inserted.length === 0) {
    return {
      ok: false,
      reason: "already-voted",
      message: `${vote.grade}年${vote.classLetter}組${vote.attendanceNumber}番はすでに投票済みです。`,
    };
  }

  return { ok: true };
}
