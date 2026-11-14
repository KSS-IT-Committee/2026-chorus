"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { deleteMembers } from "@/db/deleteMembers";
import { resetMemberPassword, updateMemberPermission } from "@/db/editMember";
import { PERMISSION } from "@/db/schema";
import { isValidNewPassword } from "@/lib/account-validation";
import { getCurrentUser } from "@/lib/session";

export async function updateMemberAction(
  _state: { error: string | null; success: boolean },
  formData: FormData,
): Promise<{ error: string | null; success: boolean }> {
  const user = await getCurrentUser();
  if (!user || user.permission !== "admin") {
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

  let changed: boolean;
  try {
    if (operation === "delete") {
      changed = await deleteMembers(username);
    } else if (operation === "password") {
      const password = formData.get("password");
      if (!isValidNewPassword(password)) {
        return {
          error:
            "パスワードは半角英数字と記号で8文字以上、1024文字以下にしてください。",
          success: false,
        };
      }
      if (password !== formData.get("confirmation")) {
        return { error: "パスワードが一致しません。", success: false };
      }
      changed = await resetMemberPassword(username, password);
    } else if (operation === "permission") {
      const permission = PERMISSION.find(
        (value) => value === formData.get("permission"),
      );
      if (!permission)
        return { error: "権限を選択してください。", success: false };
      changed = await updateMemberPermission(username, permission);
    } else {
      return { error: "操作を確認できませんでした。", success: false };
    }
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
