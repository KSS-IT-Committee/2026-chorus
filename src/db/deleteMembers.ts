import "server-only";

import { eq } from "drizzle-orm";
import { members } from "@/db/schema";
import { db } from "@/lib/db";

export async function deleteMembers(username: string) {
  await db.delete(members).where(eq(members.username, username));
}
