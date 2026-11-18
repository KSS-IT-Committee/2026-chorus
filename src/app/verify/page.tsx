import { getStudents } from "@/db/students";
import { CLASS_LETTERS, GRADES, toClassName } from "@/lib/class-name";
import { formatStudentId } from "@/lib/student-id";
import Selectors from "./selectors";
import styles from "./page.module.css";

export const instant = false;

const parts = [
  { value: "Soprano", label: "ソプラノ" },
  { value: "Alto", label: "アルト" },
  { value: "Tenor", label: "テノール" },
  { value: "Bass", label: "バス" },
] as const;

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{
    grade?: string | string[];
    class?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const grade = GRADES.find((item) => String(item) === params.grade);
  const className =
    grade && typeof params.class === "string"
      ? toClassName(grade, params.class)
      : null;
  let roster: Awaited<ReturnType<typeof getStudents>> = [];
  let loadError = false;
  if (className) {
    try {
      roster = await getStudents(className);
    } catch {
      loadError = true;
    }
  }
  return (
    <main className={styles.main}>
      <h1 className={styles.title}>生徒情報確認ページ</h1>
      <p>このページでは、登録されている生徒情報を確認できます。</p>
      <p>
        ここに登録されていなかった場合、当日投票できません。もし書かれていない場合は委員にお問い合わせください。
      </p>
      <p>リハーサル当日までに必ず自分の生徒番号があり、パートが正しいか確認してください。</p>
      <div className={styles.verifyContainer}>
        <Selectors
          grades={GRADES}
          classes={CLASS_LETTERS}
          initialGrade={className ? String(grade) : ""}
          initialClass={className ? className.slice(1) : ""}
        />
      </div>
      {className && (
        <section className={styles.results} aria-labelledby="results-title">
          <h2 id="results-title">
            {grade}年{className.slice(1)}組
          </h2>
          {loadError ? (
            <p role="alert">
              生徒情報を取得できませんでした。もう一度お試しください。
            </p>
          ) : roster.length === 0 ? (
            <p>生徒情報が登録されていません。</p>
          ) : (
            <div className={styles.parts}>
              {parts.map((part) => {
                const students = roster.filter(
                  (student) => student.part === part.value,
                );
                return (
                  <section className={styles.part} key={part.value}>
                    <h3>{part.label}</h3>
                    {students.length ? (
                      <ul>
                        {students.map((student) => (
                          <li key={student.id}>
                            {formatStudentId(student.id)}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>登録なし</p>
                    )}
                  </section>
                );
              })}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
