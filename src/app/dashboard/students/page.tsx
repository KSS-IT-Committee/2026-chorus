import { eq } from "drizzle-orm";
import Link from "next/link";

import { AuthGuard } from "@/components/Authguard";
import { students } from "@/db/schema";
import { CLASS_LETTERS, GRADES, toClassName } from "@/lib/class-name";
import { db } from "@/lib/db";
import styles from "../members/page.module.css";
import rosterStyles from "./page.module.css";
import { AutoRefresh } from "./AutoRefresh";

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
  const grade = GRADES.find((value) => String(value) === params.grade);
  const className =
    grade && typeof params.class === "string"
      ? toClassName(grade, params.class)
      : null;

  return (
    <>
      <h1 className={styles.title}>生徒名簿</h1>
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
        <h2 className={styles.subtitle}>
          {className
            ? `${grade}年${className.slice(1)}組`
            : grade
              ? `${grade}年`
              : "学年を選択"}
        </h2>
        {className ? (
          <>
            <AutoRefresh />
            <StudentList className={className} />
          </>
        ) : (
          <ul className={styles.pageList}>
            {(grade ? CLASS_LETTERS : GRADES).map((value) => (
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
                </Link>
              </li>
            ))}
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
  const roster = await db
    .select()
    .from(students)
    .where(eq(students.classname, className))
    .orderBy(students.attendanceNumber);

  if (!roster.length)
    return <p className={styles.empty}>生徒は登録されていません。</p>;

  return (
    <table className={rosterStyles.table}>
      <thead>
        <tr>
          <th scope="col">出席番号</th>
          <th scope="col">生徒番号</th>
          <th scope="col">パート</th>
        </tr>
      </thead>
      <tbody>
        {roster.map((student) => (
          <tr key={student.id}>
            <td>{student.attendanceNumber}</td>
            <td>{student.id}</td>
            <td>{student.part}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
