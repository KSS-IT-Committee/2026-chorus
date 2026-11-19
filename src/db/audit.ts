import "server-only";

import { desc } from "drizzle-orm";
import { auditLogs } from "@/db/schema";
import { db } from "@/lib/db";

export async function getAuditLogs() {
  return db
    .select()
    .from(auditLogs)
    .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id));
}
