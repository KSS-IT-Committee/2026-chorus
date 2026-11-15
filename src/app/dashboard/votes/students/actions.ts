"use server";

import { revalidatePath } from "next/cache";
import { changeVote } from "@/db/votes";
import { hasMinimumPermission } from "@/lib/permission";
import { getCurrentUser } from "@/lib/session";

export async function changeVoteAction(
  _state: { error: string | null; success: boolean },
  formData: FormData,
): Promise<{ error: string | null; success: boolean }> {
  const user = await getCurrentUser();
  if (!hasMinimumPermission(user, "operator"))
    return { error: "この操作を行う権限がありません。", success: false };
  const studentId = formData.get("studentId");
  const id = formData.get("voteId");
  const operation = formData.get("operation");
  if (
    typeof studentId !== "string" ||
    !studentId.trim() ||
    studentId.length > 32 ||
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
      studentId,
      Number(id),
      operation,
      user.username,
    );
    if (!changed)
      return {
        error: "投票が見つからないか、既に無効になっています。",
        success: false,
      };
  } catch {
    console.error("Failed to change vote");
    return {
      error: "操作を完了できませんでした。時間をおいて再度お試しください。",
      success: false,
    };
  }
  revalidatePath("/dashboard/votes/students");
  revalidatePath("/dashboard/votes/students/[studentId]", "page");
  return { error: null, success: true };
}
