import Link from "next/link";
import { notFound } from "next/navigation";

import { AuthGuard } from "@/components/Authguard";
import { AutoRefresh } from "@/app/dashboard/students/AutoRefresh";
import { VoteActions } from "@/components/VoteActions";
import { getStudentVotes } from "@/db/votes";
import { GRADES } from "@/lib/class-name";
import { hasMinimumPermission } from "@/lib/permission";
import { getCurrentUser } from "@/lib/session";
import { formatStudentId } from "@/lib/student-id";
import styles from "../../../members/page.module.css";
import rosterStyles from "../../../students/page.module.css";

export const instant = false;
type Params = Promise<{ studentId: string }>;

export default function StudentVotesPage({ params }: { params: Params }) {
  return (
    <main className={styles.main}>
      <AuthGuard minimumPermission="member">
        <StudentVotesContent params={params} />
      </AuthGuard>
    </main>
  );
}

async function StudentVotesContent({ params }: { params: Params }) {
  const user = await getCurrentUser();
  if (!user) return null;
  const { studentId } = await params;
  if (!studentId || studentId.length > 32) notFound();
  const result = await getStudentVotes(studentId);
  if (!result) notFound();
  const { student, records } = result;
  const canEdit = hasMinimumPermission(user, "operator");
  const backHref = `/dashboard/votes/students?grade=${student.className.slice(0, 1)}&class=${student.className.slice(1)}`;
  return (
    <>
      <AutoRefresh intervalMs={3_000} />
      <Link href={backHref} className={rosterStyles.back}>
        ← {student.className}組の生徒一覧
      </Link>
      <h1 className={styles.title}>{formatStudentId(student.id)}</h1>
      <section className={rosterStyles.content}>
        <h2 className={styles.subtitle}>投票状況</h2>
        <ul className={styles.pageList}>
          {GRADES.flatMap((grade) => {
            // 無効化後に再投票すると同じ学年に複数の票が残るため、すべて表示する。
            const votes = records.filter((record) => record.grade === grade);
            if (!votes.length)
              return (
                <li key={`grade-${grade}`} className={styles.pageListItem}>
                  <div className={rosterStyles.voteRow}>
                    <span className={styles.username}>{grade}年への投票</span>
                    <span className={rosterStyles.listStatus}>未投票</span>
                  </div>
                </li>
              );
            return votes.map((vote) => (
              <li key={`vote-${vote.id}`} className={styles.pageListItem}>
                <div className={rosterStyles.voteRow}>
                  <span className={styles.username}>{grade}年への投票</span>
                  <span className={rosterStyles.listStatus}>
                    {vote.invalid ? "無効票" : "投票済み"}
                  </span>
                  {canEdit && (
                    <VoteActions
                      studentId={student.id}
                      voteId={vote.id}
                      grade={grade}
                      invalid={vote.invalid}
                    />
                  )}
                </div>
              </li>
            ));
          })}
        </ul>
      </section>
    </>
  );
}
