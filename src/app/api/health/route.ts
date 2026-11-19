import { connection } from "next/server";
import type { Sql } from "postgres";

import { db } from "@/lib/db";

// Probed by the VPS deploy scripts (`wget -T 3 .../api/health`) before a
// blue/green swap. Kept well under that 3s so a hung database surfaces as a
// 503 instead of a timed-out health check.
const PROBE_TIMEOUT_MS = 2000;

// Goes through the raw postgres-js client because only its PendingQuery
// exposes cancel(): losing the race must actually abort the query so a stalled
// probe doesn't keep holding a pool slot.
async function probeDatabase(): Promise<void> {
  // `$client` is attached by drizzle() but missing from the exported type.
  const client = (db as unknown as { $client: Sql }).$client;
  const query = client`select 1`.execute();

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_resolve, reject) => {
    timeoutId = setTimeout(() => {
      query.cancel();
      reject(new Error("health probe timed out"));
    }, PROBE_TIMEOUT_MS);
  });

  try {
    await Promise.race([query, deadline]);
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function GET() {
  // With cacheComponents enabled a GET handler is prerendered unless it opts
  // into request time; a health check must never be served from the build.
  await connection();

  try {
    await probeDatabase();
    return new Response("ok", { status: 200 });
  } catch {
    return new Response("db unreachable", { status: 503 });
  }
}
