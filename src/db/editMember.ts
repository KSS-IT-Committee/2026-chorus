import "server-only";

import { eq } from "drizzle-orm";
import { members, PERMISSION, sessions } from "@/db/schema";
import { isValidNewPassword } from "@/lib/account-validation";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";

export async function resetMemberPassword(username: string, password: string) {
  if (!isValidNewPassword(password)) throw new Error("Invalid password");
  const hash = await hashPassword(password);
  return db.transaction(async (tx) => {
    const updated = await tx
      .update(members)
      .set({ password: hash, hasLoggedIn: false })
      .where(eq(members.username, username))
      .returning({ username: members.username });
    if (!updated.length) return false;
    await tx.delete(sessions).where(eq(sessions.username, username));
    return true;
  });
}

export async function updateMemberPermission(
  username: string,
  permission: (typeof PERMISSION)[number],
) {
  if (!PERMISSION.includes(permission)) throw new Error("Invalid permission");
  const updated = await db
    .update(members)
    .set({ permission })
    .where(eq(members.username, username))
    .returning({ username: members.username });
  return updated.length > 0;
}
