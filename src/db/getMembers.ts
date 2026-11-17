import "server-only";

import { members } from "@/db/schema";
import { db } from "@/lib/db";

export async function getMembers() {
  return db
    .select({
      username: members.username,
      hasLoggedIn: members.hasLoggedIn,
      permission: members.permission,
    })
    .from(members);
}
