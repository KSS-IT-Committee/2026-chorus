import { getCurrentUser } from "@/lib/session";
import Link from "next/link";
import { logoutAction } from "@/app/login/actions";
import { AuthGuard } from "@/components/Authguard";
import loginStyles from "@/app/login/page.module.css";
import styles from "./page.module.css";

export const instant = false;

const pageList = [
  { href: "/songs", title: "曲目登録" },
  { href: "/students", title: "生徒名簿登録" },
  { href: "/votes", title: "投票結果確認" },
  { href: "/audit", title: "操作履歴" },
  { href: "/members", title: "委員アカウント管理" },
  { href: "/change-password", title: "パスワード変更" },
];

export default function DashboardPage() {
  return (
    <main className={styles.main}>
      <AuthGuard>
        <DashboardContent />
      </AuthGuard>
    </main>
  );
}

async function DashboardContent() {
  const user = await getCurrentUser();
  if (!user) return null;
  return (
    <>
      <h1 className={styles.title}>合唱委員ページ</h1>
      <p>ログイン中：{user.username}</p>

      <nav className={styles.pageList} aria-label="ページ一覧">
        {pageList.map((page) => (
          <div key={page.href} className={styles.pageListItem}>
            <Link href={page.href} className={styles.pageLink}>
              {page.title}
            </Link>
          </div>
        ))}
      </nav>
      <br />
      <br />
      <br />
      <form className={loginStyles.form} action={logoutAction}>
        <button className={loginStyles.logoutButton}>ログアウト</button>
      </form>
    </>
  );
}
