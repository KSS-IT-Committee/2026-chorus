import { isGrade, toClassName } from "@/lib/class-name";

export type VoteSubmission = {
  grade: number;
  classname: NonNullable<ReturnType<typeof toClassName>>;
  attendanceNumber: number;
  firstClass: NonNullable<ReturnType<typeof toClassName>>;
  secondClass: NonNullable<ReturnType<typeof toClassName>>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function parseVoteSubmission(value: unknown): VoteSubmission | null {
  if (!isRecord(value)) return null;

  const grade =
    typeof value.grade === "number"
      ? value.grade
      : typeof value.grade === "string" && /^[1-3]$/.test(value.grade)
        ? Number(value.grade)
        : NaN;
  if (!isGrade(grade)) return null;

  if (
    typeof value.className !== "string" ||
    typeof value.attendanceNumber !== "number" ||
    !Number.isInteger(value.attendanceNumber) ||
    value.attendanceNumber < 1 ||
    value.attendanceNumber > 40 ||
    typeof value.firstClass !== "string" ||
    typeof value.secondClass !== "string"
  ) {
    return null;
  }

  const classname = toClassName(grade, value.className);
  const firstClass = toClassName(grade, value.firstClass);
  const secondClass = toClassName(grade, value.secondClass);

  if (
    !classname ||
    !firstClass ||
    !secondClass ||
    firstClass === classname ||
    secondClass === classname ||
    firstClass === secondClass
  ) {
    return null;
  }

  return {
    grade,
    classname,
    attendanceNumber: value.attendanceNumber,
    firstClass,
    secondClass,
  };
}
