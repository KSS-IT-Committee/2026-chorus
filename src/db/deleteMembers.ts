import "server-only";

import { eq } from "drizzle-orm";
import { members } from "@/db/schema";
import { db, type Executor } from "@/lib/db";

export async function deleteMembers(username: string, executor: Executor = db) {
  const deleted = await executor
    .delete(members)
    .where(eq(members.username, username))
    .returning({ username: members.username });
  return deleted.length > 0;
}
