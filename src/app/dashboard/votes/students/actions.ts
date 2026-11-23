"use server";

import { revalidatePath } from "next/cache";
import { changeVote } from "@/db/votes";
import { hasMinimumPermission } from "@/lib/permission";
import { getCurrentUser } from "@/lib/session";
import { getAuditReason } from "@/lib/audit-reason";

export async function changeVoteAction(
  _state: { error: string | null; success: boolean },
  formData: FormData,
): Promise<{ error: string | null; success: boolean }> {
  const user = await getCurrentUser();
  if (user?.permission === "it" || !hasMinimumPermission(user, "operator"))
    return { error: "この操作を行う権限がありません。", success: false };
  const reason = getAuditReason(formData.get("reason"));
  if (!reason)
    return { error: "理由を500文字以内で入力してください。", success: false };
  const studentId = formData.get("studentId");
  const id = formData.get("voteId");
  const operation = formData.get("operation");
  if (
    typeof studentId !== "string" ||
    (studentId !== "" && (!studentId.trim() || studentId.length > 32)) ||
    typeof id !== "string" ||
    !/^[1-9][0-9]*$/.test(id) ||
    !Number.isSafeInteger(Number(id)) ||
    Number(id) > 2147483647 ||
    (operation !== "delete" && operation !== "invalidate")
  ) {
    return { error: "対象の投票を確認できませんでした。", success: false };
  }
  try {
    const changed = await changeVote(
      studentId === "" ? null : studentId,
      Number(id),
      operation,
      user.username,
      reason,
    );
    if (!changed)
      return {
        error: "投票が見つからないか、既に無効になっています。",
        success: false,
      };
  } catch (error) {
    const cause = error instanceof Error ? error.cause : null;
    const constraint =
      typeof cause === "object" && cause !== null && "constraint_name" in cause
        ? cause.constraint_name
        : undefined;
    if (
      (error instanceof Error && error.message === "Invalid audit reason") ||
      constraint === "audit_logs_reason_required"
    ) {
      return {
        error:
          "理由を記録できなかったため、操作を中止しました。画面を再読み込みしてお試しください。",
        success: false,
      };
    }
    const code =
      typeof cause === "object" &&
      cause !== null &&
      "code" in cause &&
      typeof cause.code === "string"
        ? cause.code
        : undefined;
    console.error("Failed to change vote", { code });
    return {
      error: "操作を完了できませんでした。時間をおいて再度お試しください。",
      success: false,
    };
  }
  revalidatePath("/dashboard/votes/students");
  revalidatePath("/dashboard/votes/manual");
  revalidatePath("/dashboard/votes/result");
  revalidatePath("/dashboard/votes/students/[studentId]", "page");
  return { error: null, success: true };
}
