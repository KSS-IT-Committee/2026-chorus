import Link from "next/link";

import { AutoRefresh } from "@/app/dashboard/students/AutoRefresh";
import { AuthGuard } from "@/components/Authguard";
import { AddManualVoteButton } from "@/components/AddManualVoteButton";
import { getVoteTotals } from "@/db/votes";
import { CLASS_LETTERS, GRADES } from "@/lib/class-name";
import { getCurrentUser } from "@/lib/session";
import { hasMinimumPermission } from "@/lib/permission";
import layoutStyles from "../../members/page.module.css";
import navigationStyles from "../../students/page.module.css";
import styles from "./page.module.css";

export const instant = false;

export default function VoteResultsPage() {
  return (
    <main className={layoutStyles.main}>
      <AuthGuard minimumPermission="member">
        <VoteResultsContent />
      </AuthGuard>
    </main>
  );
}

async function VoteResultsContent() {
  const user = await getCurrentUser();
  if (!user) return null;
  const canEdit = hasMinimumPermission(user, "operator");
  const totals = await getVoteTotals();

  return (
    <>
      <AutoRefresh intervalMs={3_000} />
      <Link href="/dashboard/votes" className={navigationStyles.back}>
        ← 投票結果
      </Link>
      <div className={navigationStyles.pageHeader}>
        <h1 className={layoutStyles.title}>クラスごとの投票結果</h1>
        {canEdit && <AddManualVoteButton />}
      </div>
      {canEdit && (
        <Link href="/dashboard/votes/manual" className={styles.manualLink}>
          手動投票の一覧
        </Link>
      )}
      <p className={styles.note}>無効票は含みません。</p>
      <div className={styles.results}>
        {GRADES.map((grade) => (
          <section key={grade} aria-labelledby={`grade-${grade}`}>
            <h2 id={`grade-${grade}`} className={styles.grade}>
              {grade}年
            </h2>
            <dl className={styles.classes}>
              {CLASS_LETTERS.map((letter) => {
                const className = `${grade}${letter}`;
                const total = totals.find((row) => row.className === className);
                return (
                  <div key={letter} className={styles.classResult}>
                    <dt>{letter}組</dt>
                    <dd className={styles.choices}>
                      <div>
                        <span className={styles.label}>1番のクラス</span>
                        <div>
                          <span className={styles.number}>
                            {total?.firstCount ?? 0}
                          </span>
                          <span className={styles.unit}>人</span>
                        </div>
                      </div>
                      <div>
                        <span className={styles.label}>2番のクラス</span>
                        <div>
                          <span className={styles.number}>
                            {total?.secondCount ?? 0}
                          </span>
                          <span className={styles.unit}>人</span>
                        </div>
                      </div>
                    </dd>
                  </div>
                );
              })}
            </dl>
          </section>
        ))}
      </div>
    </>
  );
}
