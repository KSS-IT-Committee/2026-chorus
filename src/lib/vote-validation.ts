import { PARTS } from "@/db/schema";
import {
  isGrade,
  toClassName,
  type ClassName,
  type Grade,
} from "@/lib/class-name";

export type VoteSubmission = {
  requestId: string;
  classname: ClassName;
  part: (typeof PARTS)[number];
  attendanceNumber: number;
  choices: { grade: Grade; firstClass: ClassName; secondClass: ClassName }[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function parseVoteSubmission(value: unknown): VoteSubmission | null {
  if (!isRecord(value)) return null;
  const { requestId, grade, className, attendanceNumber, choices } = value;
  const part = PARTS.find((candidate) => candidate === value.part);
  const classname =
    typeof grade === "string" &&
    /^[1-3]$/.test(grade) &&
    typeof className === "string"
      ? toClassName(grade, className)
      : null;

  if (
    typeof requestId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      requestId,
    ) ||
    !classname ||
    !part ||
    typeof attendanceNumber !== "number" ||
    !Number.isInteger(attendanceNumber) ||
    attendanceNumber < 1 ||
    attendanceNumber > 40 ||
    !Array.isArray(choices) ||
    choices.length < 1 ||
    choices.length > 3
  )
    return null;

  const parsed: VoteSubmission["choices"] = [];
  for (const choice of choices) {
    if (
      !isRecord(choice) ||
      !isGrade(choice.grade) ||
      typeof choice.firstClass !== "string" ||
      typeof choice.secondClass !== "string" ||
      parsed.some(({ grade }) => grade === choice.grade)
    )
      return null;
    const firstClass = toClassName(choice.grade, choice.firstClass);
    const secondClass = toClassName(choice.grade, choice.secondClass);
    if (
      !firstClass ||
      !secondClass ||
      firstClass === secondClass ||
      firstClass === classname ||
      secondClass === classname
    )
      return null;
    parsed.push({ grade: choice.grade, firstClass, secondClass });
  }
  return {
    requestId: requestId.toLowerCase(),
    classname,
    part,
    attendanceNumber,
    choices: parsed.sort((a, b) => a.grade - b.grade),
  };
}
