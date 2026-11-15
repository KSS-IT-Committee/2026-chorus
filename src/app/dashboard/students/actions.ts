"use server";

import { revalidatePath } from "next/cache";

import { PARTS } from "@/db/schema";
import { createStudent, deleteStudent, updateStudentPart } from "@/db/students";
import { isClassLetter, isGrade } from "@/lib/class-name";
import { hasMinimumPermission } from "@/lib/permission";
import { getCurrentUser } from "@/lib/session";

export async function createStudentAction(
  _state: { error: string | null; success: boolean },
  formData: FormData,
): Promise<{ error: string | null; success: boolean }> {
  const user = await getCurrentUser();
  if (!hasMinimumPermission(user, "editor")) {
    return { error: "生徒を登録する権限がありません。", success: false };
  }

  const gradeValue = formData.get("grade");
  const classLetter = formData.get("class");
  const numberValue = formData.get("attendanceNumber");
  const part = PARTS.find((value) => value === formData.get("part"));
  const grade =
    typeof gradeValue === "string" && /^[1-3]$/.test(gradeValue)
      ? Number(gradeValue)
      : 0;
  if (!isGrade(grade) || !isClassLetter(classLetter)) {
    return { error: "学年とクラスを確認してください。", success: false };
  }
  if (
    typeof numberValue !== "string" ||
    !/^[0-9]+$/.test(numberValue) ||
    !Number.isInteger(Number(numberValue)) ||
    Number(numberValue) < 1 ||
    Number(numberValue) > 40
  ) {
    return {
      error: "出席番号は1から40の整数を入力してください。",
      success: false,
    };
  }
  if (!part) {
    return { error: "パートを選択してください。", success: false };
  }

  const attendanceNumber = Number(numberValue);
  try {
    await createStudent({
      id: `${grade}${classLetter}${attendanceNumber}`,
      grade,
      class: classLetter,
      attendanceNumber,
      part,
    });
  } catch (error) {
    const cause = error instanceof Error ? error.cause : null;
    if (
      typeof cause === "object" &&
      cause !== null &&
      "code" in cause &&
      cause.code === "23505"
    ) {
      return { error: "この生徒は既に登録されています。", success: false };
    }
    console.error("Failed to create student");
    return {
      error: "生徒を登録できませんでした。時間をおいて再度お試しください。",
      success: false,
    };
  }

  revalidatePath("/dashboard/students");
  return { error: null, success: true };
}

export async function updateStudentAction(
  _state: { error: string | null; success: boolean },
  formData: FormData,
): Promise<{ error: string | null; success: boolean }> {
  const user = await getCurrentUser();
  if (!hasMinimumPermission(user, "editor")) {
    return { error: "この操作を行う権限がありません。", success: false };
  }
  const id = formData.get("id");
  const operation = formData.get("operation");
  if (typeof id !== "string" || !id.trim() || id.length > 32) {
    return { error: "対象の生徒を確認できませんでした。", success: false };
  }
  const part = PARTS.find((value) => value === formData.get("part"));
  if (operation !== "delete" && (operation !== "update" || !part)) {
    return { error: "パートを選択してください。", success: false };
  }

  let changed: boolean;
  try {
    changed =
      operation === "delete"
        ? await deleteStudent(id)
        : await updateStudentPart(id, part!);
  } catch (error) {
    const cause = error instanceof Error ? error.cause : null;
    if (
      operation === "delete" &&
      typeof cause === "object" &&
      cause !== null &&
      "code" in cause &&
      cause.code === "23503"
    ) {
      return {
        error: "投票データがある生徒は削除できません。",
        success: false,
      };
    }
    console.error("Failed to update student");
    return {
      error: "操作を完了できませんでした。時間をおいて再度お試しください。",
      success: false,
    };
  }
  if (!changed) return { error: "生徒が見つかりません。", success: false };
  revalidatePath("/dashboard/students");
  return { error: null, success: true };
}
