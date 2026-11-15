import Link from "next/link";

import { AuthGuard } from "@/components/Authguard";
import { getStudentCounts, getStudents } from "@/db/students";
import { CLASS_LETTERS, GRADES, toClassName } from "@/lib/class-name";
import styles from "../members/page.module.css";
import rosterStyles from "./page.module.css";
import { AutoRefresh } from "./AutoRefresh";
import { CreateStudentButton } from "@/components/CreateStudentButton";
import { StudentActions } from "@/components/StudentActions";
import { ImportStudentsButton } from "@/components/ImportStudentsButton";
import { getCurrentUser } from "@/lib/session";
import { formatStudentId } from "@/lib/student-id";

export const instant = false;

type SearchParams = Promise<{ grade?: string; class?: string }>;

export default function StudentsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <main className={styles.main}>
      <AuthGuard minimumPermission="editor">
        <StudentsContent searchParams={searchParams} />
      </AuthGuard>
    </main>
  );
}

async function StudentsContent({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const grade = GRADES.find((value) => String(value) === params.grade);
  const className =
    grade && typeof params.class === "string"
      ? toClassName(grade, params.class)
      : null;
  const counts = className ? [] : await getStudentCounts();
  return (
    <>
      <AutoRefresh />
      <div className={rosterStyles.pageHeader}>
        <h1 className={styles.title}>生徒名簿</h1>
        {user?.permission === "admin" && <ImportStudentsButton />}
      </div>
      <section className={rosterStyles.content}>
        {grade && (
          <Link
            className={rosterStyles.back}
            href={
              className
                ? `/dashboard/students?grade=${grade}`
                : "/dashboard/students"
            }
          >
            ← {className ? `${grade}年のクラス一覧` : "学年一覧"}
          </Link>
        )}
        <div className={rosterStyles.header}>
          <h2 className={styles.subtitle}>
            {className
              ? `${grade}年${className.slice(1)}組`
              : grade
                ? `${grade}年`
                : "学年を選択"}
          </h2>
          {className && (
            <CreateStudentButton
              grade={className.slice(0, 1)}
              class={className.slice(1)}
            />
          )}
        </div>
        {className ? (
          <StudentList className={className} />
        ) : (
          <ul className={styles.pageList}>
            {(grade ? CLASS_LETTERS : GRADES).map((value) => {
              const count = grade
                ? (counts.find((row) => row.className === `${grade}${value}`)
                    ?.count ?? 0)
                : 0;
              const hasEmptyClass =
                !grade &&
                CLASS_LETTERS.some(
                  (letter) =>
                    !counts.some(
                      (row) =>
                        row.className === `${value}${letter}` && row.count > 0,
                    ),
                );
              return (
                <li key={value} className={styles.pageListItem}>
                  <Link
                    href={
                      grade
                        ? `/dashboard/students?grade=${grade}&class=${value}`
                        : `/dashboard/students?grade=${value}`
                    }
                    className={styles.pageLink}
                  >
                    <span className={styles.username}>
                      {grade ? `${value}組` : `${value}年`}
                    </span>
                    {grade ? (
                      <span className={rosterStyles.listStatus}>
                        {count}人{count === 0 && "（未登録）"}
                      </span>
                    ) : hasEmptyClass ? (
                      <span className={rosterStyles.listStatus}>
                        未登録のクラスあり
                      </span>
                    ) : null}
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

async function StudentList({
  className,
}: {
  className: NonNullable<ReturnType<typeof toClassName>>;
}) {
  const roster = await getStudents(className);

  if (!roster.length)
    return <p className={styles.empty}>生徒は登録されていません。</p>;

  return (
    <table className={rosterStyles.table}>
      <thead>
        <tr>
          <th scope="col">出席番号</th>
          <th scope="col">生徒番号</th>
          <th scope="col">パート</th>
          <th scope="col" className={rosterStyles.actionHeader}>
            <span>操作</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {roster.map((student) => (
          <tr key={student.id}>
            <td>{student.attendanceNumber}</td>
            <td>{formatStudentId(student.id)}</td>
            <td>{student.part}</td>
            <td className={rosterStyles.actionCell}>
              <StudentActions id={student.id} part={student.part} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
