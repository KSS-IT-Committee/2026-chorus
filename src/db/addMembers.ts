import "server-only";

import { members, PERMISSION } from "@/db/schema";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";

export async function addMembers(
  username: string,
  password: string,
  permission: (typeof PERMISSION)[number],
) {
  if (!username || username.length > 32) {
    throw new Error("Username must be between 1 and 32 characters");
  }
  if (password.length < 8 || Buffer.byteLength(password) > 1024) {
    throw new Error(
      "Password must be at least 8 characters and at most 1024 bytes",
    );
  }
  if (!PERMISSION.includes(permission)) {
    throw new Error("Invalid permission");
  }

  await db.insert(members).values({
    username,
    password: await hashPassword(password),
    permission,
  });
}
