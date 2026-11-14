import "server-only";

import { members, PERMISSION } from "@/db/schema";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { isValidNewPassword, isValidUsername } from "@/lib/account-validation";

export async function addMembers(
  username: string,
  password: string,
  permission: (typeof PERMISSION)[number],
) {
  if (!isValidUsername(username)) {
    throw new Error(
      "Username must be 1 to 32 printable ASCII characters without spaces",
    );
  }
  if (!isValidNewPassword(password)) {
    throw new Error(
      "Password must be 8 to 1024 printable ASCII characters without spaces",
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
