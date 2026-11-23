"use server";

import { revalidatePath } from "next/cache";
import { addMembers } from "@/db/addMembers";
import { auditLogs, PERMISSION } from "@/db/schema";
import { db } from "@/lib/db";
import { getAuditReason } from "@/lib/audit-reason";
import { getCurrentUser } from "@/lib/session";
import { isValidNewPassword, isValidUsername } from "@/lib/account-validation";

export async function createMemberAction(
  _state: { error: string | null; success: boolean },
  formData: FormData,
): Promise<{ error: string | null; success: boolean }> {
  const user = await getCurrentUser();
  if (!user || (user.permission !== "admin" && user.permission !== "it")) {
    return { error: "アカウントを作成する権限がありません。", success: false };
  }

  const reason = getAuditReason(formData.get("reason"));
  if (!reason)
    return { error: "理由を500文字以内で入力してください。", success: false };
  const username = formData.get("username");
  const password = formData.get("password");
  const permission = PERMISSION.find(
    (value) => value === formData.get("permission"),
  );
  if (!isValidUsername(username)) {
    return {
      error:
        "ユーザー名は半角英数字と記号で1〜32文字にしてください。「.」と「..」は使えません。",
      success: false,
    };
  }
  if (!isValidNewPassword(password)) {
    return {
      error:
        "パスワードは半角英数字と記号で8文字以上、1024文字以下にしてください。",
      success: false,
    };
  }
  if (!permission) {
    return { error: "権限を選択してください。", success: false };
  }
  if (user.permission === "it" && permission !== "it") {
    return { error: "IT権限のアカウントのみ作成できます。", success: false };
  }

  try {
    await db.transaction(async (tx) => {
      await addMembers(username, password, permission, tx);
      await tx.insert(auditLogs).values({
        operatorName: user.username,
        action: "member.create",
        targetType: "member",
        targetId: username,
        details: { reason, permission },
      });
    });
  } catch (error) {
    const cause = error instanceof Error ? error.cause : null;
    if (
      typeof cause === "object" &&
      cause !== null &&
      "code" in cause &&
      cause.code === "23505"
    ) {
      return { error: "このユーザー名は既に使われています。", success: false };
    }
    console.error("Failed to create member");
    return {
      error:
        "アカウントを作成できませんでした。時間をおいて再度お試しください。",
      success: false,
    };
  }

  revalidatePath("/dashboard/members");
  return { error: null, success: true };
}
