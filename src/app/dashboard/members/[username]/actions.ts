"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { deleteMembers } from "@/db/deleteMembers";
import { resetMemberPassword, updateMemberPermission } from "@/db/editMember";
import { auditLogs, PERMISSION } from "@/db/schema";
import { db } from "@/lib/db";
import { getAuditReason } from "@/lib/audit-reason";
import { isValidNewPassword } from "@/lib/account-validation";
import { getCurrentUser } from "@/lib/session";

export async function updateMemberAction(
  _state: { error: string | null; success: boolean },
  formData: FormData,
): Promise<{ error: string | null; success: boolean }> {
  const user = await getCurrentUser();
  if (!user || !["admin"].includes(user.permission)) {
    return { error: "この操作を行う権限がありません。", success: false };
  }

  const username = formData.get("username");
  const operation = formData.get("operation");
  if (typeof username !== "string" || !username || username.length > 32) {
    return {
      error: "対象のアカウントを確認できませんでした。",
      success: false,
    };
  }
  if (username === user.username) {
    return {
      error: "自分のアカウントはここから変更できません。",
      success: false,
    };
  }

  const reason = getAuditReason(formData.get("reason"));
  if (!reason)
    return { error: "理由を500文字以内で入力してください。", success: false };

  let changed: boolean;
  try {
    if (operation === "password") {
      const password = formData.get("password");
      if (!isValidNewPassword(password))
        return {
          error:
            "パスワードは半角英数字と記号で8文字以上、1024文字以下にしてください。",
          success: false,
        };
      if (password !== formData.get("confirmation"))
        return { error: "パスワードが一致しません。", success: false };
    } else if (operation === "permission") {
      if (!PERMISSION.find((value) => value === formData.get("permission")))
        return { error: "権限を選択してください。", success: false };
    } else if (operation !== "delete") {
      return { error: "操作を確認できませんでした。", success: false };
    }

    changed = await db.transaction(async (tx) => {
      let result: boolean;
      if (operation === "delete") {
        result = await deleteMembers(username, tx);
      } else if (operation === "password") {
        result = await resetMemberPassword(
          username,
          formData.get("password") as string,
          tx,
        );
      } else {
        const permission = PERMISSION.find(
          (value) => value === formData.get("permission"),
        )!;
        result = await updateMemberPermission(username, permission, tx);
      }
      if (result) {
        await tx.insert(auditLogs).values({
          operatorName: user.username,
          action:
            operation === "password"
              ? "member.password_reset"
              : operation === "permission"
                ? "member.permission_change"
                : "member.delete",
          targetType: "member",
          targetId: username,
          details:
            operation === "permission"
              ? { reason, permission: formData.get("permission") as string }
              : { reason },
        });
      }
      return result;
    });
  } catch {
    console.error("Failed to update member");
    return {
      error: "操作を完了できませんでした。時間をおいて再度お試しください。",
      success: false,
    };
  }

  if (!changed)
    return { error: "アカウントが見つかりません。", success: false };
  revalidatePath("/dashboard/members");
  revalidatePath("/dashboard/members/[username]", "page");
  if (operation === "delete") redirect("/dashboard/members");
  return { error: null, success: true };
}
