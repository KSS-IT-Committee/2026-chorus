import styles from "./page.module.css";
import navigationStyles from "../students/page.module.css";
import { AuthGuard } from "@/components/Authguard";
import Link from "next/link";

export const instant = false;

const pageList = [
  { href: "students", title: "生徒ごとの投票" },
  { href: "result", title: "投票結果" },
];

export default function VotesPage() {
  return (
    <main className={styles.main}>
      <AuthGuard minimumPermission="member">
        <VotesContent />
      </AuthGuard>
    </main>
  );
}

async function VotesContent() {
  return (
    <>
      <Link href="/dashboard" className={navigationStyles.back}>
        ← 合唱委員ページ
      </Link>
      <h1 className={styles.title}>投票結果</h1>
      <nav className={styles.pageList} aria-label="ページ一覧">
        {pageList.map((page) => (
          <div key={page.href} className={styles.pageListItem}>
            <Link
              href={"/dashboard/votes/" + page.href}
              className={styles.pageLink}
            >
              {page.title}
            </Link>
          </div>
        ))}
      </nav>
    </>
  );
}
