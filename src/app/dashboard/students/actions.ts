"use server";

import { revalidatePath } from "next/cache";

import { PARTS } from "@/db/schema";
import {
  createStudent,
  deleteStudent,
  importStudents,
  previewStudentImport,
  updateStudentPart,
} from "@/db/students";
import { isClassLetter, isGrade } from "@/lib/class-name";
import { hasMinimumPermission } from "@/lib/permission";
import { getCurrentUser } from "@/lib/session";
import { parseStudentCsv } from "@/lib/student-csv";

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

export type ImportStudentsState = {
  error: string | null;
  success: boolean;
  count: number;
  newCount: number;
  updates: { id: string; currentPart: string; part: string }[];
  token: string;
};

export async function importStudentsAction(
  _state: ImportStudentsState,
  formData: FormData,
): Promise<ImportStudentsState> {
  const empty = {
    success: false,
    count: 0,
    newCount: 0,
    updates: [],
    token: "",
  };
  const user = await getCurrentUser();
  if (!hasMinimumPermission(user, "admin")) {
    return { ...empty, error: "CSVを取り込む権限がありません。" };
  }
  const file = formData.get("file");
  if (
    !(file instanceof File) ||
    !file.name.toLowerCase().endsWith(".csv") ||
    file.size === 0 ||
    file.size > 256 * 1024
  ) {
    return { ...empty, error: "256KB以下のCSVファイルを選択してください。" };
  }
  let roster: ReturnType<typeof parseStudentCsv>;
  try {
    roster = parseStudentCsv(
      new TextDecoder("utf-8", { fatal: true }).decode(
        await file.arrayBuffer(),
      ),
    );
  } catch (error) {
    return {
      ...empty,
      error:
        error instanceof TypeError
          ? "UTF-8のCSVファイルを選択してください。"
          : error instanceof Error
            ? error.message
            : "CSVを読み取れませんでした。",
    };
  }
  const intent = formData.get("intent");
  try {
    if (intent === "preview") {
      const preview = await previewStudentImport(roster);
      return { ...empty, ...preview, error: null };
    }
    const token = formData.get("token");
    if (
      intent !== "import" ||
      typeof token !== "string" ||
      !/^[a-f0-9]{64}$/.test(token)
    ) {
      return { ...empty, error: "登録内容をもう一度確認してください。" };
    }
    await importStudents(roster, token);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (
      message === "生徒番号と出席番号が登録済みのデータと一致しません。" ||
      message ===
        "確認後に生徒データが変更されました。もう一度確認してください。"
    ) {
      return { ...empty, error: message };
    }
    const cause = error instanceof Error ? error.cause : null;
    if (
      typeof cause === "object" &&
      cause !== null &&
      "code" in cause &&
      cause.code === "23505"
    ) {
      return {
        ...empty,
        error: "生徒データが重複しています。もう一度確認してください。",
      };
    }
    console.error("Failed to import students");
    return {
      ...empty,
      error: "生徒を登録できませんでした。時間をおいて再度お試しください。",
    };
  }
  revalidatePath("/dashboard/students");
  return { ...empty, error: null, success: true, count: roster.length };
}
