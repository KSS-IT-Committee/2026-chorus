import { AuthGuard } from "@/components/Authguard";
import { Suspense } from "react";
import { eq } from "drizzle-orm";
import { forbidden, notFound, unauthorized } from "next/navigation";
import Link from "next/link";
import { members } from "@/db/schema";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { MemberActions } from "@/components/MemberActions";
import styles from "./page.module.css";

export const instant = false;

export default function Page({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  return (
    <main className={styles.main}>
      <Suspense fallback={null}>
        <AuthGuard minimumPermission="admin">
          <MemberContent params={params} />
        </AuthGuard>
      </Suspense>
    </main>
  );
}

async function MemberContent({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const user = await getCurrentUser();
  if (!user) unauthorized();
  if (user.permission !== "admin") forbidden();
  const [member] = await db
    .select({ username: members.username, permission: members.permission })
    .from(members)
    .where(eq(members.username, username))
    .limit(1);
  if (!member) notFound();
  return (
    <>
      <Link href="/dashboard/members" className={styles.back}>
        ← 委員アカウント一覧
      </Link>
      <h1 className={styles.title}>{member.username}</h1>
      <p className={styles.permission}>権限：{member.permission}</p>
      {user.username !== member.username && (
        <MemberActions
          username={member.username}
          permission={member.permission}
        />
      )}
    </>
  );
}
