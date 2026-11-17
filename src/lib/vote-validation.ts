import { PARTS } from "@/db/schema";
import { toClassName, type ClassName, type Grade } from "@/lib/class-name";

export type VoteSubmission = {
  requestId: string;
  classname: ClassName;
  part: (typeof PARTS)[number];
  attendanceNumber: number;
  choices: [{ grade: Grade; firstClass: ClassName; secondClass: ClassName }];
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
    choices.length !== 1
  )
    return null;

  const [choice] = choices;
  const targetGrade = Number(grade) as Grade;
  if (
    !isRecord(choice) ||
    choice.grade !== targetGrade ||
    typeof choice.firstClass !== "string" ||
    typeof choice.secondClass !== "string"
  )
    return null;
  const firstClass = toClassName(targetGrade, choice.firstClass);
  const secondClass = toClassName(targetGrade, choice.secondClass);
  if (
    !firstClass ||
    !secondClass ||
    firstClass === secondClass ||
    firstClass === classname ||
    secondClass === classname
  )
    return null;
  return {
    requestId: requestId.toLowerCase(),
    classname,
    part,
    attendanceNumber,
    choices: [{ grade: targetGrade, firstClass, secondClass }],
  };
}
