import Link from "next/link";

import { AutoRefresh } from "@/app/dashboard/students/AutoRefresh";
import { AuthGuard } from "@/components/Authguard";
import { VoteActions } from "@/components/VoteActions";
import { getManualVotes } from "@/db/votes";
import { hasMinimumPermission } from "@/lib/permission";
import { getCurrentUser } from "@/lib/session";
import styles from "../../members/page.module.css";
import rosterStyles from "../../students/page.module.css";

export const instant = false;

export default function ManualVotesPage() {
  return (
    <main className={styles.main}>
      <AuthGuard minimumPermission="operator" excludeIt>
        <ManualVotesContent />
      </AuthGuard>
    </main>
  );
}

async function ManualVotesContent() {
  const user = await getCurrentUser();
  if (user?.permission === "it" || !hasMinimumPermission(user, "operator"))
    return null;
  const records = await getManualVotes();
  const format = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  return (
    <>
      <AutoRefresh intervalMs={3_000} />
      <Link href="/dashboard/votes/result" className={rosterStyles.back}>
        ← クラスごとの投票結果
      </Link>
      <h1 className={styles.title}>手動投票の一覧</h1>
      <section className={rosterStyles.content} aria-label="手動投票">
        {records.length ? (
          <ul className={styles.pageList}>
            {records.map((vote) => (
              <li key={vote.id} className={styles.pageListItem}>
                <div className={rosterStyles.voteRow}>
                  <div className={styles.username}>
                    {vote.grade}年への投票{" "}
                    <span className={rosterStyles.listStatus}>
                      #{vote.id}
                      <br />
                      <time dateTime={vote.votedAt.toISOString()}>
                        {format.format(vote.votedAt)}
                      </time>
                    </span>
                  </div>
                  <span className={rosterStyles.listStatus}>
                    {vote.invalid ? "無効票" : "投票済み"}
                  </span>
                  <VoteActions
                    studentId={null}
                    voteId={vote.id}
                    grade={vote.grade}
                    invalid={vote.invalid}
                  />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.empty}>手動で追加された投票はありません。</p>
        )}
      </section>
    </>
  );
}
