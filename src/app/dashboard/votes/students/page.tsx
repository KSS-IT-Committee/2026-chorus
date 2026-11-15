import Link from "next/link";

import { AuthGuard } from "@/components/Authguard";
import { AutoRefresh } from "@/app/dashboard/students/AutoRefresh";
import { getVoteStudentSummaries } from "@/db/votes";
import { CLASS_LETTERS, GRADES, toClassName } from "@/lib/class-name";
import { getCurrentUser } from "@/lib/session";
import styles from "../../members/page.module.css";
import rosterStyles from "../../students/page.module.css";

export const instant = false;
type SearchParams = Promise<{ grade?: string; class?: string }>;

export default function VoteStudentPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <main className={styles.main}>
      <AuthGuard minimumPermission="member">
        <VoteStudentContent searchParams={searchParams} />
      </AuthGuard>
    </main>
  );
}

async function VoteStudentContent({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  if (!(await getCurrentUser())) return null;
  const params = await searchParams;
  const grade = GRADES.find((value) => String(value) === params.grade);
  const className =
    grade && typeof params.class === "string"
      ? toClassName(grade, params.class)
      : null;
  const roster = grade
    ? await getVoteStudentSummaries(className ?? undefined)
    : [];
  const backHref = className
    ? `/dashboard/votes/students?grade=${grade}`
    : grade
      ? "/dashboard/votes/students"
      : "/dashboard/votes";

  return (
    <>
      <AutoRefresh intervalMs={3_000} />
      <Link href={backHref} className={rosterStyles.back}>
        ←{" "}
        {className ? `${grade}年のクラス一覧` : grade ? "学年一覧" : "投票結果"}
      </Link>
      <h1 className={styles.title}>生徒ごとの投票結果</h1>
      <section className={rosterStyles.content}>
        <h2 className={styles.subtitle}>
          {className
            ? `${grade}年${className.slice(1)}組`
            : grade
              ? `${grade}年`
              : "学年を選択"}
        </h2>
        {className ? (
          roster.length ? (
            <>
              <p>{roster.length}人</p>
              <ul className={styles.pageList}>
                {roster.map((student) => (
                  <li key={student.id} className={styles.pageListItem}>
                    <Link
                      href={`/dashboard/votes/students/${encodeURIComponent(student.id)}`}
                      className={styles.pageLink}
                    >
                      <span className={styles.username}>
                        {student.attendanceNumber}番　{student.id}
                      </span>
                      <span className={rosterStyles.listStatus}>
                        {student.voteCount === 0
                          ? "未投票"
                          : student.voteCount === 3
                            ? "投票済み"
                            : `${student.voteCount}/3件投票済み`}{" "}
                        {student.invalidCount > 0 && "（無効票あり）"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className={styles.empty}>生徒は登録されていません。</p>
          )
        ) : (
          <ul className={styles.pageList}>
            {(grade ? CLASS_LETTERS : GRADES).map((value) => {
              const members = grade
                ? roster.filter(
                  (student) => student.className === `${grade}${value}`,
                )
                : [];
              return (
                <li key={value} className={styles.pageListItem}>
                  <Link
                    href={
                      grade
                        ? `/dashboard/votes/students?grade=${grade}&class=${value}`
                        : `/dashboard/votes/students?grade=${value}`
                    }
                    className={styles.pageLink}
                  >
                    <span className={styles.username}>
                      {grade ? `${value}組` : `${value}年`}
                    </span>
                    {grade && (
                      <span className={rosterStyles.listStatus}>
                        投票済み{" "}
                        {
                          members.filter((student) => student.voteCount === 3)
                            .length
                        }{" "}
                        / {members.length}人
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
