"use server";

import { revalidatePath } from "next/cache";
import { addManualVote } from "@/db/votes";
import { isGrade, toVoteClassPair } from "@/lib/class-name";
import { hasMinimumPermission } from "@/lib/permission";
import { getCurrentUser } from "@/lib/session";
import { getAuditReason } from "@/lib/audit-reason";

export async function addManualVoteAction(
  _state: { error: string | null; success: boolean },
  formData: FormData,
): Promise<{ error: string | null; success: boolean }> {
  const user = await getCurrentUser();
  if (!hasMinimumPermission(user, "operator"))
    return { error: "投票を追加する権限がありません。", success: false };
  const reason = getAuditReason(formData.get("reason"));
  if (!reason)
    return { error: "理由を500文字以内で入力してください。", success: false };
  const gradeText = formData.get("grade");
  const first = formData.get("firstClass");
  const second = formData.get("secondClass");
  const grade =
    typeof gradeText === "string" && /^[1-3]$/.test(gradeText)
      ? Number(gradeText)
      : 0;
  if (
    !isGrade(grade) ||
    typeof first !== "string" ||
    typeof second !== "string"
  )
    return { error: "学年とクラスを選択してください。", success: false };
  const pair = toVoteClassPair(grade, first, second);
  if (!pair)
    return {
      error: "1番のクラスと2番のクラスには異なるクラスを選択してください。",
      success: false,
    };
  const [firstClass, secondClass] = pair;
  try {
    await addManualVote(grade, firstClass, secondClass, user.username, reason);
  } catch {
    console.error("Failed to add manual vote");
    return {
      error: "投票を追加できませんでした。時間をおいて再度お試しください。",
      success: false,
    };
  }
  revalidatePath("/dashboard/votes/result");
  revalidatePath("/dashboard/votes/manual");
  return { error: null, success: true };
}
