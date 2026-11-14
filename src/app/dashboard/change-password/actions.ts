"use server";

import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect, unauthorized } from "next/navigation";
import { members, sessions } from "@/db/schema";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { validatePasswordChange } from "@/lib/password-change";
import {
  getCurrentUser,
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
} from "@/lib/session";

const attempts = new Map<string, { count: number; until: number }>();
// shortcut: process-local throttling does not cover multiple instances, use a shared limiter before scaling.

export async function changePasswordAction(
  _state: { error: string | null },
  formData: FormData,
): Promise<{ error: string | null }> {
  const user = await getCurrentUser();
  if (!user) unauthorized();
  const current = formData.get("currentPassword");
  const next = formData.get("newPassword");
  const error = validatePasswordChange(
    current,
    next,
    formData.get("confirmation"),
  );
  if (error || typeof current !== "string" || typeof next !== "string")
    return { error };

  const now = Date.now();
  for (const [key, value] of attempts)
    if (value.until <= now) attempts.delete(key);
  const attempt = attempts.get(user.username);
  if ((attempt && attempt.count >= 10) || (!attempt && attempts.size >= 10000))
    return {
      error: "試行回数が多すぎます。しばらくしてから再度お試しください。",
    };
  attempts.set(user.username, {
    count: (attempt?.count ?? 0) + 1,
    until: attempt?.until ?? now + 60_000,
  });

  const changed = await db.transaction(async (tx) => {
    const [member] = await tx
      .select()
      .from(members)
      .where(eq(members.username, user.username))
      .for("update");
    if (!member || !(await verifyPassword(current, member.password)))
      return false;
    await tx
      .update(members)
      .set({ password: await hashPassword(next) })
      .where(eq(members.username, user.username));
    await tx.delete(sessions).where(eq(sessions.username, user.username));
    return true;
  });
  if (!changed) return { error: "現在のパスワードが正しくありません。" };
  attempts.delete(user.username);
  (await cookies()).set(SESSION_COOKIE_NAME, "", {
    ...sessionCookieOptions,
    maxAge: 0,
  });
  redirect("/login?passwordChanged=1");
}
