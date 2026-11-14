import Link from "next/link";
import styles from "@/app/login/page.module.css";

export default function NotFound() {
  return (
    <main className={styles.page}>
      <section className={styles.panel}>
        <h1>ページが見つかりません</h1>
        <p className={styles.loginButtonContainer}>
          <Link href="/" className={styles.unauthorizedLink}>
            トップページに戻る
          </Link>
        </p>
      </section>
    </main>
  );
}
