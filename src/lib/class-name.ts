import { CLASSNAMES } from "@/db/schema";

export type ClassName = (typeof CLASSNAMES)[number];

export const GRADES = [1, 2, 3] as const;
export const CLASS_LETTERS = ["A", "B", "C", "D"] as const;

export type Grade = (typeof GRADES)[number];
export type ClassLetter = (typeof CLASS_LETTERS)[number];

export function isGrade(value: unknown): value is Grade {
  return GRADES.some((grade) => grade === value);
}

export function isClassLetter(value: unknown): value is ClassLetter {
  return CLASS_LETTERS.some((letter) => letter === value);
}

/**
 * Builds the `class_name` enum value (e.g. "2C") from a grade and class
 * letter. Accepts loose input (form values, query strings) and returns null
 * instead of throwing when it doesn't name a real class.
 */
export function toClassName(
  grade: number | string,
  classLetter: string,
): ClassName | null {
  const gradeNumber = typeof grade === "string" ? Number(grade) : grade;
  const letter = classLetter.trim().toUpperCase();
  if (!isGrade(gradeNumber) || !isClassLetter(letter)) return null;

  const className = `${gradeNumber}${letter}`;
  return CLASSNAMES.find((name) => name === className) ?? null;
}
