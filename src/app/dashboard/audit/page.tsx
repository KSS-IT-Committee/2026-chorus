import Link from "next/link";

import { AutoRefresh } from "@/app/dashboard/students/AutoRefresh";
import { AuthGuard } from "@/components/Authguard";
import { getAuditLogs } from "@/db/audit";
import { getCurrentUser } from "@/lib/session";
import { formatStudentId } from "@/lib/student-id";
import styles from "./page.module.css";

export const instant = false;

const actions: Record<string, string> = {
  "vote.create_manual": "手動投票を追加",
  "vote.delete": "投票を削除",
  "vote.invalidate": "投票を無効化",
  "member.create": "委員アカウントを作成",
  "member.password_reset": "パスワードをリセット",
  "member.permission_change": "権限を変更",
  "member.delete": "委員アカウントを削除",
};

export default function AuditPage() {
  return (
    <main className={styles.main}>
      <AuthGuard minimumPermission="member">
        <AuditContent />
      </AuthGuard>
    </main>
  );
}

async function AuditContent() {
  if (!(await getCurrentUser())) return null;
  const logs = await getAuditLogs();
  const format = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  return (
    <>
      <AutoRefresh intervalMs={3_000} />
      <Link href="/dashboard" className={styles.back}>
        ← 合唱委員ページ
      </Link>
      <h1 className={styles.title}>操作履歴</h1>
      {logs.length ? (
        <ol className={styles.list} aria-label="新しい順の操作履歴">
          {logs.map((log) => {
            const details = log.details;
            const reason =
              typeof details?.reason === "string" && details.reason.trim()
                ? details.reason
                : null;
            const grade =
              typeof details?.grade === "number" &&
              [1, 2, 3].includes(details.grade)
                ? details.grade
                : null;
            const studentId =
              typeof details?.studentId === "string" && details.studentId
                ? details.studentId
                : null;
            const permission =
              typeof details?.permission === "string" &&
              ["admin", "operator", "editor", "member"].includes(
                details.permission,
              )
                ? details.permission
                : null;
            const action = Object.hasOwn(actions, log.action)
              ? actions[log.action]
              : log.action;
            return (
              <li key={log.id} className={styles.entry}>
                <div className={styles.entryHeader}>
                  <h2 className={styles.action}>{action}</h2>
                  <time
                    className={styles.time}
                    dateTime={log.createdAt.toISOString()}
                  >
                    {format.format(log.createdAt)}
                  </time>
                </div>
                <dl className={styles.details}>
                  <div>
                    <dt>実行者</dt>
                    <dd>{log.operatorName}</dd>
                  </div>
                  {(log.targetType || log.targetId) && (
                    <div>
                      <dt>対象</dt>
                      <dd>
                        {log.targetType === "member"
                          ? "委員"
                          : log.targetType === "vote"
                            ? "投票"
                            : log.targetType}
                        {log.targetId &&
                          ` ${log.targetType === "vote" ? "#" : ""}${log.targetId}`}
                        {grade && `・${grade}年への投票`}
                        {studentId && `・生徒 ${formatStudentId(studentId)}`}
                        {!studentId &&
                          (details?.studentId === null ||
                            log.action === "vote.create_manual") &&
                          "・生徒IDなし"}
                      </dd>
                    </div>
                  )}
                  {permission && (
                    <div>
                      <dt>権限</dt>
                      <dd>{permission}</dd>
                    </div>
                  )}
                  <div>
                    <dt>理由</dt>
                    <dd className={reason ? styles.reason : styles.missing}>
                      {reason ?? "記録なし"}
                    </dd>
                  </div>
                </dl>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className={styles.empty}>操作履歴はありません。</p>
      )}
    </>
  );
}
