import Link from "next/link";
import styles from "@/app/login/page.module.css";

export default function Unauthorized() {
  return (
    <main className={styles.page}>
      <section className={styles.panel}>
        <h1>ログインが必要です</h1>
        <p className={styles.loginButtonContainer}>
          <Link href="/login" className={styles.unauthorizedLink}>
            ログイン
          </Link>
        </p>
      </section>
    </main>
  );
}
