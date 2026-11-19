import Link from "next/link";
import styles from "@/app/login/page.module.css";

export default function Forbidden() {
  return (
    <main className={styles.page}>
      <section className={styles.panel}>
        <h1>アクセス権限がありません</h1>
        <p className={styles.loginButtonContainer}>
          <Link href="/dashboard" className={styles.unauthorizedLink}>
            委員ページに戻る
          </Link>
        </p>
      </section>
    </main>
  );
}
