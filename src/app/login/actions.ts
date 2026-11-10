"use server";

import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { members } from "@/db/schema";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import {
  createSession,
  invalidateSession,
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
} from "@/lib/session";

const attempts = new Map<string, { count: number; until: number }>();
// shortcut: process-local throttling does not cover multiple instances, use a shared limiter before scaling.
const DUMMY_HASH = "scrypt$AAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

export async function loginAction(
  _state: { error: string | null },
  formData: FormData,
): Promise<{ error: string | null }> {
  const username = formData.get("username");
  const password = formData.get("password");
  if (
    typeof username !== "string" ||
    typeof password !== "string" ||
    !username ||
    !password ||
    username.length > 32 ||
    Buffer.byteLength(password) > 1024
  ) {
    return { error: "ユーザー名とパスワードを入力してください。" };
  }
  const now = Date.now();
  for (const [key, value] of attempts)
    if (value.until <= now) attempts.delete(key);
  const attempt = attempts.get(username);
  if (attempt && attempt.count >= 10)
    return {
      error: "試行回数が多すぎます。しばらくしてから再度お試しください。",
    };
  if (!attempt && attempts.size >= 10000)
    return { error: "しばらくしてから再度お試しください。" };
  attempts.set(username, {
    count: (attempt?.count ?? 0) + 1,
    until: attempt?.until ?? now + 60_000,
  });
  const [member] = await db
    .select()
    .from(members)
    .where(eq(members.username, username));
  const valid = await verifyPassword(password, member?.password ?? DUMMY_HASH);
  if (!member || !valid)
    return { error: "ユーザー名またはパスワードが正しくありません。" };
  attempts.delete(username);
  const token = await createSession(member.username);
  await db
    .update(members)
    .set({ hasLoggedIn: true })
    .where(eq(members.username, member.username));
  (await cookies()).set(SESSION_COOKIE_NAME, token, sessionCookieOptions);
  redirect("/dashboard");
}

export async function logoutAction() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (token) await invalidateSession(token);
  store.set(SESSION_COOKIE_NAME, "", { ...sessionCookieOptions, maxAge: 0 });
  redirect("/login");
}
