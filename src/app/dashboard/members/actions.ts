"use server";

import { revalidatePath } from "next/cache";
import { addMembers } from "@/db/addMembers";
import { PERMISSION } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";

export async function createMemberAction(
  _state: { error: string | null; success: boolean },
  formData: FormData,
): Promise<{ error: string | null; success: boolean }> {
  const user = await getCurrentUser();
  if (!user || user.permission !== "admin") {
    return { error: "アカウントを作成する権限がありません。", success: false };
  }

  const username = formData.get("username");
  const password = formData.get("password");
  const permission = PERMISSION.find(
    (value) => value === formData.get("permission"),
  );
  if (typeof username !== "string" || !username || username.length > 32) {
    return {
      error: "ユーザー名は1文字以上32文字以下で入力してください。",
      success: false,
    };
  }
  if (
    typeof password !== "string" ||
    password.length < 8 ||
    Buffer.byteLength(password) > 1024
  ) {
    return {
      error: "パスワードは8文字以上、1024バイト以下で入力してください。",
      success: false,
    };
  }
  if (!permission) {
    return { error: "権限を選択してください。", success: false };
  }

  try {
    await addMembers(username, password, permission);
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
