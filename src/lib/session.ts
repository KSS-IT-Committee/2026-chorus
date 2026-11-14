import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { eq, lt } from "drizzle-orm";
import { cookies } from "next/headers";
import { cache } from "react";
import { members, sessions } from "@/db/schema";
import { db } from "@/lib/db";

export const SESSION_COOKIE_NAME = "chorus_session";
const TTL_SECONDS = 60 * 60 * 24 * 2;
const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

export async function createSession(username: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
  await db.insert(sessions).values({
    tokenHash: hashToken(token),
    username,
    expiresAt: new Date(Date.now() + TTL_SECONDS * 1000),
  });
  return token;
}

export async function invalidateSession(token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
}

export async function validateSessionToken(
  token: string,
): Promise<{
  username: string;
  permission: (typeof members.$inferSelect)["permission"];
} | null> {
  if (!/^[\w-]{43}$/.test(token)) return null;
  const [session] = await db
    .select({
      username: members.username,
      permission: members.permission,
      expiresAt: sessions.expiresAt,
    })
    .from(sessions)
    .innerJoin(members, eq(members.username, sessions.username))
    .where(eq(sessions.tokenHash, hashToken(token)));
  if (!session || session.expiresAt.getTime() <= Date.now()) return null;
  return { username: session.username, permission: session.permission };
}

export const getCurrentUser = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  return token ? validateSessionToken(token) : null;
});

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: TTL_SECONDS,
};
