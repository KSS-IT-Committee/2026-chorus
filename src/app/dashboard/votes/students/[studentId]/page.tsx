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
      <AuthGuard minimumPermission="member" excludeIt>
        <StudentVotesContent params={params} />
      </AuthGuard>
    </main>
  );
}

async function StudentVotesContent({ params }: { params: Params }) {
  const user = await getCurrentUser();
  if (!user || user.permission === "it") return null;
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
          {GRADES.map((grade) => {
            const vote = records.find((record) => record.grade === grade);
            return (
              <li key={grade} className={styles.pageListItem}>
                <div className={rosterStyles.voteRow}>
                  <span className={styles.username}>{grade}年への投票</span>
                  <span className={rosterStyles.listStatus}>
                    {!vote ? "未投票" : vote.invalid ? "無効票" : "投票済み"}
                  </span>
                  {vote && canEdit && (
                    <VoteActions
                      studentId={student.id}
                      voteId={vote.id}
                      grade={grade}
                      invalid={vote.invalid}
                    />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
      <p>
        なお、無効票は投票を無効にしつつ、再投票を防ぐことができます。投票を無効化し、再投票ができるようにしたい場合は投票の削除を行ってください。
      </p>
    </>
  );
}
